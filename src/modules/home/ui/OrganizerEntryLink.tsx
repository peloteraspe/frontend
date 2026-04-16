'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useAuth } from '@core/auth/AuthProvider';
import { isAdmin as isAdminUser } from '@shared/lib/auth/isAdmin';

type Props = {
  children: ReactNode;
  className?: string;
};

export default function OrganizerEntryLink({ children, className = '' }: Props) {
  const { user, loading } = useAuth();
  const userIsAdmin = isAdminUser(user);
  const href = userIsAdmin ? '/admin' : '/create-event';

  return (
    <Link
      href={href}
      aria-disabled={loading}
      onClick={(event) => {
        if (loading) {
          event.preventDefault();
        }
      }}
      className={`${className}${loading ? ' pointer-events-none opacity-80' : ''}`}
    >
      {children}
    </Link>
  );
}
