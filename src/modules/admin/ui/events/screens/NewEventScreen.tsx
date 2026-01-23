import { parseEventFormData } from '@modules/admin/model/eventForm';
import { createEvent } from '@modules/admin/api/events/_actions';
import EventFormComponent from '@modules/admin/ui/events/EventFormComponent';

export default function NewEventScreen() {
  async function handleCreate(fd: FormData) {
    'use server';
    await createEvent(parseEventFormData(fd));
  }

  return (
    <div className="bg-white rounded-md shadow p-4">
      <h2 className="text-lg font-semibold text-mulberry mb-4">Crear evento</h2>
      <EventFormComponent submitLabel="Crear" onSubmit={handleCreate} />
    </div>
  );
}
