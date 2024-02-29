import { Poppins } from 'next/font/google';
import { eastmanBold, eastmanExtrabold } from './fonts';
import './css/style.css';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { Toaster } from 'react-hot-toast';
import { NavBar } from '@/components/layout/navbar/NavBar';

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000';

const poppins = Poppins({
  subsets: ['latin'],
  variable: '--font-poppins',
  weight: '400',
  display: 'swap',
});

const poppinsSemibold = Poppins({
  subsets: ['latin'],
  variable: '--font-poppins-semibold',
  weight: '600',
  display: 'swap',
});

const poppinsBold = Poppins({
  subsets: ['latin'],
  variable: '--font-poppins-bold',
  weight: '700',
  display: 'swap',
});

const poppinsExtrabold = Poppins({
  subsets: ['latin'],
  variable: '--font-poppins-extrabold',
  weight: '800',
  display: 'swap',
});

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: 'Peloteras',
  description: 'Donde las mujeres jugamos fútbol',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${poppinsBold.variable} ${poppinsExtrabold.variable} ${poppinsSemibold.variable} ${eastmanBold.variable} ${eastmanExtrabold.variable}`}
    >
      <body
        className="bg-cover bg-center h-full w-full"
        style={{
          backgroundImage: "url('/assets/images/Hero.png')",
        }}
      >
        <main className="flex-1 w-full flex flex-col items-center min-h-screen">
          <NavBar user={user} />
          {children}
        </main>
      </body>
      <Toaster />
    </html>
  );
}
