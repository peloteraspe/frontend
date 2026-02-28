'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

import { getBrowserSupabase } from '@core/api/supabase.browser';
import { log } from '@core/lib/logger';
import { useAuth } from '@core/auth/AuthProvider';

import { ParagraphM } from '@core/ui/Typography';
import Input from '@core/ui/Input';
import SelectComponent, { OptionSelect } from '@core/ui/SelectComponent';

import type { Step, SignupStep1Values } from './signup.types';
import { fetchLevelsOptions, fetchPositionsOptions } from '@modules/users/api/lookups.client';
import {
  checkUsernameAvailabilityAction,
  createProfileAction,
} from '@modules/users/actions/createProfile.actions';
import GoogleButton from '@modules/auth/ui/login/google-button';

export default function SignupClient() {
  const sp = useSearchParams();
  const prefilledEmail = (sp.get('email') || '').trim();

  const supabase = getBrowserSupabase();
  const { refreshProfile } = useAuth();

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [signupEmail, setSignupEmail] = useState(prefilledEmail);
  const [requiresEmailVerification, setRequiresEmailVerification] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const verificationCheckInFlight = useRef(false);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<SignupStep1Values>({
    defaultValues: { username: '', password: '' },
  });

  const username = watch('username');
  const password = watch('password');

  const isValidEmail = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupEmail), [signupEmail]);

  const canSubmitStep1 =
    isValidEmail && (username?.trim().length ?? 0) >= 3 && (password?.length ?? 0) >= 6;

  const [positions, setPositions] = useState<OptionSelect[]>([]);
  const [levels, setLevels] = useState<OptionSelect[]>([]);
  const [selectedPositions, setSelectedPositions] = useState<(string | number)[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<string | number | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  const ensureDraftProfile = async (newUserId: string, normalizedUsername: string) => {
    try {
      await createProfileAction({
        user: newUserId,
        username: normalizedUsername,
        level_id: null,
        player_position: [],
      });
    } catch (err: any) {
      const errorMessage = String(err?.message || err || '').toLowerCase();
      // If a draft already exists (retry / duplicate click), continue.
      if (errorMessage.includes('duplicate') || errorMessage.includes('already exists')) return;
      // Non-blocking: user can still complete profile in step 2.
      log.warn('Could not create profile draft on signup step 1', 'signup', err);
    }
  };

  // load options
  useEffect(() => {
    const load = async () => {
      try {
        log.info('Loading positions and levels for signup', 'signup');
        const [pos, lev] = await Promise.all([fetchPositionsOptions(), fetchLevelsOptions()]);
        setPositions(pos);
        setLevels(lev);
      } catch (e) {
        log.warn('Using fallback signup options', 'signup', e);
        setPositions([
          { key: 1, value: 1, label: 'Portera' },
          { key: 2, value: 2, label: 'Defensa' },
          { key: 3, value: 3, label: 'Mediocampo' },
          { key: 4, value: 4, label: 'Delantera' },
        ]);
        setLevels([
          { key: 1, value: 1, label: 'Principiante' },
          { key: 2, value: 2, label: 'Intermedio' },
          { key: 3, value: 3, label: 'Avanzado' },
        ]);
      }
    };

    load();

    return () => {};
  }, []);

  const handleStep1 = async (data: SignupStep1Values) => {
    if (!canSubmitStep1) return;
    setLoading(true);

    try {
      const normalizedUsername = data.username.trim();
      const usernameCheck = await checkUsernameAvailabilityAction(normalizedUsername);
      if (!usernameCheck.available) {
        const message =
          usernameCheck.reason === 'error'
            ? 'No se pudo verificar el nombre de usuario. Intenta de nuevo.'
            : 'El nombre de usuario ya está en uso, elige otro.';
        setError('username', { type: 'manual', message });
        toast.error(message);
        return;
      }
      clearErrors('username');

      const { data: sign, error } = await supabase.auth.signUp({
        email: signupEmail.trim(),
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: { username: normalizedUsername, events_verified: false },
        },
      });

      if (error) {
        toast.error(error.message || 'No se pudo crear la cuenta');
        return;
      }

      let currentUser = sign.user ?? null;
      let hasSession = Boolean(sign.session);

      if (!hasSession) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: signupEmail.trim(),
          password: data.password,
        });
        if (!signInError && signInData.user) {
          currentUser = signInData.user;
          hasSession = true;
        }
      }

      if (hasSession && currentUser) {
        await ensureDraftProfile(currentUser.id, normalizedUsername);
        setUserId(currentUser.id);
        setRequiresEmailVerification(!currentUser.email_confirmed_at);
        setStep(2);
        toast.success('Cuenta creada. Continúa para completar tu perfil.');
        return;
      }

      if (currentUser?.id) {
        await ensureDraftProfile(currentUser.id, normalizedUsername);
        setUserId(currentUser.id);
        setRequiresEmailVerification(true);
        setStep(2);
        toast.success('Cuenta creada. Revisa tu correo para verificar tu cuenta.');
        return;
      }

      toast.error('Cuenta creada, pero no pudimos continuar. Inicia sesion para completar tu perfil.');
    } catch (e) {
      toast.error('Error creando la cuenta');
      log.error('Signup step 1 failed', 'signup', e);
    } finally {
      setLoading(false);
    }
  };

  const handleStep2 = async () => {
    if (!userId) return toast.error('No se encontró el usuario recién creado.');
    if (!selectedLevel) return toast.error('Selecciona un nivel.');

    setLoading(true);
    try {
      const normalizedUsername = (username || '').trim();
      if (normalizedUsername.length < 3) {
        setStep(1);
        setError('username', {
          type: 'manual',
          message: 'El nombre de usuario es requerido para continuar.',
        });
        toast.error('Completa tu nombre de usuaria para continuar.');
        return;
      }

      const usernameCheck = await checkUsernameAvailabilityAction(normalizedUsername);
      if (!usernameCheck.available) {
        if (usernameCheck.reason === 'error') {
          toast.error('No se pudo verificar el nombre de usuario. Intenta de nuevo.');
          return;
        }
        setError('username', {
          type: 'manual',
          message: 'Ese nombre de usuario acaba de ocuparse. Elige otro para continuar.',
        });
        setStep(1);
        toast.error('Ese nombre de usuario acaba de ocuparse. Elige otro para continuar.');
        return;
      }
      clearErrors('username');

      const profilePayload = {
        user: userId,
        username: normalizedUsername,
        level_id: Number(selectedLevel),
        player_position: selectedPositions.map(Number).filter((n) => Number.isFinite(n)),
      };

      // We create the final profile here. If a draft exists and backend treats it as duplicate,
      // show a guided message instead of failing silently.
      await createProfileAction(profilePayload);

      if (requiresEmailVerification) {
        setStep(3);
        toast.success('Perfil guardado. Verifica tu correo para activar tu cuenta.');
        return;
      }

      toast.success('Cuenta creada. Bienvenida.');
      refreshProfile().catch(() => undefined);
      window.location.href = '/';
    } catch (err: any) {
      const errorMessage = String(err?.message || err || '');
      if (errorMessage.includes('profile_user_fkey')) {
        toast.error('No pudimos completar tu perfil ahora. Puedes terminarlo cuando inicies sesion.');
        window.location.href = '/login?message=Completa tu perfil al iniciar sesion';
        return;
      }
      if (String(err).includes('profile_username_key')) {
        setError('username', {
          type: 'manual',
          message: 'El nombre de usuario ya está en uso, elige otro.',
        });
        setStep(1);
        toast.error('Ese nombre de usuario ya está en uso, elige otro.');
      } else {
        toast.error('No se pudo crear el perfil.');
      }
    } finally {
      setLoading(false);
    }
  };

  const emailError =
    signupEmail.length > 0 && !isValidEmail ? 'Ingresa un correo valido.' : undefined;

  const tryCompleteEmailVerification = async () => {
    if (verificationCheckInFlight.current) return false;
    verificationCheckInFlight.current = true;
    setCheckingVerification(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: signupEmail.trim(),
        password: password || '',
      });
      if (error) {
        const message = (error.message || '').toLowerCase();
        if (message.includes('not confirmed') || message.includes('email_not_confirmed')) {
          return false;
        }
        toast.error(error.message || 'No se pudo validar tu verificacion.');
        return false;
      }

      toast.success('Cuenta verificada. Bienvenida.');
      refreshProfile().catch(() => undefined);
      window.location.href = '/';
      return true;
    } catch {
      toast.error('No se pudo validar tu verificacion.');
      return false;
    } finally {
      verificationCheckInFlight.current = false;
      setCheckingVerification(false);
    }
  };

  const handleResendVerification = async () => {
    setResendingVerification(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: signupEmail.trim(),
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        toast.error(error.message || 'No se pudo reenviar el correo de verificacion.');
        return;
      }
      toast.success('Correo de verificacion reenviado.');
    } finally {
      setResendingVerification(false);
    }
  };

  useEffect(() => {
    if (step !== 3 || !requiresEmailVerification) return;

    const interval = window.setInterval(() => {
      void tryCompleteEmailVerification();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [step, requiresEmailVerification]);

  return (
    <div className="w-full max-w-[560px] mx-auto px-4 pt-4 pb-8 md:pt-6">
      <div className="text-center mb-4">
        <h1 className="mt-3 font-eastman-extrabold text-3xl md:text-4xl leading-tight text-slate-900">
          Crea tu cuenta
        </h1>
        <p className="mt-2 text-slate-600 text-sm">
          Completa tus datos y empieza a jugar.
        </p>
      </div>

      {step === 1 ? (
        <div className="w-full bg-white/90 backdrop-blur-sm border border-slate-200/90 rounded-3xl p-4 md:p-5 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)]">
          <div className="mb-4 grid grid-cols-2 rounded-2xl bg-slate-100 p-1 text-sm">
            <Link
              href="/login"
              className="rounded-xl text-slate-600 text-center py-2 hover:text-slate-900 transition-colors"
            >
              Iniciar sesion
            </Link>
            <span className="rounded-xl bg-white text-mulberry font-semibold text-center py-2 shadow-sm">
              Crear cuenta
            </span>
          </div>

          <p className="text-slate-600 text-sm mb-4">
            Completa tus datos por primera vez para que tengas una experiencia personalizada
          </p>

          <form onSubmit={handleSubmit(handleStep1)} className="flex flex-col gap-3" noValidate>
            <Input
              label="Correo electronico"
              type="email"
              required
              name="email"
              autoComplete="email"
              inputMode="email"
              placeholder="pelotera@gmail.com"
              value={signupEmail}
              onChange={(e) => setSignupEmail(e.target.value)}
              className="h-11"
              errorText={emailError}
            />

            <Input
              label="Crea un nombre"
              type="text"
              required
              placeholder="Ej: Pelotera123"
              bgColor="bg-white ring-secondary focus:ring-secondary-dark border-mulberry"
              {...register('username', {
                required: 'Este campo es requerido',
                minLength: { value: 3, message: 'Mínimo 3 caracteres' },
                maxLength: { value: 50, message: 'Máximo 50 caracteres' },
                onBlur: async (e) => {
                  const rawValue = String(e?.target?.value ?? '').trim();
                  if (rawValue.length < 3) return;
                  setIsCheckingUsername(true);
                  const result = await checkUsernameAvailabilityAction(rawValue);
                  setIsCheckingUsername(false);
                  if (!result.available) {
                    setError('username', {
                      type: 'manual',
                      message:
                        result.reason === 'error'
                          ? 'No se pudo validar el nombre ahora.'
                          : 'El nombre de usuario ya está en uso.',
                    });
                    return;
                  }
                  clearErrors('username');
                },
              })}
              autoComplete="nickname"
              className="h-11"
              errorText={errors.username?.message as string | undefined}
            />
            {isCheckingUsername && (
              <p className="text-xs text-slate-500 -mt-2">Verificando disponibilidad...</p>
            )}

            <Input
              label="Contraseña"
              type="password"
              required
              placeholder="••••••••"
              bgColor="bg-white ring-secondary focus:ring-secondary-dark border-mulberry"
              {...register('password', {
                required: 'Este campo es requerido',
                minLength: { value: 6, message: 'Mínimo 6 caracteres' },
              })}
              autoComplete="new-password"
              className="h-11"
              errorText={errors.password?.message as string | undefined}
            />

            <button
              type="submit"
              className="h-10 w-full rounded-xl bg-mulberry text-white disabled:opacity-60"
              disabled={loading || isGoogleLoading || !canSubmitStep1}
            >
              {loading ? 'Creando...' : 'Continuar'}
            </button>

            <div className="relative mt-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-wide">
                <span className="bg-white px-3 text-gray-500">o continua con</span>
              </div>
            </div>

            <GoogleButton
              disabled={loading || isGoogleLoading}
              isLoading={isGoogleLoading}
              onLoadingChange={setIsGoogleLoading}
            />
          </form>
        </div>
      ) : step === 2 ? (
        <div className="w-full bg-white/90 backdrop-blur-sm border border-slate-200/90 rounded-3xl p-4 md:p-5 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)]">
          <div className="mb-4 grid grid-cols-2 rounded-2xl bg-slate-100 p-1 text-sm">
            <Link
              href="/login"
              className="rounded-xl text-slate-600 text-center py-2 hover:text-slate-900 transition-colors"
            >
              Iniciar sesion
            </Link>
            <span className="rounded-xl bg-white text-mulberry font-semibold text-center py-2 shadow-sm">
              Crear cuenta
            </span>
          </div>

          <p className="text-slate-600 text-sm mb-4">
            Completa tus datos por primera vez para que tengas una experiencia personalizada
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleStep2();
            }}
            className="flex flex-col gap-3"
            noValidate
          >
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Nombre de usuaria</p>
              <p className="text-sm font-semibold text-slate-900">{username}</p>
            </div>

            <label className="w-full">
              <div className="mb-1">
                <ParagraphM fontWeight="semibold">
                  ¿En qué posición prefieres jugar? <span className="text-red-500">*</span>
                </ParagraphM>
              </div>
              <SelectComponent
                options={positions}
                isMulti
                name="player_position"
                value={selectedPositions}
                onChange={(values: string[] | number[]) => setSelectedPositions(values)}
              />
            </label>

            <label className="w-full">
              <div className="mb-1">
                <ParagraphM fontWeight="semibold">
                  ¿Cuál es tu nivel? <span className="text-red-500">*</span>
                </ParagraphM>
              </div>
              <SelectComponent
                options={levels}
                name="level_id"
                value={selectedLevel}
                onChange={(value: string | number | null) => setSelectedLevel(value)}
              />
            </label>

            <button
              type="submit"
              className="h-10 w-full rounded-xl bg-mulberry text-white disabled:opacity-60"
              disabled={loading}
            >
              {loading ? 'Guardando...' : 'Crear cuenta'}
            </button>
          </form>
        </div>
      ) : (
        <div className="w-full bg-white/90 backdrop-blur-sm border border-slate-200/90 rounded-3xl p-5 md:p-6 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)]">
          <h2 className="text-xl md:text-2xl font-eastman-extrabold text-slate-900">
            Revisa tu correo para verificar tu cuenta
          </h2>

          <p className="text-slate-700 mt-3 text-sm md:text-base">
            Te enviamos un enlace a <strong>{signupEmail}</strong>. Cuando verifiques, te
            redirigiremos automaticamente al inicio.
          </p>

          <div className="mt-5 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => {
                void tryCompleteEmailVerification();
              }}
              disabled={checkingVerification}
              className="h-10 w-full rounded-xl bg-mulberry text-white disabled:opacity-60"
            >
              {checkingVerification ? 'Verificando...' : 'Ya verifique mi correo'}
            </button>

            <button
              type="button"
              onClick={() => {
                void handleResendVerification();
              }}
              disabled={resendingVerification}
              className="h-10 w-full rounded-xl border border-slate-300 text-slate-700 disabled:opacity-60"
            >
              {resendingVerification ? 'Reenviando...' : 'Reenviar correo'}
            </button>

            <Link
              href="/login"
              className="text-sm text-center text-mulberry font-semibold hover:text-mulberry/80"
            >
              Volver a iniciar sesion
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
