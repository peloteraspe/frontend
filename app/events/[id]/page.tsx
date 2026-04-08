// app/events/[id]/page.tsx
import EventDetailsPage from '@modules/events/ui/eventDetails/EventDetailsPage';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
      <EventDetailsPage id={id} />
    </section>
  );
}
