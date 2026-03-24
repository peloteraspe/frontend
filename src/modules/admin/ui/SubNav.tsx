"use client";
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@core/auth/AuthProvider';
import { isSuperAdmin } from '@shared/lib/auth/isAdmin';

const links = [
  { href: '/admin', label: 'Resumen' },
  { href: '/admin/events', label: 'Eventos' },
  { href: '/admin/communications', label: 'Correos', superadminOnly: true },
  { href: '/admin/payments', label: 'Pagos' },
  { href: '/admin/payment-methods', label: 'Formas de pago' },
  { href: '/admin/scan', label: 'Validar QR', disabled: true },
  { href: '/admin/users', label: 'Usuarios', superadminOnly: true },
];

export default function SubNav() {
  const pathname = usePathname();
  const search = useSearchParams();
  const { user } = useAuth();

  const canViewUsersModule = isSuperAdmin(user as any);
  const visibleLinks = canViewUsersModule
    ? links
    : links.filter((link) => !link.superadminOnly);

  function getTarget(href: string, active: boolean) {
    return { pathname: href, query: active ? Object.fromEntries(search.entries()) : {} };
  }

  function getChipClass(active: boolean) {
    return `shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
      active
        ? 'border-mulberry bg-mulberry text-white'
        : 'border-mulberry/40 bg-white text-mulberry hover:border-mulberry hover:bg-mulberry/5'
    }`;
  }

  return (
    <nav className="mb-4">
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible">
        {visibleLinks.map((l) => {
          const active = pathname === l.href;
          if (l.disabled) {
            return (
              <span
                key={l.href}
                className="shrink-0 whitespace-nowrap rounded-full border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-500 cursor-not-allowed"
                aria-disabled="true"
                title="Módulo deshabilitado temporalmente"
              >
                {l.label}
              </span>
            );
          }
          return (
            <Link
              key={l.href}
              href={getTarget(l.href, active)}
              aria-current={active ? 'page' : undefined}
              className={getChipClass(active)}
            >
              {l.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
