import { EventForm } from '@/components/DynamicComponents';
import { createEvent } from '../_actions';

export default function NewEventPage() {
  async function handleCreate(fd: FormData) {
    'use server';
    const input = {
      title: String(fd.get('title') || ''),
      price: Number(fd.get('price') || 0),
      date: String(fd.get('date') || ''),
      capacity: Number(fd.get('capacity') || 0),
      locationText: String(fd.get('locationText') || ''),
    };
    await createEvent(input);
  }

  return (
    <div className="bg-white rounded-md shadow p-4">
      <h2 className="text-lg font-semibold text-mulberry mb-4">Crear evento</h2>
      <EventForm submitLabel="Crear" onSubmit={handleCreate} />
    </div>
  );
}
