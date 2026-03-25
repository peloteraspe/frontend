import NewEventScreen from '@modules/admin/ui/events/screens/NewEventScreen';

type PageSearchParams = {
  templateId?: string;
};

export default async function Page({
  searchParams,
}: {
  searchParams?: PageSearchParams | Promise<PageSearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  return <NewEventScreen templateId={resolvedSearchParams?.templateId} />;
}
