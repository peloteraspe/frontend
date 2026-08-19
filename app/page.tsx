import type { Metadata } from 'next';
import CardEventList from '@modules/events/ui/cardEvents/CardEventList';
import HomeAlliesSection from '@modules/home/ui/HomeAlliesSection';
import LandingGrowthBlocks from '@modules/home/ui/LandingGrowthBlocks';
import HomeReveal from '@modules/home/ui/HomeReveal';
import HomeHowItWorksSection from '@modules/home/ui/HomeHowItWorksSection';
import MainSection from '@modules/home/ui/MainSection';
import { homeAllies } from '@modules/home/ui/homeContent';
import { SITE_URL } from '@shared/lib/site';

const siteUrl = SITE_URL;

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

        <section className="home-scroll-target w-full" id="eventos-destacados">
          <HomeReveal className="site-shell">
            <CardEventList previewCount={3} />
          </HomeReveal>
        </section>

        <HomeHowItWorksSection />

        <LandingGrowthBlocks />

        <HomeAlliesSection allies={homeAllies} />
      </div>
    </>
  );
}
