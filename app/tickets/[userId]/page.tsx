import TicketsPage from '@modules/tickets/ui/TicketsPage';

type Props = {
  params: Promise<{ userId: string }>;
};

export default async function Page({ params }: Props) {
  const { userId } = await params;
  return <TicketsPage userId={userId} />;
}
