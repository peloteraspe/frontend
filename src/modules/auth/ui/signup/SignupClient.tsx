'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

import { getBrowserSupabase } from '@core/api/supabase.browser';
import { log } from '@core/lib/logger';
import { useAuth } from '@core/auth/AuthProvider';

import { Title2XL, ParagraphM } from '@core/ui/Typography';
import Input from '@core/ui/Input';
import SelectComponent, { OptionSelect } from '@core/ui/SelectComponent';

import type { Step, SignupStep1Values } from './signup.types';
import { fetchLevelsOptions, fetchPositionsOptions } from '@modules/users/api/lookups.client';
import { createProfileAction } from '@modules/users/actions/createProfile.actions';

export default function SignupClient() {
  const sp = useSearchParams();
  const prefilledEmail = (sp.get('email') || '').trim();

  const supabase = getBrowserSupabase();
  const { refreshProfile } = useAuth();

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupStep1Values>({
    defaultValues: { username: '', password: '' },
  });

  const username = watch('username');
  const password = watch('password');

  const isValidEmail = useMemo(
    () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(prefilledEmail),
    [prefilledEmail]
  );

  const canSubmitStep1 =
    isValidEmail && (username?.trim().length ?? 0) >= 3 && (password?.length ?? 0) >= 6;

  const [positions, setPositions] = useState<OptionSelect[]>([]);
  const [levels, setLevels] = useState<OptionSelect[]>([]);
  const [selectedPositions, setSelectedPositions] = useState<(string | number)[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<string | number | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

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

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const handleStep1 = async (data: SignupStep1Values) => {
    if (!canSubmitStep1) return;
    setLoading(true);

    try {
      const { data: sign, error } = await supabase.auth.signUp({
        email: prefilledEmail,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: { username: data.username },
        },
      });

      if (error) {
        toast.error(error.message || 'No se pudo crear la cuenta');
        return;
      }

      const uid = sign.user?.id ?? null;
      setUserId(uid);
      setStep(2);
    } catch (e) {
      toast.error('Error creando la cuenta');
      log.error('Signup step 1 failed', 'signup', e);
    } finally {
      setLoading(false);
    }
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return toast.error('No se encontró el usuario recién creado.');
    if (!selectedLevel) return toast.error('Selecciona un nivel.');

    setLoading(true);
    try {
      await createProfileAction({
        user: userId,
        username,
        level_id: Number(selectedLevel),
        player_position: selectedPositions.map(Number).filter((n) => Number.isFinite(n)),
      });

      setIsSuccess(true);
      toast.success('¡Cuenta creada exitosamente! 🎉');

      // refresh profile (best effort)
      refreshProfile().catch(() => undefined);

      // redirect countdown
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            window.location.href = '/login?signup=success';
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      if (String(err).includes('profile_username_key')) {
        toast.error('El nombre de usuario ya está en uso, elige otro.');
      } else {
        toast.error('No se pudo crear el perfil.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center w-full gap-8 min-h-[calc(100vh-6rem)] px-4">
      <div className="text-center">
        <Title2XL>Bienvenida a</Title2XL>
        <Title2XL color="text-mulberry">Peloteras</Title2XL>
      </div>

      {isSuccess ? (
        <div className="w-full max-w-[420px] text-center">
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-xl font-semibold text-green-800 mb-2">
              ¡Cuenta creada exitosamente!
            </h3>
            <p className="text-green-700 mb-4">Tu perfil ha sido configurado correctamente.</p>
            <div className="bg-green-100 rounded-lg p-4">
              <p className="text-green-800 font-medium">
                Redirigiendo al login en {countdown} segundos...
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (countdownRef.current) clearInterval(countdownRef.current);
              window.location.href = '/login?signup=success';
            }}
            className="w-full h-11 rounded-xl bg-mulberry text-white hover:bg-mulberry/90"
          >
            Ir al login ahora
          </button>
        </div>
      ) : step === 1 ? (
        <div className="w-full max-w-[420px]">
          <p className="text-center text-slate-700 mb-6">
            Completa tus datos por primera vez para que tengas una experiencia personalizada
          </p>

          <form onSubmit={handleSubmit(handleStep1)} className="flex flex-col gap-4" noValidate>
            <div>
              <label className="text-sm font-semibold">Correo</label>
              <input
                value={prefilledEmail}
                readOnly
                className="mt-1 h-11 w-full rounded-xl border px-4 text-[15px] bg-slate-50 border-slate-300"
              />
            </div>

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
              })}
              errorText={errors.username?.message as string | undefined}
            />

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
              errorText={errors.password?.message as string | undefined}
            />

            <button
              type="submit"
              className="h-11 w-full rounded-xl bg-mulberry text-white disabled:opacity-60"
              disabled={loading || !canSubmitStep1}
            >
              {loading ? 'Creando...' : 'Continuar'}
            </button>
          </form>
        </div>
      ) : (
        <div className="w-full max-w-[420px]">
          <p className="text-center text-slate-700 mb-6">
            Completa tus datos por primera vez para que tengas una experiencia personalizada
          </p>

          <form onSubmit={handleStep2} className="flex flex-col gap-4" noValidate>
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
              className="h-11 w-full rounded-xl bg-mulberry text-white disabled:opacity-60"
              disabled={loading}
            >
              {loading ? 'Guardando...' : 'Crear cuenta'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
