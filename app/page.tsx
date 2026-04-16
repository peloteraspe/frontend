import type { Metadata } from 'next';
import { enforceOnboardingGuard } from '@modules/auth/lib/onboarding.server';
import CardEventList from '@modules/events/ui/cardEvents/CardEventList';
import LandingGrowthBlocks from '@modules/home/ui/LandingGrowthBlocks';
import MainSection from '@modules/home/ui/MainSection';
import WhatIsPeloterasSection from '@modules/home/ui/WhatIsPeloterasSection';

const siteUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://peloteras.com';

export const metadata: Metadata = {
  title: 'Peloteras | Pichangas, eventos y fútbol femenino en comunidad',
  description:
    'Peloteras es la plataforma para mujeres y diversidades que quieren jugar fútbol, encontrar eventos deportivos y organizar pichangas con más orden.',
  keywords: [
    'Peloteras',
    'fútbol femenino',
    'pichangas',
    'eventos deportivos',
    'mujeres y diversidades',
    'organizar partidos',
    'jugar fútbol en Perú',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Peloteras | Pichangas, eventos y fútbol femenino en comunidad',
    description:
      'Encuentra dónde jugar, descubre eventos deportivos y organiza tus propias fechas con Peloteras.',
    url: siteUrl,
    images: [
      {
        url: '/assets/images/peloteras-hero.png',
        width: 1200,
        height: 1200,
        alt: 'Jugadoras de Peloteras celebrando en la cancha',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Peloteras | Pichangas, eventos y fútbol femenino en comunidad',
    description:
      'Encuentra dónde jugar, descubre eventos deportivos y organiza tus propias fechas con Peloteras.',
    images: ['/assets/images/peloteras-hero.png'],
  },
};

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${siteUrl}/#organization`,
      name: 'Peloteras',
      url: siteUrl,
      logo: `${siteUrl}/assets/logo.png`,
      description:
        'Plataforma para mujeres y diversidades que quieren jugar fútbol, encontrar eventos y organizar pichangas.',
    },
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      url: siteUrl,
      name: 'Peloteras',
      description:
        'Encuentra eventos de fútbol femenino, únete a la comunidad y organiza tus propios encuentros con Peloteras.',
      inLanguage: 'es-PE',
      publisher: {
        '@id': `${siteUrl}/#organization`,
      },
    },
  ],
};

export default async function Index() {
  await enforceOnboardingGuard();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <MainSection />
      <WhatIsPeloterasSection />
      <section
        className="mx-auto w-full max-w-[1600px] px-5 py-8 sm:px-8 md:py-10 lg:px-10"
        id="eventos-destacados"
      >
        <div className="w-full">
          <CardEventList />
        </div>
      </section>
      <section className="mx-auto w-full max-w-[1600px] px-5 pb-8 sm:px-8 md:pb-12 lg:px-10">
        <LandingGrowthBlocks />
      </section>
    </>
  );
}
