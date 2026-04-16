import type { Metadata } from 'next';
import Link from 'next/link';
import CardEventList from '@modules/events/ui/cardEvents/CardEventList';
import AlliesCarouselEntry from '@modules/home/ui/AlliesCarouselEntry';
import LandingGrowthBlocks from '@modules/home/ui/LandingGrowthBlocks';
import HomeReveal from '@modules/home/ui/HomeReveal';
import MainSection from '@modules/home/ui/MainSection';
import { homeAllies } from '@modules/home/ui/homeContent';

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
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <MainSection />

      {homeAllies.length > 0 && (
        <section className="home-scroll-target w-full border-t border-slate-100 bg-white" id="aliadxs">
          <HomeReveal className="mx-auto w-full max-w-[1600px] px-5 py-10 sm:px-8 lg:px-10">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Aliadxs
              </p>
              <Link
                href="/patrocinios"
                className="home-button-micro rounded-full px-3 py-2 text-xs font-semibold text-mulberry hover:bg-mulberry/5"
              >
                ¿Tu marca quiere sumarse?
              </Link>
            </div>
            <AlliesCarouselEntry allies={homeAllies} />
          </HomeReveal>
        </section>
      )}

      <section
        className="home-scroll-target mx-auto w-full max-w-[1600px] px-5 py-8 sm:px-8 md:py-10 lg:px-10"
        id="eventos-destacados"
      >
        <HomeReveal className="w-full">
          <CardEventList />
        </HomeReveal>
      </section>
      <div className="w-full">
        <LandingGrowthBlocks />
      </div>
    </>
  );
}
