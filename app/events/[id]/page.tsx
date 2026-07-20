// app/events/[id]/page.tsx
import type { Metadata } from 'next';
import EventDetailsPage from '@modules/events/ui/eventDetails/EventDetailsPage';
import {
  getPublicEventSeoById,
  type PublicEventSeo,
} from '@modules/events/api/queries/getPublicEventSeo';
import { getAbsoluteUrl } from '@shared/lib/site';

type Props = {
  params: Promise<{ id: string }>;
};

function cleanText(value: string) {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function truncateAtWord(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;

  const candidate = value.slice(0, maxLength - 1);
  const lastSpace = candidate.lastIndexOf(' ');
  const safeCandidate =
    lastSpace >= Math.floor(maxLength * 0.65) ? candidate.slice(0, lastSpace) : candidate;
  return `${safeCandidate.trim()}…`;
}

function getEventDescription(event: PublicEventSeo) {
  const description = cleanText(event.description);
  if (description) {
    const locationSuffix =
      event.district && !description.toLowerCase().includes(event.district.toLowerCase())
        ? ` En ${event.district}.`
        : '';
    return truncateAtWord(`${description}${locationSuffix}`, 158);
  }

  const location = event.district ? ` en ${event.district}` : '';
  return truncateAtWord(
    `Súmate a ${event.title}${location}. Revisa la fecha, ubicación, precio y cupos disponibles en Peloteras.`,
    158
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const event = await getPublicEventSeoById(id);

  if (!event) {
    return {
      title: 'Evento no encontrado | Peloteras',
      robots: { index: false, follow: false },
    };
  }

  const pageTitle = `${truncateAtWord(cleanText(event.title), 48)} | Peloteras`;
  const description = getEventDescription(event);
  const canonicalPath = `/events/${encodeURIComponent(event.id)}`;

  return {
    title: pageTitle,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      type: 'website',
      title: pageTitle,
      description,
      url: canonicalPath,
      images: [
        {
          url: '/assets/logo.png',
          width: 512,
          height: 512,
          alt: `Peloteras: ${event.title}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description,
      images: ['/assets/logo.png'],
    },
  };
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  const event = await getPublicEventSeoById(id);
  const canonicalUrl = event
    ? getAbsoluteUrl(`/events/${encodeURIComponent(event.id)}`)
    : getAbsoluteUrl(`/events/${encodeURIComponent(id)}`);
  const description = event ? getEventDescription(event) : '';
  const jsonLd = event
    ? {
        '@context': 'https://schema.org',
        '@type': 'SportsEvent',
        name: event.title,
        description,
        url: canonicalUrl,
        image: getAbsoluteUrl('/assets/logo.png'),
        startDate: event.startTime || undefined,
        endDate: event.endTime || undefined,
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        eventStatus: 'https://schema.org/EventScheduled',
        location:
          event.locationText || event.district
            ? {
                '@type': 'Place',
                name: event.locationText || event.district,
                address: {
                  '@type': 'PostalAddress',
                  addressLocality: event.district || undefined,
                  addressCountry: 'PE',
                },
              }
            : undefined,
        offers:
          event.price !== null
            ? {
                '@type': 'Offer',
                url: canonicalUrl,
                price: event.price,
                priceCurrency: 'PEN',
              }
            : undefined,
        isAccessibleForFree: event.price === 0,
        organizer: {
          '@type': 'Organization',
          name: 'Peloteras',
          url: getAbsoluteUrl('/'),
        },
      }
    : null;

  return (
    <>
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
        />
      ) : null}
      <section className="site-shell">
        <EventDetailsPage id={id} />
      </section>
    </>
  );
}
