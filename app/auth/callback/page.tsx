'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleSession = async () => {
      const supabase = createClient();

      const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);

      if (error) {
        console.error('Error intercambiando sesión:', error.message);
        router.replace('/login?message=' + encodeURIComponent(error.message));
        return;
      }

      router.replace('/');
    };

    handleSession();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Confirmando tu cuenta, un momento...</p>
    </div>
  );
}
