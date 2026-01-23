import { notFound } from 'next/navigation';
import { getEventDetails } from '../../api/queries/getEventDetails';
import EventDetailsClient from './EventDetailsClient';

type Props = {
  id: string;
};

export default async function EventDetailsPage({ id }: Props) {
  const eventDetails = await getEventDetails(id);

  if (!eventDetails) {
    notFound();
  }

  return <EventDetailsClient data={eventDetails} />;
}
