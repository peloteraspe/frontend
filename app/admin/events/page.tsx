import EventsAdminPage from '@modules/admin/ui/events/EventsAdminPage';

type PageSearchParams = {
  dateOrder?: string;
};

export default async function Page({
  searchParams,
}: {
  searchParams?: PageSearchParams | Promise<PageSearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  return <EventsAdminPage searchParams={resolvedSearchParams} />;
}
