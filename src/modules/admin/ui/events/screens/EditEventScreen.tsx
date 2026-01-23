import { getEventById } from '@shared/lib/data/getEventById';
import EventFormComponent from '@modules/admin/ui/events/EventFormComponent';
import { deleteEvent, updateEvent } from '@modules/admin/api/events/_actions';
import { redirect } from 'next/navigation';

export default async function EditEventScreen({ id }: { id: string }) {
  const event = await getEventById(id);
  if (!event) redirect('/admin/events');

  async function handleUpdate(fd: FormData) {
    'use server';
    const input = {
      title: String(fd.get('title') || ''),
      price: Number(fd.get('price') || 0),
      date: String(fd.get('date') || ''),
      capacity: Number(fd.get('capacity') || 0),
      locationText: String(fd.get('locationText') || ''),
    };
    await updateEvent(id, input);
  }

  async function handleDelete() {
    'use server';
    await deleteEvent(id);
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

      <EventFormComponent
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
