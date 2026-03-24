'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';

import Input from '@core/ui/Input';
import { log } from '@core/lib/logger';
import { useAuth } from '@core/auth/AuthProvider';
import { fetchCurrentOnboardingState } from '@modules/auth/lib/onboarding.client';
import { sanitizeNextPath } from '@modules/auth/lib/redirect';
import GoogleButton from './google-button';

function getSafeAuthErrorMessage(rawMessage: string) {
  const msg = rawMessage.toLowerCase();
  if (
    msg.includes('pwned') ||
    msg.includes('breach') ||
    msg.includes('compromised') ||
    msg.includes('vulnerable')
  ) {
    return 'Tu contraseña no cumple con los requisitos de seguridad. Usa una más segura.';
  }
  return '';
}

type LoginValues = {
  email: string;
  password: string;
};

function appendNextPath(path: string, nextPath: string | null) {
  if (!nextPath) return path;
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}next=${encodeURIComponent(nextPath)}`;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => {
      const timer = window.setTimeout(() => {
        window.clearTimeout(timer);
        reject(new Error(errorMessage));
      }, timeoutMs);
    }),
  ]);
}

async function resolvePostLoginDestination(nextPath: string | null) {
  if (!nextPath) return '/';

  try {
    const response = await fetch('/api/auth/post-login-destination', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nextPath }),
    });

    const payload = (await response.json().catch(() => ({}))) as { destination?: string };
    if (response.ok && typeof payload.destination === 'string' && payload.destination.trim()) {
      return payload.destination;
    }
  } catch {
    // Fallback to local redirect when the guard endpoint is unavailable.
  }

  return nextPath;
}

export default function LoginForm() {
  const LOGIN_ONBOARDING_KEY = 'login-onboarding-state';
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedNextPath = useMemo(
    () => sanitizeNextPath(searchParams.get('next')),
    [searchParams]
  );
  const { user, loading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const didProcessFlashParams = useRef(false);
  const didAutoRedirectAuthenticated = useRef(false);

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<LoginValues>({
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    if (didProcessFlashParams.current) return;
    didProcessFlashParams.current = true;

    router.prefetch('/');

    const error = searchParams.get('error');
    const message = searchParams.get('message');
    const signup = searchParams.get('signup');

    if (error) toast.error('Error de autenticacion: ' + decodeURIComponent(error));
    if (message === 'session_closed') {
      toast.success('Sesion cerrada correctamente.');
    } else if (message === 'link_expired') {
      toast.error('El enlace de correo expiro. Solicita uno nuevo.');
    } else if (message) {
      toast(message);
    }
    if (signup === 'success') toast.success('Cuenta creada. Ahora inicia sesion.');

    if (error || message || signup) {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('error');
      newUrl.searchParams.delete('message');
      newUrl.searchParams.delete('signup');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [router, searchParams]);

  useEffect(() => {
    if (didAutoRedirectAuthenticated.current) return;
    if (authLoading || !user) return;
    didAutoRedirectAuthenticated.current = true;

    const redirectAuthenticatedUser = async () => {
      try {
        const { getBrowserSupabase } = await import('@core/api/supabase.browser');
        const supabase = getBrowserSupabase();
        const state = await withTimeout(
          fetchCurrentOnboardingState(supabase),
          6_000,
          'authenticated redirect timeout'
        );
        const finalDestination =
          state.nextStep === null
            ? await resolvePostLoginDestination(requestedNextPath)
            : state.destination;
        window.location.replace(finalDestination);
      } catch {
        window.location.replace(await resolvePostLoginDestination(requestedNextPath));
      }
    };

    void redirectAuthenticatedUser();
  }, [authLoading, requestedNextPath, user]);

  const onSubmit = async (data: LoginValues) => {
    setIsSubmitting(true);
    setAuthError(null);
    clearErrors('password');

    try {
      const { getBrowserSupabase } = await import('@core/api/supabase.browser');
      const supabase = getBrowserSupabase();

      let signInError: { message?: string } | null = null;
      try {
        const { error } = await withTimeout(
          supabase.auth.signInWithPassword({
            email: data.email.trim(),
            password: data.password,
          }),
          12_000,
          'signIn timeout'
        );
        signInError = error as { message?: string } | null;
      } catch (timeoutOrUnexpectedError) {
        const {
          data: { session },
        } = await withTimeout(
          supabase.auth.getSession(),
          4_000,
          'session check after signIn timeout'
        );
        if (!session?.user) {
          throw timeoutOrUnexpectedError;
        }
      }

      if (signInError) {
        const msg = (signInError.message || '').toLowerCase();

        if (msg.includes('email not confirmed') || msg.includes('email_not_confirmed')) {
          const normalizedEmail = data.email.trim().toLowerCase();
          let destination = appendNextPath(
            `/signUp?step=3&email=${encodeURIComponent(data.email.trim())}`,
            requestedNextPath
          );
          let resolvedFromServer = false;

          try {
            const onboardingResponse = await fetch('/api/onboarding/by-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: normalizedEmail }),
            });

            if (onboardingResponse.ok) {
              const onboarding = (await onboardingResponse.json()) as { onboardingStep?: number | null };
              const completedStep = Number(onboarding.onboardingStep || 0);
              destination = appendNextPath(
                completedStep >= 2
                  ? `/signUp?step=3&email=${encodeURIComponent(data.email.trim())}`
                  : `/signUp?step=2&email=${encodeURIComponent(data.email.trim())}`,
                requestedNextPath
              );
              resolvedFromServer = true;
            }
          } catch {
            // Fallback to local onboarding state when server lookup is unavailable.
          }

          if (!resolvedFromServer && typeof window !== 'undefined') {
            const raw = window.localStorage.getItem(LOGIN_ONBOARDING_KEY);
            if (raw) {
              try {
                const parsed = JSON.parse(raw) as { email?: string; completedStep?: number };
                if (parsed.email === normalizedEmail) {
                  if (parsed.completedStep && parsed.completedStep >= 2) {
                    destination = appendNextPath(
                      `/signUp?step=3&email=${encodeURIComponent(data.email.trim())}`,
                      requestedNextPath
                    );
                  } else {
                    destination = appendNextPath(
                      `/signUp?step=2&email=${encodeURIComponent(data.email.trim())}`,
                      requestedNextPath
                    );
                  }
                }
              } catch {
                // Ignore malformed local onboarding state.
              }
            }
          }

          setAuthError(
            'Tu correo no esta confirmado. Te redirigiremos para continuar tu registro.'
          );
          router.push(destination);
          return;
        }

        if (msg.includes('invalid') || msg.includes('credentials')) {
          const text = 'Correo o contraseña incorrectos.';
          setError('password', { type: 'manual', message: text });
          return;
        }

        if (msg.includes('user not found')) {
          setAuthError('No encontramos una cuenta con ese correo.');
          return;
        }

        const safeMessage = getSafeAuthErrorMessage(String(signInError.message || ''));
        setAuthError(safeMessage || 'No se pudo iniciar sesion.');
        return;
      }

      let destination = '/';
      let nextStep: 1 | 2 | 3 | null = null;
      try {
        const state = await withTimeout(
          fetchCurrentOnboardingState(supabase),
          8_000,
          'onboarding state timeout'
        );
        destination = state.destination;
        nextStep = state.nextStep;
      } catch {
        const {
          data: { session },
        } = await withTimeout(
          supabase.auth.getSession(),
          4_000,
          'session check after onboarding timeout'
        );
        if (!session?.user) {
          throw new Error('No session after login');
        }
      }

      const finalDestination =
        nextStep === null
          ? await resolvePostLoginDestination(requestedNextPath)
          : destination;

      toast.success('Bienvenida de vuelta.');
      window.location.assign(finalDestination);
    } catch (err) {
      setAuthError('Error inesperado al iniciar sesion.');
      toast.error('Error inesperado al iniciar sesion.');
      log.error('Login error', 'LOGIN_PAGE', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const signUpHref = appendNextPath('/signUp', requestedNextPath);

  return (
    <div className="w-full max-w-[560px] mx-auto px-4 pt-8 pb-12 md:pt-12">
      <div className="text-center mb-8">
        <h1 className="mt-4 font-eastman-extrabold text-4xl md:text-5xl leading-tight text-slate-900">
          Bienvenida
        </h1>
        <p className="mt-3 text-slate-600 text-base">
          Ingresa en segundos para ver partidos, entradas y tu perfil.
        </p>
      </div>

      <div className="bg-white/90 backdrop-blur-sm border border-slate-200/90 rounded-3xl p-5 md:p-7 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)]">
        <div className="mb-6 grid grid-cols-2 rounded-2xl bg-slate-100 p-1.5 text-sm">
          <span className="rounded-xl bg-white text-mulberry font-semibold text-center py-2.5 shadow-sm">
            Iniciar sesion
          </span>
          <Link
            href={signUpHref}
            className="rounded-xl text-slate-600 text-center py-2.5 hover:text-slate-900 transition-colors"
          >
            Crear cuenta
          </Link>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <Input
            label="Correo electronico"
            type="email"
            placeholder="pelotera@gmail.com"
            autoComplete="email"
            required
            {...register('email', {
              required: 'Este campo es requerido',
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Correo invalido',
              },
            })}
            errorText={errors.email?.message}
          />

          <Input
            label="Contraseña"
            type="password"
            placeholder="Tu contraseña"
            autoComplete="current-password"
            required
            {...register('password', {
              required: 'Este campo es requerido',
              minLength: { value: 6, message: 'Minimo 6 caracteres' },
            })}
            errorText={errors.password?.message}
          />

          {authError && (
            <p className="text-sm text-red-600" aria-live="polite">
              {authError}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || isGoogleLoading}
            className="h-11 w-full rounded-xl bg-mulberry text-white disabled:opacity-60"
          >
            {isSubmitting ? 'Ingresando...' : 'Iniciar sesion'}
          </button>

          <GoogleButton
            disabled={isSubmitting || isGoogleLoading}
            isLoading={isGoogleLoading}
            onLoadingChange={setIsGoogleLoading}
            nextPath={requestedNextPath}
          />
        </form>

        <div className="mt-5 flex items-center justify-start gap-2 text-sm">
          <Link
            href="/auth/forgot-password"
            className="font-medium text-mulberry hover:text-mulberry/80 transition-colors"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
      </div>
    </div>
  );
}
