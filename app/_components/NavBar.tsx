import Image from 'next/image';
import Link from 'next/link';
import NavBarAuthControls from './NavBarAuthControls';

export const NavBar = ({ simple = false }: { simple?: boolean }) => {
  return (
    <nav className="mx-auto flex w-full max-w-[1600px] justify-between items-center px-5 py-4 sm:px-8 lg:px-10">
      <Link
        href="/"
        className="flex items-center h-full cursor-pointer gap-2"
        aria-label="Ir al inicio"
      >
        <Image
          src="/assets/peloteras.svg"
          width={207}
          height={37}
          alt="Peloteras logo"
          className="h-10 sm:h-12 w-auto"
        />
      </Link>

      {!simple ? <NavBarAuthControls /> : null}
    </nav>
  );
};
