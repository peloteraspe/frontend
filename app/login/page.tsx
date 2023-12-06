import Link from 'next/link';
import { headers, cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

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
    const currentDomain = headers().get('origin') === 'http://localhost:3000' ? 'http://localhost:3000/auth/callback' : 'https://peloteras.com/auth/callback';

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${currentDomain}`,
      },
    });

    if (error) {
      return redirect(
        '/login?message=No puedes ingresar con ese correo'
      );
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
    <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2">
      <Link
        href="/"
        className="absolute sm:left-48 left-3 top-20 py-2 px-4 rounded-md no-underline text-foreground bg-btn-background hover:bg-btn-background-hover flex items-center group text-sm"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>{' '}
        Volver
      </Link>
      <div className="flex flex-col items-center">
        <div className="mb-4">
          <h1 className="text-4xl font-extrabold font-inter mb-4">
            Ingresa a Peloteras
          </h1>
          {/* <div className="text-gray-500">Enter your email and we'll email you a magic link for a password-free sign in.</div> */}
          <div className="text-gray-500">
            Ingresa tu correo electrónico y te enviaremos un enlace mágico para
            iniciar sesión sin contraseña.
          </div>
        </div>
        <form
          className="animate-in flex-1 flex flex-col w-full justify-center gap-2 text-foreground"
          action={signIn}
        >
          <label className="block text-sm font-medium" htmlFor="email">
            Correo electrónico
          </label>
          <input
            className="form-input w-full ring-secondary focus:ring-secondary-dark"
            name="email"
            placeholder="you@example.com"
            required
          />

          <button className="btn w-full text-white bg-primary shadow-sm group mt-4">
            Obtener enlace mágico{' '}
            <span className="group-hover:translate-x-0.5 transition-transform duration-150 ease-in-out ml-1 bg-primary">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="w-4 h-4 ml-1 bg-primary"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75"
                />
              </svg>
            </span>
          </button>
          {searchParams?.message && (
            <p className="mt-4 p-4 bg-foreground/10 text-foreground text-center">
              {searchParams.message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
