import { getEventById } from '@/lib/data/getEventById';
import EventForm from '../../_components/EventForm';
import { deleteEvent, updateEvent } from '../../_actions';
import { redirect } from 'next/navigation';

export default async function EditEventPage({ params }: { params: { id: string } }) {
  const event = await getEventById(params.id);
  if (!event) {
    redirect('/admin/events');
  }

  async function handleUpdate(fd: FormData) {
    'use server';
    const input = {
      title: String(fd.get('title') || ''),
      price: Number(fd.get('price') || 0),
      date: String(fd.get('date') || ''),
      capacity: Number(fd.get('capacity') || 0),
      locationText: String(fd.get('locationText') || ''),
    };
    await updateEvent(params.id, input);
  }

  async function handleDelete() {
    'use server';
    await deleteEvent(params.id);
    redirect('/admin/events');
  }

  return (
    <div className="bg-white rounded-md shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-mulberry">Editar evento</h2>
        <form action={handleDelete}>
          <button className="px-3 py-1 rounded bg-red-600 text-white">Eliminar</button>
        </form>
      </div>
      <EventForm
        submitLabel="Guardar"
        onSubmit={handleUpdate}
        initial={{
          title: event.title,
          price: event.price,
          date: event.formattedDateTime,
          capacity: event.capacity,
          locationText: event.locationText,
        }}
      />
    </div>
  );
}
