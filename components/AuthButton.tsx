import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function AuthButton({
  username,
  isLogged,
}: {
  username?: string;
  isLogged: boolean;
}) {
  const signOut = async () => {
    'use server';

    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    await supabase.auth.signOut();
    return redirect('/login');
  };

  return isLogged ? (
    <div className="flex items-center gap-4">
      {username && (
        <Link href="/profile">
          <a className="text-sm font-medium text-secondary">{username}</a>
        </Link>
      )}
      <form action={signOut}>
        <button className="py-2 px-4 rounded-md no-underline bg-btn-background hover:bg-btn-background-hover">
          Cerrar sesión
        </button>
      </form>
    </div>
  ) : (
    <Link
      href="/login"
      className="py-2 px-3 flex btn no-underline bg-primary hover:bg-primary-dark text-white"
    >
      Ingresa aquí
    </Link>
  );
}
