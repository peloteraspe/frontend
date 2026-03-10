import CommunicationsAdminPage from '@modules/admin/ui/communications/CommunicationsAdminPage';

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
  return <CommunicationsAdminPage searchParams={resolvedSearchParams} />;
}
