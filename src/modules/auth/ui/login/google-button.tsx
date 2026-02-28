'use client';

import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { oauthRedirectTo } from '@modules/auth/lib/redirect';
import { log } from '@core/lib/logger';

type GoogleButtonProps = {
  disabled?: boolean;
  isLoading?: boolean;
  onLoadingChange?: (loading: boolean) => void;
};

export default function GoogleButton({
  disabled,
  isLoading = false,
  onLoadingChange,
}: GoogleButtonProps) {
  const router = useRouter();

  const handleGoogleClick = async () => {
    log.debug('Google sign-in initiated', 'LOGIN_PAGE');
    onLoadingChange?.(true);
    try {
      const { getBrowserSupabase } = await import('@core/api/supabase.browser');
      const supabase = getBrowserSupabase();

      const loadingToastId = toast.loading('Redirigiendo a Google...');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: oauthRedirectTo(),
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });

      if (error) {
        toast.dismiss(loadingToastId);
        if ((error as any).code === 'unexpected_failure') {
          toast.error(
            'Google no respondio correctamente. Intenta de nuevo o usa correo/contraseña.'
          );
        } else {
          toast.error('Error al iniciar sesión con Google: ' + error.message);
        }
        log.warn('Google OAuth error', 'LOGIN_PAGE', error);
        onLoadingChange?.(false);
        return;
      }
      // Supabase redirige solo, no haces router.push
    } catch (e) {
      toast.dismiss();
      toast.error('Error inesperado al iniciar sesión con Google');
      log.error('Unexpected error during Google sign-in', 'LOGIN_PAGE', e);
      router.refresh();
      onLoadingChange?.(false);
    }
  };

  return (
    <button
      onClick={handleGoogleClick}
      className="w-full mt-4 h-11 flex justify-center items-center gap-2 px-4 border border-slate-300 rounded-xl shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      disabled={disabled}
      type="button"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24">
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
      {isLoading ? 'Redirigiendo...' : 'Continuar con Google'}
    </button>
  );
}
