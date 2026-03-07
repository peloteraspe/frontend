import PaymentsAdminPage from '@modules/admin/ui/payments/PaymentsAdminPage';

type PageSearchParams = { state?: string; q?: string };

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Page({
  searchParams,
}: {
  searchParams?: PageSearchParams | Promise<PageSearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  return <PaymentsAdminPage searchParams={resolvedSearchParams} />;
}
