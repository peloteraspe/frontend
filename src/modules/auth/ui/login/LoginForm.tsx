'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';

import Input from '@core/ui/Input';
import { log } from '@core/lib/logger';
import GoogleButton from './google-button';

type LoginValues = {
  email: string;
  password: string;
};

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

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
    router.prefetch('/');

    const error = searchParams.get('error');
    const message = searchParams.get('message');
    const signup = searchParams.get('signup');

    if (error) toast.error('Error de autenticacion: ' + decodeURIComponent(error));
    if (message === 'link_expired') {
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

  const onSubmit = async (data: LoginValues) => {
    setIsSubmitting(true);
    setAuthError(null);
    clearErrors('password');

    try {
      const { getBrowserSupabase } = await import('@core/api/supabase.browser');
      const supabase = getBrowserSupabase();

      const { error } = await supabase.auth.signInWithPassword({
        email: data.email.trim(),
        password: data.password,
      });

      if (error) {
        const msg = (error.message || '').toLowerCase();

        if (msg.includes('email not confirmed') || msg.includes('email_not_confirmed')) {
          setAuthError('Tu correo no esta confirmado. Revisa tu bandeja o reenvia la confirmacion.');

          const { error: resendError } = await supabase.auth.resend({
            type: 'signup',
            email: data.email.trim(),
            options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
          });

          if (resendError) toast.error(resendError.message || 'No se pudo reenviar el correo.');
          else toast.success('Te enviamos un correo para confirmar tu cuenta.');
          return;
        }

        if (msg.includes('invalid') || msg.includes('credentials')) {
          const text = 'Correo o contrasena incorrectos.';
          setAuthError(text);
          setError('password', { type: 'manual', message: text });
          return;
        }

        if (msg.includes('user not found')) {
          setAuthError('No encontramos una cuenta con ese correo.');
          return;
        }

        setAuthError(error.message || 'No se pudo iniciar sesion.');
        return;
      }

      toast.success('Bienvenida de vuelta.');
      router.push('/');
    } catch (err) {
      setAuthError('Error inesperado al iniciar sesion.');
      toast.error('Error inesperado al iniciar sesion.');
      log.error('Login error', 'LOGIN_PAGE', err);
    } finally {
      setIsSubmitting(false);
    }
  };

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
            href="/signUp"
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
            label="Contrasena"
            type="password"
            placeholder="Tu contrasena"
            autoComplete="current-password"
            required
            {...register('password', {
              required: 'Este campo es requerido',
              minLength: { value: 6, message: 'Minimo 6 caracteres' },
            })}
            errorText={errors.password?.message}
          />

          {authError && <p className="text-sm text-red-600" aria-live="polite">{authError}</p>}

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
