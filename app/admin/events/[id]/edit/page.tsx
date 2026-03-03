import EditEventScreen from '@modules/admin/ui/events/screens/EditEventScreen';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditEventScreen id={id} />;
}
