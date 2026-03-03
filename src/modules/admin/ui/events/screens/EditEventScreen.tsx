import { getEventById } from '@shared/lib/data/getEventById';
import EventFormComponent from '@modules/admin/ui/events/EventFormComponent';
import { deleteEvent, updateEvent } from '@modules/admin/api/events/_actions';
import { parseEventFormData } from '@modules/admin/model/eventForm';
import { redirect } from 'next/navigation';

export default async function EditEventScreen({ id }: { id: string }) {
  const event = await getEventById(id);
  if (!event) redirect('/admin/events');

  async function handleUpdate(fd: FormData) {
    'use server';
    await updateEvent(id, parseEventFormData(fd));
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
          description:
            typeof event.description === 'object' ? event.description?.description : event.description,
          startTime: event.start_time?.slice?.(0, 16),
          endTime: event.end_time?.slice?.(0, 16),
          price: event.price,
          minUsers: event.min_users,
          maxUsers: event.max_users,
          district: event.district,
          locationText: event.location_text,
          lat: event.location?.lat,
          lng: event.location?.lng ?? event.location?.long,
          eventTypeId: event.EventType,
          levelId: event.level,
        }}
      />
    </div>
  );
}
