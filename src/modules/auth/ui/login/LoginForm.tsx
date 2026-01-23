'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';

import Form, { type FormField } from '@core/ui/Form';
import { Title2XL } from '@core/ui/Typography';
import GoogleButton from './google-button';

import { log } from '@core/lib/logger';
import { LoginValues } from './ types';

export default function LoginForm() {
  const [buttonText, setButtonText] = useState('Continuar');
  const [isExistingUser, setIsExistingUser] = useState<boolean | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    router.prefetch('/');

    const error = searchParams.get('error');
    if (error) {
      toast.error('Error de autenticación: ' + decodeURIComponent(error));
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('error');
      window.history.replaceState({}, '', newUrl.toString());
    }

    const message = searchParams.get('message');
    if (message) {
      toast(message);
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('message');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [router, searchParams]);

  const handleCheckUser = (data: LoginValues) => {
    if (!data.email) {
      toast.error('Debes ingresar un correo válido.');
      return;
    }
    setIsExistingUser(true);
    toast.success('Ingresa tu contraseña para continuar.');
    setButtonText('Ingresar');
  };

  const handleSignIn = async (data: LoginValues) => {
    if (!isExistingUser) return;
    setButtonText('Cargando...');

    try {
      const { getBrowserSupabase } = await import('@core/api/supabase.browser');
      const supabase = getBrowserSupabase();

      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password || '',
      });

      if (error) {
        const msg = (error.message || '').toLowerCase();

        if (msg.includes('email not confirmed') || msg.includes('email_not_confirmed')) {
          toast.error('Tu correo no está confirmado.');

          const { error: rerr } = await supabase.auth.resend({
            type: 'signup',
            email: data.email,
            options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
          });

          if (rerr) toast.error(rerr.message ?? 'No se pudo reenviar el correo');
          else toast.success('Te enviamos un correo para confirmar tu cuenta.');
          return;
        }

        if (
          msg.includes('invalid') ||
          msg.includes('credentials') ||
          msg.includes('user not found')
        ) {
          toast('Parece que no tienes cuenta. Te llevaremos al registro.');
          router.push(`/signUp?email=${encodeURIComponent(data.email)}`);
          return;
        }

        toast.error(error.message || 'No se pudo iniciar sesión.');
        return;
      }

      toast.success('¡Bienvenida de vuelta!');
      router.push('/');
    } catch (err) {
      toast.error('Error inesperado al ingresar.');
      log.error('Login error', 'LOGIN_PAGE', err);
    } finally {
      setTimeout(() => setButtonText('Ingresar'), 500);
    }
  };

  const fields: FormField<LoginValues>[] = [
    {
      name: 'email',
      label: 'Correo electrónico',
      type: 'email',
      placeholder: 'pelotera@gmail.com',
      validation: {
        required: 'Este campo es requerido',
        pattern: {
          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
          message: 'Correo inválido',
        },
      },
    },
    ...(isExistingUser
      ? [
          {
            name: 'password' as const,
            label: 'Contraseña',
            type: 'password' as const,
            placeholder: 'Tu contraseña',
            validation: {
              required: 'Este campo es requerido',
              minLength: { value: 6, message: 'Mínimo 6 caracteres' },
            },
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col justify-center items-center w-full gap-8 min-h-[calc(100vh-6rem)] px-4">
      <div className="text-center">
        <Title2XL>Bienvenida a</Title2XL>
        <Title2XL color="text-mulberry">Peloteras</Title2XL>
      </div>

      <div className="w-full max-w-[420px]">
        <Form<LoginValues>
          defaultValues={{ email: '', password: '' }}
          fields={fields}
          onSubmit={isExistingUser ? handleSignIn : handleCheckUser}
          submitLabel={isPending ? 'Procesando...' : buttonText}
          disableSubmitIfEmailInvalid
        />
      </div>

      <div className="w-full max-w-[420px]">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500">o continúa con</span>
          </div>
        </div>

        <GoogleButton disabled={isPending || isGoogleLoading} />
      </div>
    </div>
  );
}
