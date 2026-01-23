import TicketsPage from '@modules/tickets/ui/TicketsPage';

export default function Page({ params }: { params: { userId: string } }) {
  return <TicketsPage userId={params.userId} />;
}
