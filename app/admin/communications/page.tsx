import GlobalEventAnnouncementHistoryPage from '@modules/admin/ui/events/GlobalEventAnnouncementHistoryPage';

type PageSearchParams = {
  cursor?: string | string[];
  history?: string | string[];
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Page({
  searchParams,
}: {
  searchParams?: PageSearchParams | Promise<PageSearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  return <GlobalEventAnnouncementHistoryPage searchParams={resolvedSearchParams} />;
}
