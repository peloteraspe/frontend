import Link from 'next/link';
import { headers, cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { NavBar } from '@/components/layout/navbar/NavBar';
import { Title2XL } from '@/components/atoms/Typography';
import { ButtonWrapper } from '@/components/Button';

export default function Login({
  searchParams,
}: {
  searchParams: { message: string };
}) {
  const signIn = async (formData: FormData) => {
    'use server';

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
      return redirect('/login?message=No puedes ingresar con ese correo');
    }

    return redirect(
      '/login?message=Revisa tu correo para ingresar a tu cuenta'
    );
  };

  const signUp = async (formData: FormData) => {
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

  return (
    <div className="flex flex-col justify-center items-center w-full gap-8 h-[calc(100vh-6rem)]">
      <div className="flex flex-col items-center">
        <Title2XL>Bienvenida a</Title2XL>
        <Title2XL color="text-mulberry">Peloteras</Title2XL>
      </div>
      <div className="flex flex-col items-center">
        <form
          className="flex flex-col gap-4 w-full"
          action={signIn}
          method="post"
        >
          <label htmlFor="email">Correo electrónico</label>
          <input
            className="form-input w-full ring-secondary focus:ring-secondary-dark"
            type="email"
            name="email"
            placeholder="Ingresa tu correo"
            required
          />
          <div className="flex flex-col items-center">
            <ButtonWrapper>Obtener enlace mágico</ButtonWrapper>
          </div>
        </form>
      </div>

      {searchParams?.message && (
        <p className="mt-4 p-4 bg-foreground/10 text-foreground text-center">
          {searchParams.message}
        </p>
      )}
    </div>
  );
}
