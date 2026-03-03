import EventExplorerClient from '@modules/events/ui/explorer/EventExplorerClient';
import { getEventCatalogs } from '@modules/events/api/queries/getEventCatalogs';
import { getEventsExplorer } from '@modules/events/api/queries/getEventsExplorer';

export default async function EventsPage() {
  const [events, catalogs] = await Promise.all([getEventsExplorer(), getEventCatalogs()]);

  return <EventExplorerClient initialEvents={events} initialCatalogs={catalogs} />;
}
