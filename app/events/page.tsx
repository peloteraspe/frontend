import type { Metadata } from 'next';
import EventExplorerClient from '@modules/events/ui/explorer/EventExplorerClient';
import { getEventCatalogs } from '@modules/events/api/queries/getEventCatalogs';
import { getEventsExplorer } from '@modules/events/api/queries/getEventsExplorer';

const title = 'Pichangas de fútbol femenino en Lima | Peloteras';
const description =
  'Encuentra pichangas y eventos de fútbol femenino en Lima. Revisa fechas, sedes, niveles, precios y cupos para volver a la cancha.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/events' },
  openGraph: {
    title,
    description,
    url: '/events',
    images: [
      {
        url: '/assets/logo.png',
        width: 512,
        height: 512,
        alt: 'Peloteras',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['/assets/logo.png'],
  },
};

export default async function EventsPage() {
  const [events, catalogs] = await Promise.all([getEventsExplorer(), getEventCatalogs()]);

  return <EventExplorerClient initialEvents={events} initialCatalogs={catalogs} />;
}
