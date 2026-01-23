'use client';

import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { oauthRedirectTo } from '@modules/auth/lib/redirect';
import { log } from '@core/lib/logger';

export default function GoogleButton({ disabled }: { disabled?: boolean }) {
  const router = useRouter();

  const handleGoogleClick = async () => {
    log.debug('Google sign-in initiated', 'LOGIN_PAGE');
    try {
      const { getBrowserSupabase } = await import('@core/api/supabase.browser');
      const supabase = getBrowserSupabase();

      toast.loading('Redirigiendo a Google...');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: oauthRedirectTo('/profile'),
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });

      if (error) {
        toast.dismiss();
        toast.error('Error al iniciar sesión con Google: ' + error.message);
        return;
      }
      // Supabase redirige solo, no haces router.push
    } catch (e) {
      toast.dismiss();
      toast.error('Error inesperado al iniciar sesión con Google');
      log.error('Unexpected error during Google sign-in', 'LOGIN_PAGE', e);
      router.refresh();
    }
  };

  return (
    <button
      onClick={handleGoogleClick}
      className="w-full mt-4 flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      disabled={disabled}
      type="button"
    >
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
    </button>
  );
}
