import { parseEventFormData } from '@modules/admin/model/eventForm';
import { createEvent } from '@modules/admin/api/events/_actions';
import EventFormComponent from '@modules/admin/ui/events/EventFormComponent';
import { getServerSupabase } from '@core/api/supabase.server';
import { isSuperAdmin } from '@shared/lib/auth/isAdmin';
import { getEventCatalogs } from '@modules/events/api/queries/getEventCatalogs';

export default async function NewEventScreen() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const canManageFeatured = isSuperAdmin(user as any);
  const catalogs = await getEventCatalogs();
  const eventTypes =
    catalogs.eventTypes.filter((option) => option.name.trim().toLowerCase() === 'pichanga libre') ||
    [];
  const selectableEventTypes =
    eventTypes.length > 0 ? eventTypes : catalogs.eventTypes.length > 0 ? [catalogs.eventTypes[0]] : [];

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
        eventTypes={selectableEventTypes}
        levels={catalogs.levels}
        initial={{
          eventTypeId: selectableEventTypes[0]?.id ?? 1,
          levelId: catalogs.levels[0]?.id ?? 1,
        }}
        canManageFeatured={canManageFeatured}
      />
    </div>
  );
}
