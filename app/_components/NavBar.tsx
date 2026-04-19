import Image from 'next/image';
import Link from 'next/link';
import NavBarAuthControls from './NavBarAuthControls';

export const NavBar = ({ simple = false }: { simple?: boolean }) => {
  return (
    <nav className="site-shell sticky top-0 z-50 pt-3 sm:pt-4">
      <div className="site-panel-soft overflow-visible flex min-h-[72px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="flex h-full items-center gap-3 rounded-full transition-transform duration-200 hover:scale-[1.01]"
          aria-label="Ir al inicio"
        >
          <Image
            src="/assets/peloteras.svg"
            width={207}
            height={37}
            alt="Peloteras logo"
            className="h-10 w-auto sm:h-11"
          />
        </Link>

        {!simple ? <NavBarAuthControls /> : null}
      </div>
    </nav>
  );
};
