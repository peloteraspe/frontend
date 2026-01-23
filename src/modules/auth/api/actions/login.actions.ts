'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getServerSupabase } from '@core/api/supabase.server';

async function getOrigin() {
  const hdrs = await headers();
  return hdrs.get('origin') ?? 'http://localhost:3000';
}

function callbackUrl(origin: string) {
  return `${origin}/auth/callback`;
}

export async function signUp(formData: FormData) {
  const origin = await getOrigin(); // ✅ await
  const email = String(formData.get('email') || '');
  const password = String(formData.get('password') || '');

  if (!email || !password) {
    return redirect('/login?message=Completa email y contraseña');
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: callbackUrl(origin) },
  });

  if (error) {
    return redirect('/login?message=No se pudo crear la cuenta');
  }

  return redirect('/login?message=Te enviamos un correo para confirmar tu cuenta');
}

export async function signInWithPassword(email: string, password?: string) {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: password ?? '',
  });

  if (error) {
    return {
      ok: false as const,
      error: { message: error.message, status: (error as any)?.status },
    };
  }
  return { ok: true as const, data };
}

export async function resendConfirmation(email: string) {
  const supabase = await getServerSupabase();
  const origin = await getOrigin();

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: callbackUrl(origin) },
  });

  if (error) return { ok: false as const, error: error.message ?? 'No se pudo reenviar el correo' };
  return { ok: true as const };
}
