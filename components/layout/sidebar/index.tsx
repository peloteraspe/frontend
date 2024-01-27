import { getCollectionsFromSupabase } from '@/lib/supabase';
import Link from 'next/link';
import { Suspense } from 'react';
const { SITE_NAME } = process.env;

export default async function Navbar() {
  // const menu = await getCollectionsFromSupabase();

  // console.log(menu, 'menu')

  const menu = [
    {
      title: 'Tipo de juego',
      children: [
        {
          title: 'Pichanga libre',
          path: '/search/pichanga-libre',
        },
        {
          title: 'Versus de equipos',
          path: '/search/versus-de-equipos',
        },
      ],
    },
  ];

  return (
    <nav className="relative flex items-center justify-between p-4 lg:px-6">
      {/* <div className="block flex-none md:hidden">
        <MobileMenu menu={menu} />
      </div> */}
      <div className="flex w-full items-center">
        <div className="flex w-full">
          <Link
            href="/"
            className="mr-2 flex w-full items-center justify-center md:w-auto lg:mr-6"
          >
            {/* <LogoSquare /> */}
            <div className="ml-2 flex-none text-sm font-medium uppercase md:hidden lg:block">
              Peloteras
            </div>
          </Link>
          {menu.length ? (
            <ul className="hidden gap-6 text-sm md:flex md:items-center">
              {menu.map((item: any) => (
                <li key={item.title}>
                  {item.children && item.children.length
                    ? item.children.map((child: any) => (
                        <Link href={child.path}>
                          <span className="text-gray-600 hover:text-gray-800">
                            {child.title}
                          </span>
                        </Link>
                      ))
                    : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
