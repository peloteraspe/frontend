// app/events/[id]/page.tsx
import EventDetailsPage from '@modules/events/ui/eventDetails/EventDetailsPage';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;

  return (
    <section className="site-shell">
      <EventDetailsPage id={id} />
    </section>
  );
}
