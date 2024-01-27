import Link from 'next/link';

export default function AuthButton({
  username,
  isLogged,
}: {
  username?: string;
  isLogged: boolean;
}) {
  const signOut = async () => {
    console.log('Signing out');
    // Perform sign-out logic here, e.g., calling an API endpoint
    // For now, let's navigate to the sign-out route
    window.location.href = '/auth/signout';
  };

  return isLogged ? (
    <div className="flex items-center gap-4">
      {username && (
        <Link href="/profile">
          <span className="text-sm font-medium text-secondary">{username}</span>
        </Link>
      )}
      <button
        onClick={signOut}
        className="py-2 px-4 rounded-md no-underline bg-btn-background hover:bg-btn-background-hover"
      >
        Cerrar sesión
      </button>
    </div>
  ) : (
    <Link href="/login">
      <span className="py-2 px-3 flex btn no-underline bg-primary hover:bg-primary-dark text-white">
        Ingresa aquí
      </span>
    </Link>
  );
}
