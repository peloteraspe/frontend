import { Poppins } from 'next/font/google';
import type { Metadata, Viewport } from 'next';
import { eastmanBold, eastmanExtrabold } from './fonts';
import '../global.css';
import { Toaster } from 'react-hot-toast';
import { NavBar } from '@/components/layout/navbar/NavBar';
import Footer from '@/components/layout/Footer';
import AuthProvider from './provider/AuthProvider';

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

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: 'Peloteras',
  description: 'Donde las mujeres jugamos fútbol',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: defaultUrl,
    title: 'Peloteras',
    description: 'Donde las mujeres jugamos fútbol',
    siteName: 'Peloteras',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Peloteras',
    description: 'Donde las mujeres jugamos fútbol',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#F0815B',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`${poppins.variable} ${poppinsBold.variable} ${poppinsExtrabold.variable} ${poppinsSemibold.variable} ${eastmanBold.variable} ${eastmanExtrabold.variable}`}
      suppressHydrationWarning
    >
      <body
        className="bg-cover bg-center h-full w-full"
        style={{
          backgroundImage: "url('/assets/images/Hero.png')",
        }}
        suppressHydrationWarning
      >
        <AuthProvider>
          <main className="flex-1 w-full flex flex-col items-center min-h-screen">
            <NavBar />
            {children}
            <Footer />
          </main>

          <Toaster />
          
          {/* Auth debugger for development */}
          {/* Debug components removed */}
        </AuthProvider>
      </body>
    </html>
  );
}
