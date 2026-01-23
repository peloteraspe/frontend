import EditEventScreen from '@modules/admin/ui/events/screens/EditEventScreen';

export default function Page({ params }: { params: { id: string } }) {
  return <EditEventScreen id={params.id} />;
}
