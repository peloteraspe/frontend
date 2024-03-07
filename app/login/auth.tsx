'use server'
import { headers, cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export const signIn = async (formData: FormData) => {
 ;
  
  const email = formData.get('email') as string;
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const currentDomain =
    headers().get('origin') === 'http://localhost:3000'
      ? 'http://localhost:3000/auth/callback'
      : 'https://peloteras.com/auth/callback';

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${currentDomain}`,
    },
  });

  if (error) {
    console.log('SignIn Error:', error)
    return redirect('/login?message=No puedes ingresar con ese correo');
  }

  return redirect(
    '/login?message=Revisa tu correo para ingresar a tu cuenta'
  );
};

export const signUp = async (formData: FormData) => {
  'use server';

  const origin = headers().get('origin');
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return redirect('/login?message=Could not authenticate user');
  }

  return redirect('/login?message=Check email to continue sign in process');
};
