import React, { useCallback, useEffect, useRef } from 'react';
import { ButtonM, ParagraphS } from '@/components/atoms/Typography';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import Link from 'next/link';
import MenuItem from './MenuItem';
import UserImage from './UserImage';

const UserMenu = ({ user }: any) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const ref = useRef<HTMLDivElement>(null);

  const toggleOpen = useCallback(()=>{
    setIsOpen((prev) => !prev);
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);


  return (
    <div className="relative z-40" ref={ref}>
        <div className="flex flex-row items-center gap-3">
          <div className="flex flex-1 items-center justify-end">
            <div className='flex items-center space-x-8'>
              {user ? (
                <>
                  <Link
                    href="#"
                    className="font-poppins font-semibold text-sm text-mulberry"
                  >
                    Mis eventos
                  </Link>

                  <Link
                    href="#"
                    className="font-poppins font-semibold text-sm text-mulberry"
                  >
                    Mi perfil
                  </Link>

                  <div 
                    onClick={toggleOpen}
                    className="inline-flex items-center gap-2 justify-center text-xl rounded-full cursor-pointer transition"
                  >
                    <UserImage src={''}/>
                    <ChevronDownIcon className="h-6 w-6 text-slate-400" aria-hidden="true" />
                  </div>
                  {isOpen && (
                    <div className="absolute right-0 z-20 w-56 py-2 mt-2 rounded-md shadow-md bg-white overflow-hidden  top-12 text-sm flex flex-col cursor-pointer">
                      <Link href={'/'} className="mx-4 my-2 ">
                        <p className="text-sm  font-semibold leading-none">Peloteras</p>
                        <p className="text-sm leading-none text-muted-foreground">
                          peloteras@gmail.com
                        </p>
                      </Link>
                      <hr className="-mx-1 my-1 h-px bg-muted"/>
                      <MenuItem 
                        onClick={()=>{
                          toggleOpen();
                          window.location.href = "/auth/signout";
                        }}>
                          Cerrar sesión
                      </MenuItem>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <Link href={'/login'} >
                    <span className='font-poppins font-semibold text-sm text-mulberry'>Inicia sesión</span>
                  </Link>
                  <button
                    className="px-4 py-[0.60rem] bg-btnBg-light hover:bg-btnBg-dark hover:shadow text-white rounded-xl my-0 mx-2 flex justify-center items-center relative box-border"
                  >
                    <ButtonM color='text-white'>Unirme a un evento</ButtonM>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
    </div>
  )
}

export default UserMenu

