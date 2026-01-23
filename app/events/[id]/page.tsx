import EventDetailsPage from '@modules/events/ui/eventDetails/EventDetailsPage';

type Props = { params: { id: string } };

export default async function Page({ params }: Props) {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6">
      <EventDetailsPage id={params.id} />
    </section>
  );
}
