import type { Metadata, Viewport } from 'next';
import '../global.css';
import '../src/core/ui/styles/index.css';
import { eastmanBold, eastmanExtrabold } from './fonts';
import AuthProvider from '@core/auth/AuthProvider';
import LayoutClientEnhancements from '@app/_components/LayoutClientEnhancements';
import { NavBar } from './_components/NavBar';
import Footer from '@src/core/ui/Footer';

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: 'Peloteras',
  description:
    'Juega, organiza y conecta con más mujeres y personas de la diversidad a través del fútbol.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: defaultUrl,
    title: 'Peloteras',
    description:
      'Juega, organiza y conecta con más mujeres y personas de la diversidad a través del fútbol.',
    siteName: 'Peloteras',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Peloteras',
    description:
      'Juega, organiza y conecta con más mujeres y personas de la diversidad a través del fútbol.',
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
        className="h-full w-full"
        style={{
          backgroundColor: '#fffdfb',
          backgroundImage: `radial-gradient(42rem 30rem at 18% 2%, rgba(240, 129, 91, 0.22), transparent 60%),
            radial-gradient(44rem 32rem at 72% 6%, rgba(179, 71, 177, 0.2), transparent 58%),
            radial-gradient(36rem 28rem at 88% 92%, rgba(76, 129, 214, 0.16), transparent 50%),
            linear-gradient(180deg, rgba(255, 252, 249, 1) 0%, rgba(255, 255, 255, 1) 34%)`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
        }}
        suppressHydrationWarning
      >
        <AuthProvider>
          <main className="flex-1 w-full flex flex-col items-center min-h-screen pb-16 md:pb-0">
            <NavBar />
            {children}
            <Footer />
          </main>
          <LayoutClientEnhancements />

          {/* Auth debugger for development */}
          {/* Debug components removed */}
        </AuthProvider>
      </body>
    </html>
  );
}
