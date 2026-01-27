// app/payments/[id]/page.tsx
import PaymentPage from '@modules/payments/ui/screens/PaymentPage';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <PaymentPage id={id} />;
}
