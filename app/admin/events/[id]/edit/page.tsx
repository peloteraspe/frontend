import EventDetailsPage from '@modules/events/ui/eventDetails/EventDetailsPage';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6">
      <EventDetailsPage id={id} />
    </section>
  );
}
