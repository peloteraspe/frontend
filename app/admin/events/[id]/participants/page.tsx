import EventParticipantsScreen from '@modules/admin/ui/events/screens/EventParticipantsScreen';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EventParticipantsScreen id={id} />;
}
