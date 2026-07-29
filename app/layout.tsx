import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import '../global.css';
import '../src/core/ui/styles/index.css';
import { eastmanBold, eastmanExtrabold } from './fonts';
import AuthProvider from '@core/auth/AuthProvider';
import LayoutClientEnhancements from '@app/_components/LayoutClientEnhancements';
import { NavBar } from './_components/NavBar';
import Footer from '@src/core/ui/Footer';
import { SITE_URL } from '@shared/lib/site';

const GOOGLE_TAG_MANAGER_ID_PATTERN = /^[A-Za-z0-9-]+$/;

function resolveGoogleTagManagerId() {
  const rawId =
    process.env.NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID || process.env.NEXT_PUBLIC_GTM_ID || '';
  const trimmedId = rawId.trim();

  if (!trimmedId || !GOOGLE_TAG_MANAGER_ID_PATTERN.test(trimmedId)) {
    return null;
  }

  return trimmedId;
}

function GoogleTagManagerHead({ id }: { id: string }) {
  return (
    <Script
      id="google-tag-manager"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{
        __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer',${JSON.stringify(id)});`,
      }}
    />
  );
}

function GoogleTagManagerBody({ id }: { id: string }) {
  return (
    <noscript>
      <iframe
        title="Google Tag Manager"
        src={`https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(id)}`}
        height="0"
        width="0"
        style={{ display: 'none', visibility: 'hidden' }}
      />
    </noscript>
  );
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Peloteras',
  description:
    'Juega, organiza y conecta con más mujeres y personas de la diversidad a través del fútbol.',
  openGraph: {
    type: 'website',
    title: 'Peloteras',
    description:
      'Juega, organiza y conecta con más mujeres y personas de la diversidad a través del fútbol.',
    siteName: 'Peloteras',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
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
  const googleTagManagerId = resolveGoogleTagManagerId();

  return (
    <html
      lang="es"
      className={`${eastmanBold.variable} ${eastmanExtrabold.variable}`}
      suppressHydrationWarning
    >
      {googleTagManagerId ? <GoogleTagManagerHead id={googleTagManagerId} /> : null}
      <body
        className="h-full w-full"
        style={{
          backgroundColor: '#FAF9FB',
        }}
        suppressHydrationWarning
      >
        {googleTagManagerId ? <GoogleTagManagerBody id={googleTagManagerId} /> : null}
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
