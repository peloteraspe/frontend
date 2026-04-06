import PaymentMethodsAdminPage from '@modules/admin/ui/paymentMethods/PaymentMethodsAdminPage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageSearchParams = {
  returnTo?: string;
};

function sanitizeReturnTo(value: string | undefined) {
  const normalized = String(value || '').trim();
  if (!normalized.startsWith('/')) return '';
  if (normalized.startsWith('//')) return '';
  return normalized;
}

export default async function Page({
  searchParams,
}: {
  searchParams?: PageSearchParams | Promise<PageSearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  return <PaymentMethodsAdminPage returnTo={sanitizeReturnTo(resolvedSearchParams?.returnTo)} />;
}
