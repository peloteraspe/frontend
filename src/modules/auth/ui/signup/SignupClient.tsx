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
import { fetchCurrentOnboardingState } from '@modules/auth/lib/onboarding.client';
import { authCallbackUrl, sanitizeNextPath } from '@modules/auth/lib/redirect';
import { fetchLevelsOptions, fetchPositionsOptions } from '@modules/users/api/lookups.client';
import { normalizePhoneMetadata } from '@shared/lib/phone';
import {
  checkUsernameAvailabilityAction,
  completeOnboardingProfileAction,
} from '@modules/users/actions/createProfile.actions';
import GoogleButton from '@modules/auth/ui/login/google-button';

function getSafeAuthErrorMessage(rawMessage: string) {
  const msg = rawMessage.toLowerCase();
  if (
    msg.includes('pwned') ||
    msg.includes('breach') ||
    msg.includes('compromised') ||
    msg.includes('vulnerable')
  ) {
    return 'Elige una contraseña más segura para continuar.';
  }
  return '';
}

function isGenderIdentityConfirmed(value: unknown) {
  return value === true || value === 'true';
}

function appendNextPath(path: string, nextPath: string | null) {
  if (!nextPath) return path;
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}next=${encodeURIComponent(nextPath)}`;
}

export default function SignupClient() {
  const LOGIN_ONBOARDING_KEY = 'login-onboarding-state';
  const sp = useSearchParams();
  const requestedNextPath = useMemo(() => sanitizeNextPath(sp.get('next')), [sp]);
  const prefilledEmail = (sp.get('email') || '').trim();
  const requestedStep = Number(sp.get('step') || '1');

  const supabase = useMemo(() => getBrowserSupabase(), []);
  const { refreshProfile } = useAuth();

  const initialStep: Step = requestedStep === 3 ? 3 : requestedStep === 2 ? 2 : 1;
  const [step, setStep] = useState<Step>(initialStep);
  const [loading, setLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [signupEmail, setSignupEmail] = useState(prefilledEmail);
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isIdentityConfirmed, setIsIdentityConfirmed] = useState(false);
  const [isGoogleOnboarding, setIsGoogleOnboarding] = useState(false);
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [identityError, setIdentityError] = useState<string | undefined>(undefined);
  const [isIdentityModalOpen, setIsIdentityModalOpen] = useState(false);
  const [requiresEmailVerification, setRequiresEmailVerification] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const verificationCheckInFlight = useRef(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
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
    isValidEmail &&
    !emailError &&
    !isCheckingEmail &&
    isIdentityConfirmed &&
    (password?.length ?? 0) >= 6;

  const [positions, setPositions] = useState<OptionSelect[]>([]);
  const [levels, setLevels] = useState<OptionSelect[]>([]);
  const [selectedPositions, setSelectedPositions] = useState<(string | number)[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<string | number | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  const signupRedirectTo = useMemo(() => {
    return authCallbackUrl({
      email: signupEmail.trim() || undefined,
      nextPath: requestedNextPath,
    });
  }, [requestedNextPath, signupEmail]);

  const fetchOnboardingStateByEmail = async (email: string) => {
    try {
      const response = await fetch('/api/onboarding/by-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) return null;

      return (await response.json()) as {
        emailConfirmed?: boolean;
      };
    } catch {
      return null;
    }
  };

  const checkEmailAvailability = async (email: string) => {
    try {
      const response = await fetch('/api/onboarding/by-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.status === 404) {
        return { available: true as const, reason: 'ok' as const };
      }

      if (response.ok) {
        return { available: false as const, reason: 'already_registered' as const };
      }

      if (response.status === 503) {
        const body = (await response.json().catch(() => ({}))) as { code?: string };
        if (body.code === 'ADMIN_LOOKUP_UNAVAILABLE' || body.code === 'ADMIN_LOOKUP_TIMEOUT') {
          return { available: true as const, reason: 'lookup_unavailable' as const };
        }
      }

      return { available: false as const, reason: 'error' as const };
    } catch {
      return { available: false as const, reason: 'error' as const };
    }
  };

  const validateEmailAvailability = async (rawEmail: string) => {
    const normalizedEmail = rawEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      setEmailError(undefined);
      return { available: true as const };
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      const message = 'Ingresa un correo valido.';
      setEmailError(message);
      return { available: false as const, message };
    }

    setIsCheckingEmail(true);
    const result = await checkEmailAvailability(normalizedEmail);
    setIsCheckingEmail(false);

    if (result.available) {
      setEmailError(undefined);
      return { available: true as const };
    }

    const message =
      result.reason === 'already_registered'
        ? 'Este correo ya está registrado. Inicia sesión o recupera tu contraseña.'
        : 'No se pudo validar el correo ahora. Intenta de nuevo.';

    setEmailError(message);
    setValue('username', '');
    setValue('password', '');
    return { available: false as const, message };
  };

  const readLoginOnboardingState = () => {
    if (typeof window === 'undefined') return null;

    const raw = window.localStorage.getItem(LOGIN_ONBOARDING_KEY);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as {
        email?: string;
        userId?: string;
        username?: string;
        completedStep?: number;
        identityConfirmed?: boolean;
      };
    } catch {
      return null;
    }
  };

  const saveLoginOnboardingState = (payload: {
    email: string;
    userId: string;
    username: string;
    completedStep: 1 | 2;
    identityConfirmed?: boolean;
  }) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      LOGIN_ONBOARDING_KEY,
      JSON.stringify({
        email: payload.email.trim().toLowerCase(),
        userId: payload.userId,
        username: payload.username.trim(),
        completedStep: payload.completedStep,
        identityConfirmed: Boolean(payload.identityConfirmed),
      })
    );
  };

  const clearLoginOnboardingState = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(LOGIN_ONBOARDING_KEY);
  };

  useEffect(() => {
    if (isIdentityModalOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isIdentityModalOpen]);

  useEffect(() => {
    let cancelled = false;

    const hydrateExistingUser = async () => {
      try {
        const { user, profile, nextStep, destination } =
          await fetchCurrentOnboardingState(supabase);

        if (!user) {
          setIsGoogleOnboarding(false);
          setHasActiveSession(false);
          const localState = readLoginOnboardingState();
          const normalizedEmail = prefilledEmail.trim().toLowerCase();

          if (localState?.email === normalizedEmail) {
            if (localState.userId) setUserId(localState.userId);
            if (localState.username) setValue('username', localState.username);
            if (localState.identityConfirmed) setIsIdentityConfirmed(true);
            if (prefilledEmail) setSignupEmail(prefilledEmail);
          }

          if (initialStep === 3) {
            setStep(3);
            return;
          }

          if (localState?.email === normalizedEmail && (localState.completedStep ?? 0) >= 1) {
            setStep(2);
            return;
          }

          setStep(initialStep);
          return;
        }

        if (cancelled) return;

        const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
        const appMetadata = (user.app_metadata ?? {}) as Record<string, unknown>;
        const authProvider =
          typeof appMetadata.provider === 'string'
            ? appMetadata.provider
            : Array.isArray(appMetadata.providers) &&
                appMetadata.providers.some((provider) => provider === 'google')
              ? 'google'
              : '';
        const initialUsername =
          (typeof profile?.username === 'string' && profile.username.trim()) ||
          (typeof metadata.username === 'string' && metadata.username.trim()) ||
          (typeof metadata.full_name === 'string' && metadata.full_name.trim()) ||
          (user.email ? user.email.split('@')[0] : '');

        setSignupEmail(user.email ?? prefilledEmail);
        setUserId(user.id);
        setIsGoogleOnboarding(authProvider === 'google');
        setHasActiveSession(true);
        setRequiresEmailVerification(!user.email_confirmed_at);
        setValue('username', initialUsername);
        setIsIdentityConfirmed(isGenderIdentityConfirmed(metadata.gender_identity_confirmed));

        if (nextStep === null) {
          window.location.href = requestedNextPath || destination;
          return;
        }

        setStep(nextStep);
      } catch (error) {
        log.warn('Could not hydrate existing onboarding state', 'signup', error);
      }
    };

    void hydrateExistingUser();

    return () => {
      cancelled = true;
    };
  }, [initialStep, prefilledEmail, requestedNextPath, setValue, supabase]);

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
    if (!isIdentityConfirmed) {
      const message =
        'Debes confirmar que te identificas como mujer o persona de la diversidad de género.';
      setIdentityError(message);
      toast.error(message);
      return;
    }
    if (!canSubmitStep1) return;
    setLoading(true);

    try {
      const normalizedEmail = signupEmail.trim().toLowerCase();

      const emailCheck = await validateEmailAvailability(normalizedEmail);
      if (!emailCheck.available) {
        toast.error(emailCheck.message);
        return;
      }

      const { data: sign, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: data.password,
        options: {
          emailRedirectTo: signupRedirectTo,
          data: {
            gender_identity_confirmed: true,
          },
        },
      });

      if (error) {
        const lowerMessage = String(error.message || '').toLowerCase();
        if (
          lowerMessage.includes('already registered') ||
          lowerMessage.includes('user already registered') ||
          lowerMessage.includes('already been registered')
        ) {
          const message = 'Este correo ya está registrado. Inicia sesión o recupera tu contraseña.';
          setEmailError(message);
          setValue('password', '');
          toast.error(message);
          return;
        }
        const safeMessage = getSafeAuthErrorMessage(String(error.message || ''));
        toast.error(safeMessage || 'No se pudo crear la cuenta. Revisa tus datos e intenta de nuevo.');
        return;
      }

      let currentUser = sign.user ?? null;
      const hasSession = Boolean(sign.session);

      if (hasSession && currentUser) {
        setValue('username', '');
        saveLoginOnboardingState({
          email: signupEmail,
          userId: currentUser.id,
          username: '',
          completedStep: 1,
          identityConfirmed: true,
        });
        setUserId(currentUser.id);
        setRequiresEmailVerification(!currentUser.email_confirmed_at);
        setStep(2);
        toast.success('Cuenta creada. Continúa para completar tu perfil.');
        return;
      }

      if (currentUser?.id) {
        setValue('username', '');
        saveLoginOnboardingState({
          email: signupEmail,
          userId: currentUser.id,
          username: '',
          completedStep: 1,
          identityConfirmed: true,
        });
        setUserId(currentUser.id);
        setRequiresEmailVerification(true);
        setStep(2);
        toast.success('Cuenta creada. Revisa tu correo para verificar tu cuenta.');
        return;
      }

      toast.error(
        'Cuenta creada, pero no pudimos continuar. Inicia sesion para completar tu perfil.'
      );
    } catch (e) {
      toast.error('Error creando la cuenta');
      log.error('Signup step 1 failed', 'signup', e);
    } finally {
      setLoading(false);
    }
  };

  const handleStep2 = async () => {
    if (!userId) return toast.error('No se encontró el usuario recién creado.');
    if (!isIdentityConfirmed) {
      const message =
        'Debes confirmar que te identificas como mujer o persona de la diversidad de género.';
      setIdentityError(message);
      toast.error(message);
      return;
    }
    if (!selectedLevel) return toast.error('Selecciona un nivel.');
    if (selectedPositions.length === 0) return toast.error('Selecciona al menos una posicion.');

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

      let usernameCheck:
        | { available: boolean; reason: 'ok' | 'invalid' | 'error'; message?: string }
        | null = null;
      try {
        usernameCheck = await checkUsernameAvailabilityAction(
          normalizedUsername,
          userId ?? undefined
        );
      } catch (usernameCheckError) {
        log.warn('Username precheck server action crashed, continuing with backend validation', 'signup', {
          userId,
          username: normalizedUsername,
          error: String((usernameCheckError as any)?.message || usernameCheckError || 'Unknown error'),
        });
        usernameCheck = { available: false, reason: 'error' };
      }

      if (!usernameCheck) {
        usernameCheck = { available: false, reason: 'error' };
      }

      if (!usernameCheck.available) {
        if (usernameCheck.reason === 'error') {
          log.warn('Username precheck failed, continuing with backend validation', 'signup', {
            userId,
            username: normalizedUsername,
          });
        } else {
          setError('username', {
            type: 'manual',
            message: 'Ese nombre de usuario acaba de ocuparse. Elige otro para continuar.',
          });
          setStep(1);
          toast.error('Ese nombre de usuario acaba de ocuparse. Elige otro para continuar.');
          return;
        }
      }
      clearErrors('username');

      const positionIds = selectedPositions.map(Number).filter((n) => Number.isFinite(n));

      const profilePayload = {
        user: userId,
        username: normalizedUsername,
        level_id: Number(selectedLevel),
        player_position: positionIds,
      };

      // We create the final profile here. If a draft exists and backend treats it as duplicate,
      // show a guided message instead of failing silently.
      const onboardingResult = await completeOnboardingProfileAction(profilePayload);
      if ('code' in onboardingResult) {
        if (onboardingResult.code === 'USERNAME_TAKEN') {
          setError('username', {
            type: 'manual',
            message: 'El nombre de usuario ya está en uso, elige otro.',
          });
          setStep(1);
          toast.error('Ese nombre de usuario ya está en uso, elige otro.');
          return;
        }

        if (onboardingResult.code === 'USER_NOT_READY') {
          toast.error(
            'No pudimos completar tu perfil ahora. Puedes terminarlo cuando inicies sesion.'
          );
          window.location.href = appendNextPath(
            '/login?message=Completa tu perfil al iniciar sesion',
            requestedNextPath
          );
          return;
        }

        toast.error(onboardingResult.message || 'No se pudo crear el perfil.');
        return;
      }

      const {
        data: { user: authenticatedUser },
      } = await supabase.auth.getUser();

      if (authenticatedUser && isIdentityConfirmed) {
        const { error: metadataError } = await supabase.auth.updateUser({
          data: {
            ...normalizePhoneMetadata(authenticatedUser.user_metadata),
            gender_identity_confirmed: true,
          },
        });

        if (metadataError) {
          log.warn('Could not persist gender identity confirmation', 'signup', metadataError);
        }
      }

      clearLoginOnboardingState();

      if (isGoogleOnboarding && authenticatedUser?.email_confirmed_at) {
        toast.success('Perfil completado. Bienvenida.');
        refreshProfile().catch(() => undefined);
        window.location.href = requestedNextPath || '/';
        return;
      }

      setRequiresEmailVerification(true);
      setStep(3);
      toast.success('Perfil guardado. Verifica tu correo para activar tu cuenta.');
      return;
    } catch (err: any) {
      const errorMessage = String(err?.message || err || '');
      if (errorMessage.includes('profile_user_fkey')) {
        toast.error(
          'No pudimos completar tu perfil ahora. Puedes terminarlo cuando inicies sesion.'
        );
        window.location.href = appendNextPath(
          '/login?message=Completa tu perfil al iniciar sesion',
          requestedNextPath
        );
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

  const tryCompleteEmailVerification = async (showPendingToast = true) => {
    if (verificationCheckInFlight.current) return false;
    verificationCheckInFlight.current = true;
    setCheckingVerification(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        await supabase.auth.refreshSession();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user?.email_confirmed_at) {
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem(LOGIN_ONBOARDING_KEY);
          }
          const { destination } = await fetchCurrentOnboardingState(supabase);
          toast.success('Cuenta verificada. Bienvenida.');
          refreshProfile().catch(() => undefined);
          window.location.href = requestedNextPath || destination;
          return true;
        }

        return false;
      }

      if (!signupEmail.trim() || !(password || '').trim()) {
        if (showPendingToast) {
          toast.error(
            'Abre el enlace del correo y vuelve a intentar cuando la verificacion termine.'
          );
        }
        return false;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: signupEmail.trim(),
        password: password || '',
      });
      if (error) {
        const message = (error.message || '').toLowerCase();
        if (message.includes('not confirmed') || message.includes('email_not_confirmed')) {
          return false;
        }
        const safeMessage = getSafeAuthErrorMessage(String(error.message || ''));
        toast.error(safeMessage || 'No se pudo validar tu verificacion.');
        return false;
      }

      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(LOGIN_ONBOARDING_KEY);
      }
      const { destination } = await fetchCurrentOnboardingState(supabase);
      toast.success('Cuenta verificada. Bienvenida.');
      refreshProfile().catch(() => undefined);
      window.location.href = requestedNextPath || destination;
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
        options: { emailRedirectTo: signupRedirectTo },
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
      void tryCompleteEmailVerification(false);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [step, requiresEmailVerification]);

  return (
    <div className="w-full max-w-[560px] mx-auto px-4 pt-4 pb-8 md:pt-6">
      <div className="text-center mb-4">
        <h1 className="mt-3 font-eastman-extrabold text-3xl md:text-4xl leading-tight text-slate-900">
          Crea tu cuenta
        </h1>
        <p className="mt-2 text-slate-600 text-sm">Completa tus datos y empieza a jugar.</p>
      </div>

      {step === 1 ? (
        <div className="w-full bg-white/90 backdrop-blur-sm border border-slate-200/90 rounded-3xl p-4 md:p-5 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)]">
          <div className="mb-4 grid grid-cols-2 rounded-2xl bg-slate-100 p-1 text-sm">
            {hasActiveSession ? (
              <span
                className="rounded-xl text-slate-400 text-center py-2 cursor-not-allowed"
                aria-disabled="true"
              >
                Iniciar sesion
              </span>
            ) : (
              <Link
                href={appendNextPath('/login', requestedNextPath)}
                className="rounded-xl text-slate-600 text-center py-2 hover:text-slate-900 transition-colors"
              >
                Iniciar sesion
              </Link>
            )}
            <span className="rounded-xl bg-white text-mulberry font-semibold text-center py-2 shadow-sm">
              Crear cuenta
            </span>
          </div>

          <p className="text-slate-600 text-sm mb-4">
            Completa tus datos por primera vez para que tengas una experiencia personalizada
          </p>

          <form
            onSubmit={handleSubmit(handleStep1)}
            className="flex flex-col gap-3"
            autoComplete="off"
            noValidate
          >
            <Input
              label="Correo electronico"
              type="email"
              required
              name="email"
              autoComplete="off"
              inputMode="email"
              placeholder="pelotera@gmail.com"
              value={signupEmail}
              onChange={(e) => {
                setSignupEmail(e.target.value);
                if (emailError) setEmailError(undefined);
              }}
              onBlur={() => {
                void validateEmailAvailability(signupEmail);
              }}
              className="h-11"
              errorText={emailError}
            />
            {isCheckingEmail && (
              <p className="text-xs text-slate-500 -mt-2">Verificando correo...</p>
            )}

            <Input
              label="Contraseña"
              type="password"
              required
              placeholder="••••••••"
              bgColor="bg-white"
              {...register('password', {
                required: 'Este campo es requerido',
                minLength: { value: 6, message: 'Mínimo 6 caracteres' },
              })}
              autoComplete="new-password"
              className="h-11"
              disabled={Boolean(emailError) || isCheckingEmail}
              errorText={errors.password?.message as string | undefined}
            />

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <label className="flex items-start gap-3">
                <input
                  type="radio"
                  name="gender_identity_confirmation"
                  checked={isIdentityConfirmed}
                  onChange={() => {
                    setIsIdentityConfirmed(true);
                    if (identityError) setIdentityError(undefined);
                  }}
                  className="mt-1 h-4 w-4 border-slate-300 text-mulberry focus:ring-mulberry"
                />
                <span className="text-sm leading-6 text-slate-700">
                  Confirmo que me identifico como mujer o persona de la diversidad de género.{' '}
                  <button
                    type="button"
                    onClick={() => setIsIdentityModalOpen(true)}
                    className="font-semibold text-mulberry hover:text-mulberry/80"
                  >
                    Más información
                  </button>
                </span>
              </label>
              {identityError && <p className="mt-2 text-sm text-red-500">{identityError}</p>}
            </div>

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
              nextPath={requestedNextPath}
            />
          </form>
        </div>
      ) : step === 2 ? (
        <div className="w-full bg-white/90 backdrop-blur-sm border border-slate-200/90 rounded-3xl p-4 md:p-5 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)]">
          <div className="mb-4 grid grid-cols-2 rounded-2xl bg-slate-100 p-1 text-sm">
            {hasActiveSession ? (
              <span
                className="rounded-xl text-slate-400 text-center py-2 cursor-not-allowed"
                aria-disabled="true"
              >
                Iniciar sesion
              </span>
            ) : (
              <Link
                href={appendNextPath('/login', requestedNextPath)}
                className="rounded-xl text-slate-600 text-center py-2 hover:text-slate-900 transition-colors"
              >
                Iniciar sesion
              </Link>
            )}
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
            <Input
              label="Nombre de usuaria"
              type="text"
              required
              placeholder="Ej: Pelotera123"
              bgColor="bg-white"
              {...register('username', {
                required: 'Este campo es requerido',
                minLength: { value: 3, message: 'Mínimo 3 caracteres' },
                maxLength: { value: 50, message: 'Máximo 50 caracteres' },
                onBlur: async (e) => {
                  const rawValue = String(e?.target?.value ?? '').trim();
                  if (rawValue.length < 3) return;
                  setIsCheckingUsername(true);
                  const result = await checkUsernameAvailabilityAction(rawValue, userId ?? undefined);
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

            {isGoogleOnboarding && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <label className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="gender_identity_confirmation_step_2"
                    checked={isIdentityConfirmed}
                    onChange={() => {
                      setIsIdentityConfirmed(true);
                      if (identityError) setIdentityError(undefined);
                    }}
                    className="mt-1 h-4 w-4 border-slate-300 text-mulberry focus:ring-mulberry"
                  />
                  <span className="text-sm leading-6 text-slate-700">
                    Confirmo que me identifico como mujer o persona de la diversidad de género.{' '}
                    <button
                      type="button"
                      onClick={() => setIsIdentityModalOpen(true)}
                      className="font-semibold text-mulberry hover:text-mulberry/80"
                    >
                      Más información
                    </button>
                  </span>
                </label>
                {identityError && <p className="mt-2 text-sm text-red-500">{identityError}</p>}
              </div>
            )}

            <button
              type="submit"
              className="h-10 w-full rounded-xl bg-mulberry text-white disabled:opacity-60"
              disabled={
                loading ||
                !isIdentityConfirmed ||
                (username?.trim().length ?? 0) < 3 ||
                !selectedLevel ||
                selectedPositions.length === 0
              }
            >
              {loading ? 'Guardando...' : 'Continuar'}
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
            redirigiremos automaticamente para continuar.
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

            {hasActiveSession ? (
              <span
                className="text-sm text-center text-slate-400 font-semibold cursor-not-allowed"
                aria-disabled="true"
              >
                Volver a iniciar sesion
              </span>
            ) : (
              <Link
                href={appendNextPath('/login', requestedNextPath)}
                className="text-sm text-center text-mulberry font-semibold hover:text-mulberry/80"
              >
                Volver a iniciar sesion
              </Link>
            )}
          </div>
        </div>
      )}

      {isIdentityModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]"
            onClick={() => setIsIdentityModalOpen(false)}
          />
          <div className="relative z-[81] w-full max-w-lg rounded-[28px] bg-white p-6 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.45)]">
            <div className="flex items-start justify-end">
              <button
                type="button"
                onClick={() => setIsIdentityModalOpen(false)}
                className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-500 hover:text-slate-900"
              >
                X
              </button>
            </div>

            <p className="mt-4 text-sm leading-7 text-slate-700">
              Peloteras es una comunidad creada para mujeres y personas de la diversidad de género.
              Buscamos ofrecer un espacio seguro, deportivo y de confianza.
            </p>

            <button
              type="button"
              onClick={() => setIsIdentityModalOpen(false)}
              className="mt-6 h-11 w-full rounded-xl bg-mulberry text-white"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
