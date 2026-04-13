import type { Metadata, Viewport } from 'next';
import '../global.css';
import '../src/core/ui/styles/index.css';
import { eastmanBold, eastmanExtrabold } from './fonts';
import { Toaster } from 'react-hot-toast';
import AuthProvider from '@core/auth/AuthProvider';
import EmailVerificationBanner from '@app/_components/EmailVerificationBanner';
import { NavBar } from './_components/NavBar';
import Footer from '@src/core/ui/Footer';
import BottomNavigation from './_components/BottomNavigation';

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: 'Peloteras',
  description: 'Donde las mujeres jugamos',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: defaultUrl,
    title: 'Peloteras',
    description: 'Donde las mujeres jugamos',
    siteName: 'Peloteras',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Peloteras',
    description: 'Donde las mujeres jugamos',
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
      className={`${eastmanBold.variable} ${eastmanExtrabold.variable}`}
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
          <main className="flex-1 w-full flex flex-col items-center min-h-screen pb-16 md:pb-0">
            <EmailVerificationBanner />
            <NavBar />
            {children}
            <Footer />
          </main>
          <BottomNavigation />
          <Toaster />

          {/* Auth debugger for development */}
          {/* Debug components removed */}
        </AuthProvider>
      </body>
    </html>
  );
}
