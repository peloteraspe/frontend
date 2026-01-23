import PaymentPage from '@modules/payments/ui/screens/PaymentPage';

export default function Page({ params }: { params: { id: string } }) {
  return <PaymentPage id={params.id} />;
}
