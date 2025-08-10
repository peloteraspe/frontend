"use client";
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

const links = [
  { href: '/admin', label: 'Resumen' },
  { href: '/admin/events', label: 'Eventos' },
  { href: '/admin/payments', label: 'Pagos' },
  { href: '/admin/users', label: 'Usuarios' },
];

export default function SubNav() {
  const pathname = usePathname();
  const search = useSearchParams();
  return (
    <nav className="mb-4 flex gap-2 overflow-x-auto">
      {links.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={{ pathname: l.href, query: active ? Object.fromEntries(search.entries()) : {} }}
            className={`px-3 py-2 rounded-md text-sm border ${
              active ? 'bg-mulberry text-white border-mulberry' : 'bg-white text-mulberry border-mulberry'
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
