'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@core/auth/AuthProvider';

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  authRequired?: boolean;
  getUserHref?: (userId: string) => string;
};

const navItems: NavItem[] = [
  {
    href: '/',
    label: 'Inicio',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
        <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" />
      </svg>
    ),
  },
  {
    href: '/events',
    label: 'Eventos',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path fillRule="evenodd" d="M8.161 2.58a1.875 1.875 0 011.678 0l4.993 2.498c.106.052.23.052.336 0l3.869-1.935A1.875 1.875 0 0121.75 4.82v12.485c0 .71-.401 1.36-1.037 1.677l-4.875 2.437a1.875 1.875 0 01-1.676 0L9.17 18.92a.75.75 0 00-.67 0l-3.869 1.935a1.875 1.875 0 01-2.713-1.677V6.692c0-.71.401-1.36 1.036-1.677l4.875-2.437zM15.75 7.5a.75.75 0 00-1.5 0v.75a.75.75 0 001.5 0V7.5zm0 3.75a.75.75 0 00-1.5 0v.75a.75.75 0 001.5 0v-.75zm-.75 2.25a.75.75 0 01.75.75v.75a.75.75 0 01-1.5 0v-.75a.75.75 0 01.75-.75zM9 10.5a.75.75 0 00-1.5 0v.75a.75.75 0 001.5 0v-.75zm-.75 2.25a.75.75 0 01.75.75v.75a.75.75 0 01-1.5 0v-.75a.75.75 0 01.75-.75zM9 14.25a.75.75 0 00-1.5 0v.75a.75.75 0 001.5 0v-.75z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    href: '/tickets',
    label: 'Entradas',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path fillRule="evenodd" d="M1.5 6.375c0-1.036.84-1.875 1.875-1.875h17.25c1.035 0 1.875.84 1.875 1.875v3.026a.75.75 0 01-.375.65 2.249 2.249 0 000 3.898.75.75 0 01.375.65v3.026c0 1.035-.84 1.875-1.875 1.875H3.375A1.875 1.875 0 011.5 17.625v-3.026a.75.75 0 01.374-.65 2.249 2.249 0 000-3.898.75.75 0 01-.374-.65V6.375zm15-1.125a.75.75 0 01.75.75v.75a.75.75 0 01-1.5 0V6a.75.75 0 01.75-.75zm.75 4.5a.75.75 0 00-1.5 0v.75a.75.75 0 001.5 0v-.75zm-.75 3a.75.75 0 01.75.75v.75a.75.75 0 01-1.5 0v-.75a.75.75 0 01.75-.75zm.75 4.5a.75.75 0 00-1.5 0V18a.75.75 0 001.5 0v-.75zM6 12a.75.75 0 01.75-.75H12a.75.75 0 010 1.5H6.75A.75.75 0 016 12zm.75 2.25a.75.75 0 000 1.5h3a.75.75 0 000-1.5h-3z" clipRule="evenodd" />
      </svg>
    ),
    authRequired: true,
    getUserHref: (userId) => `/tickets/${userId}`,
  },
  {
    href: '/profile',
    label: 'Perfil',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
      </svg>
    ),
    authRequired: true,
  },
];

export default function BottomNavigation() {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  // No mostrar en ciertas rutas
  const hiddenRoutes = ['/login', '/signUp', '/onboarding', '/auth'];
  const shouldHide = hiddenRoutes.some((route) => pathname.startsWith(route));

  if (shouldHide) return null;

  const getHref = (item: NavItem) => {
    if (item.getUserHref && user?.id) {
      return item.getUserHref(user.id);
    }
    return item.href;
  };

  const isActive = (item: NavItem) => {
    if (item.href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(item.href);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 pb-safe md:hidden"
      aria-label="Navegacion principal"
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          // Si requiere auth y no hay usuario, mostrar login
          if (item.authRequired && !user && !loading) {
            return (
              <Link
                key={item.href}
                href="/login"
                className="flex flex-col items-center justify-center flex-1 h-full text-slate-400 transition-colors"
                aria-label={`${item.label} - Inicia sesion`}
              >
                <span className="opacity-50">{item.icon}</span>
                <span className="text-xs mt-1 font-medium">{item.label}</span>
              </Link>
            );
          }

          const active = isActive(item);
          const href = getHref(item);

          return (
            <Link
              key={item.href}
              href={href}
              className={[
                'flex flex-col items-center justify-center flex-1 h-full transition-colors',
                active ? 'text-mulberry' : 'text-slate-500 hover:text-slate-700',
              ].join(' ')}
              aria-current={active ? 'page' : undefined}
            >
              <span className={active ? 'scale-110 transition-transform' : ''}>{item.icon}</span>
              <span className={['text-xs mt-1', active ? 'font-semibold' : 'font-medium'].join(' ')}>
                {item.label}
              </span>
              {active && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-mulberry" aria-hidden="true" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
