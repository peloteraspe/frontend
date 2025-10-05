'use client';

import { Suspense, useEffect, useState, useTransition } from 'react';
import { Title2XL } from '@/components/atoms/Typography';
import toast from 'react-hot-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../provider/AuthProvider';
import { log } from "@/lib/logger";

import Form, { type FormField } from '@/components/organisms/Form';

type LoginValues = {
  email: string;
  password?: string;
};

function LoginContent() {
  const [buttonText, setButtonText] = useState('Continuar');
  const [isExistingUser, setIsExistingUser] = useState<boolean | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshProfile } = useAuth();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    router.prefetch('/');
    
    // Check if user is coming from successful signup
    if (searchParams.get('signup') === 'success') {
      toast.success('¡Cuenta creada exitosamente! 🎉 Ahora puedes iniciar sesión.');
      log.info('User arrived from successful signup', 'login');
      
      // Clean up the URL parameter
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('signup');
      window.history.replaceState({}, '', newUrl.toString());
    }

    // Check for OAuth errors
    const error = searchParams.get('error');
    if (error) {
      console.error('❌ OAuth error from callback:', error);
      toast.error('Error de autenticación: ' + decodeURIComponent(error));
      
      // Clean up the URL parameter
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('error');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [router, searchParams]);

  const handleCheckUser = (data: LoginValues) => {
    console.log('🔍 handleCheckUser called with:', data);
    
    try {
      if (!data.email) {
        toast.error('Debes ingresar un correo válido.');
        return;
      }
      
      console.log('✅ Email valid, setting isExistingUser to true');
      
      // Skip the user existence check and just show password field
      setIsExistingUser(true);
      toast.success('Ingresa tu contraseña para continuar.');
      setButtonText('Ingresar');
      console.log('🔄 State updated - isExistingUser: true, buttonText: Ingresar');
      
    } catch (error) {
      console.error('❌ Error in handleCheckUser:', error);
      toast.error('Error al procesar el email');
    }
  };

  // Direct form handlers
  const handleDirectEmailSubmit = (email: string) => {
    console.log('🔍 handleDirectEmailSubmit called with:', email);
    handleCheckUser({ email });
  };

  const handleDirectLoginSubmit = (email: string, password: string) => {
    console.log('🔍 handleDirectLoginSubmit called with:', { email, password });
    handleSignIn({ email, password });
  };

  const handleSignIn = async (data: LoginValues) => {
    if (!isExistingUser) return;
    console.log('🚀 Starting login process for:', data.email);
    setButtonText('Cargando...');
    
    try {
      console.log('📡 Creating Supabase client...');
      const supabase = (await import('@/utils/supabase/client')).createClient();
      
      console.log('🔐 Attempting sign in with password...');
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password || '',
      });
      
      console.log('🔐 Sign in response:', { error });

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
        
        if (msg.includes('invalid') || msg.includes('credentials') || msg.includes('user not found')) {
          // User doesn't exist, redirect to signup
          toast('Parece que no tienes cuenta. Te llevaremos al registro.');
          router.push(`/signUp?email=${encodeURIComponent(data.email)}`);
          return;
        }
        
        toast.error(error.message || 'No se pudo iniciar sesión.');
        return;
      }

      console.log('✅ Login successful, showing success message');
      toast.success('¡Bienvenida de vuelta!');
      
      // Don't wait for profile refresh, let AuthProvider handle it
      console.log('🏠 Navigating to home page');
      router.push('/');

    } catch (err) {
      console.error('❌ Login error:', err);
      toast.error('Error inesperado al ingresar.');
    } finally {
      console.log('🔧 Resetting button text to "Ingresar"');
      // Small delay to ensure user sees the success message
      setTimeout(() => {
        setButtonText('Ingresar');
      }, 1000);
    }
  };

  const handleGoogleClick = async () => {
    console.log('🔍 Google sign-in clicked');
    log.debug('Google sign-in initiated', 'LOGIN_PAGE');
    
    setIsGoogleLoading(true);
    
    try {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      
      console.log('🔑 Initiating Google OAuth...');
      toast.loading('Redirigiendo a Google...');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('❌ Google OAuth error:', error);
        toast.dismiss();
        toast.error('Error al iniciar sesión con Google: ' + error.message);
        setIsGoogleLoading(false);
        return;
      }

      console.log('✅ Google OAuth initiated successfully');
      log.info('Google OAuth redirect initiated', 'LOGIN_PAGE');
      // The redirect will happen automatically, so we don't need to reset loading state
      
    } catch (error) {
      console.error('❌ Unexpected error during Google sign-in:', error);
      toast.dismiss();
      toast.error('Error inesperado al iniciar sesión con Google');
      setIsGoogleLoading(false);
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

  // Debug log to see what fields are being generated
  console.log('🔧 Fields array:', fields.map(f => ({ name: f.name, type: f.type })));

  return (
    <div className="flex flex-col justify-center items-center w-full gap-8 min-h-[calc(100vh-6rem)] px-4">
      {/* Debug indicator */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-blue-100 border border-blue-400 px-4 py-2 rounded-lg text-sm z-50">
          <strong>Login Debug:</strong> isExistingUser: {String(isExistingUser)} | Button: "{buttonText}" | Fields: {fields.length}
        </div>
      )}
      
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
          disableSubmitIfEmailInvalid={true}
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

        <button
          onClick={handleGoogleClick}
          className="w-full mt-4 flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isPending || isGoogleLoading}
        >
          {isGoogleLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
              Redirigiendo...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={
      <div className="flex flex-col justify-center items-center w-full gap-8 min-h-[calc(100vh-6rem)] px-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mulberry"></div>
        <p className="text-gray-600">Cargando...</p>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
