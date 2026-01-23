import { notFound } from 'next/navigation';
import TicketsView from './TicketsView';
import { getUserTickets } from '../api/queries/getUserTickets';
import { splitTicketsByDate } from './splitTickets';

export default async function TicketsPage({ userId }: { userId: string }) {
  const events = await getUserTickets(userId).catch(() => null);
  if (!events) notFound();

  const { upcoming, past } = splitTicketsByDate(events);

  return <TicketsView upcoming={upcoming} past={past} />;
}
