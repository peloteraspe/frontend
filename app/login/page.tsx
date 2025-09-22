'use client';

import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { Title2XL } from '@/components/atoms/Typography';
import Form from '@/components/organisms/FormComponent';
import toast from 'react-hot-toast';
import { resendConfirmation, signInWithPassword } from './auth';
import { checkIfUserExists } from './utils';
import { useRouter } from 'next/navigation';
import { useAuth } from '../provider/AuthProvider';

export default function Login() {
  const {
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  const emailValue = watch('email') || '';
  const [buttonText, setButtonText] = useState('Continuar');
  const [isExistingUser, setIsExistingUser] = useState<boolean | null>(null);
  const router = useRouter();
  const { refreshProfile } = useAuth();

  const handleCheckUser = async (data: any) => {
    setButtonText('Verificando...');

    if (!data.email) {
      toast.error('Debes ingresar un correo válido.');
      setButtonText('Continuar');
      return;
    }

    try {
      const exists = await checkIfUserExists(data.email);
      setIsExistingUser(exists);

      if (exists) {
        console.log('registered', data.email);
        toast.success('Cuenta encontrada, ingresa tu contraseña.');
        setButtonText('Ingresar');
      } else {
        console.log('not-registered', data.email);
        toast('Completa tus datos por primera vez.');
        router.push(`/signUp?email=${data.email}`);
        return;
      }
    } catch (error) {
      console.error('Error verificando usuario:', error);
      toast.error('Hubo un error. Inténtalo de nuevo.');
      setButtonText('Continuar');
    }
  };

  const handleSignIn = async (data: any) => {
    if (!isExistingUser) return;
    setButtonText('Cargando...');

    try {
      const supabase = (await import('@/utils/supabase/client')).createClient();
      const { data: sdata, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
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

          setButtonText('Ingresar');
          return;
        }

        if (msg.includes('invalid') || msg.includes('credentials')) {
          toast.error('Correo o contraseña incorrectos.');
        } else {
          toast.error(error.message || 'No se pudo iniciar sesión.');
        }
        setButtonText('Ingresar');
        return;
      }

      toast.success('¡Bienvenida de vuelta!');
      await refreshProfile?.();
      router.push('/');
    } catch (e) {
      toast.error('Error inesperado al ingresar.');
    } finally {
      setButtonText('Ingresar');
    }
  };

  const handleGoogleClick = () => {
    console.log('google-sign-in: not-implemented');
  };

  return (
    <div className="flex flex-col justify-center items-center w-full gap-8 min-h-[calc(100vh-6rem)] px-4">
      <div className="flex flex-col items-center">
        <Title2XL>Bienvenida a</Title2XL>
        <Title2XL color="text-mulberry">Peloteras</Title2XL>
      </div>

      <div className="w-full max-w-[420px]">
        <Form
          fields={[
            {
              name: 'email',
              label: 'Correo electrónico',
              type: 'email' as const,
              placeholder: 'pelotera@gmail.com',
            },
            ...(isExistingUser
              ? [
                  {
                    name: 'password',
                    label: 'Contraseña',
                    type: 'password' as const,
                    placeholder: '••••••••',
                    required: true,
                  },
                ]
              : []),
          ]}
          onSubmit={isExistingUser === null ? handleCheckUser : handleSignIn}
          buttonText={buttonText}
        />

        <div className="mt-4 flex items-center gap-3">
          <div className="h-px bg-slate-200 flex-1" />
          <span className="text-xs text-slate-500 whitespace-nowrap">o continúa con</span>
          <div className="h-px bg-slate-200 flex-1" />
        </div>

        <button
          type="button"
          onClick={handleGoogleClick}
          className="mt-4 w-full h-11 rounded-xl border border-[#5b1c70]/40 text-[#5b1c70] font-medium hover:bg-[#5b1c70]/5 transition flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 48 48">
            <path
              fill="#FFC107"
              d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12
              s5.373-12,12-12c3.059,0,5.84,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24
              s8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
            />
            <path
              fill="#FF3D00"
              d="M6.306,14.691l6.571,4.819C14.297,16.108,18.799,13,24,13c3.059,0,5.84,1.154,7.961,3.039l5.657-5.657
              C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
            />
            <path
              fill="#4CAF50"
              d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.136,35.091,26.715,36,24,36
              c-5.202,0-9.707-3.118-11.313-7.49l-6.553,5.047C9.464,39.556,16.135,44,24,44z"
            />
            <path
              fill="#1976D2"
              d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.094,5.571
              c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.985,39.007,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
            />
          </svg>
          Continuar con Google
        </button>
      </div>
    </div>
  );
}
