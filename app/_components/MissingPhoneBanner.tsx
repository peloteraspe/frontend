'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@core/auth/AuthProvider';
import { resolveStoredPhone } from '@shared/lib/phone';

export default function MissingPhoneBanner() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const phone = resolveStoredPhone(user);

  if (loading || !user || phone || pathname === '/profile') {
    return null;
  }

  return (
    <div className="w-full border-y border-amber-200 bg-amber-50/95 text-amber-900">
      <div className="mx-auto flex max-w-screen-xl flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm">
          Agrega tu número de celular para completar tu perfil y mantener tu contacto actualizado.
        </p>
        <Link
          href="/profile"
          className="inline-flex h-9 items-center justify-center rounded-lg bg-amber-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-amber-700"
        >
          Completar perfil
        </Link>
      </div>
    </div>
  );
}
