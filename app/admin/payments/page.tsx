import PaymentsAdminPage from '@modules/admin/ui/payments/PaymentsAdminPage';

export default async function Page({
  searchParams,
}: {
  searchParams?: { state?: string; q?: string };
}) {
  return <PaymentsAdminPage searchParams={searchParams} />;
}
