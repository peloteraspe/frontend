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
    'Peloteras conecta a mujeres y diversidades que quieren jugar fútbol, sumarse a más pichangas y abrir más espacios para estar en cancha.',
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
      'Encuentra dónde jugar, súmate a más pichangas y abre más espacios para estar en cancha con Peloteras.',
    url: siteUrl,
    images: [
      {
        url: '/assets/logo.png',
        width: 512,
        height: 512,
        alt: 'Logo de Peloteras',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Peloteras | Pichangas, eventos y fútbol femenino en comunidad',
    description:
      'Encuentra dónde jugar, súmate a más pichangas y abre más espacios para estar en cancha con Peloteras.',
    images: ['/assets/logo.png'],
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
        'Comunidad para mujeres y diversidades que quieren jugar fútbol, encontrar más pichangas y abrir más espacios para estar en cancha.',
    },
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      url: siteUrl,
      name: 'Peloteras',
      description:
        'Encuentra dónde jugar, únete a la comunidad y abre más espacios para estar en cancha con Peloteras.',
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
      <div className="flex w-full flex-col gap-8 pb-8 sm:gap-10 sm:pb-10 lg:gap-12 lg:pb-12">
        <MainSection />

        {homeAllies.length > 0 && (
          <section className="home-scroll-target w-full" id="aliadxs">
            <HomeReveal className="site-shell">
              <div className="flex flex-col gap-4 sm:gap-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-mulberry/70">
                      Aliadxs que impulsan esta comunidad
                    </p>
                    <p className="max-w-xl text-base leading-7 text-slate-600">
                      Marcas y organizaciones que acompañan el crecimiento de Peloteras.
                    </p>
                  </div>
                  <Link
                    href="/patrocinios"
                    className="home-button-micro inline-flex w-fit rounded-full px-5 py-2.5 text-sm font-semibold text-mulberry hover:bg-mulberry/5"
                  >
                    ¿Tu marca quiere sumarse?
                  </Link>
                </div>
                <AlliesCarouselEntry allies={homeAllies} />
              </div>
            </HomeReveal>
          </section>
        )}

        <section className="home-scroll-target w-full" id="eventos-destacados">
          <HomeReveal className="site-shell">
            <CardEventList />
          </HomeReveal>
        </section>

        <LandingGrowthBlocks />
      </div>
    </>
  );
}
