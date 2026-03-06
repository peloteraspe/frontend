import { parseEventFormData } from '@modules/admin/model/eventForm';
import { createEvent } from '@modules/admin/api/events/_actions';
import EventFormComponent from '@modules/admin/ui/events/EventFormComponent';
import { getServerSupabase } from '@core/api/supabase.server';
import { isSuperAdmin } from '@shared/lib/auth/isAdmin';

export default async function NewEventScreen() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const canManageFeatured = isSuperAdmin(user as any);

  async function handleCreate(fd: FormData) {
    'use server';
    await createEvent(parseEventFormData(fd));
  }

  return (
    <div className="bg-white rounded-md shadow p-4">
      <h2 className="text-lg font-semibold text-mulberry mb-4">Crear evento</h2>
      <EventFormComponent
        submitLabel="Crear"
        onSubmit={handleCreate}
        canManageFeatured={canManageFeatured}
      />
    </div>
  );
}
