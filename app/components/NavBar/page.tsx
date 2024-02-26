import { NavBar } from '@/components/layout/navbar/NavBar'
import React from 'react'

const NavbarPage = () => {
  return (
    <div className='flex-1 w-full flex flex-col gap-20 items-center min-h-screen'>
      <NavBar user={false}/>
      <NavBar user={true}/>
    </div>
  )
}

export default NavbarPage
