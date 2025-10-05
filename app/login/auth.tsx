'use server';
import { headers, cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

// export const signIn = async (email: string) => {
//   const cookieStore = await cookies();
//   const supabase = createClient(cookieStore);

//   const hdrs = await headers();
//   const currentDomain =
//     hdrs.get('origin') === 'http://localhost:3000'
//       ? 'http://localhost:3000/auth/callback'
//       : 'https://www.peloteras.com/auth/callback';

//   const { error } = await supabase.auth.signInWithOtp({
//     email,
//     options: { emailRedirectTo: currentDomain },
//   });

//   if (error) {
//     // Log authentication error properly
//     return { error: 'No puedes ingresar con ese correo' };
//   }

//   return { message: 'Revisa tu correo para ingresar a tu cuenta' };
// };

// export const signUp = async (formData: FormData) => {
//   'use server';

//   const hdrs = await headers();
//   const origin = hdrs.get('origin');
//   const email = formData.get('email') as string;
//   const password = formData.get('password') as string;
//   const cookieStore = await cookies(); // Await cookies() here as well
//   const supabase = createClient(cookieStore);

//   const { error } = await supabase.auth.signUp({
//     email,
//     password,
//     options: {
//       emailRedirectTo: `${origin}/auth/callback`,
//     },
//   });

//   if (error) {
//     return redirect('/login?message=Could not authenticate user');
//   }

//   return redirect('/login?message=Check email to continue sign in process');
// };

export const signUp = async (formData: FormData) => {
  const hdrs = await headers();
  const origin = hdrs.get('origin') ?? 'http://localhost:3000';
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return redirect('/login?message=No se pudo crear la cuenta');
  }
  return redirect('/login?message=Te enviamos un correo para confirmar tu cuenta');
};

export const signInWithPassword = async (email: string, password?: string) => {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return {
      ok: false as const,
      error: { message: error.message, status: (error as any)?.status },
    };
  }
  return { ok: true as const, data };
};

export const resendConfirmation = async (email: string) => {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const hdrs = await headers();
  const origin = hdrs.get('origin') ?? 'http://localhost:3000';
  const emailRedirectTo =
    origin === 'http://localhost:3000'
      ? 'http://localhost:3000/auth/callback'
      : 'https://www.peloteras.com/auth/callback';

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email,
    options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
  });

  if (error) return { ok: false as const, error: error.message ?? 'No se pudo reenviar el correo' };
  return { ok: true as const };
};
