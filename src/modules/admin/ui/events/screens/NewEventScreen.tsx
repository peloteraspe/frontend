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
  const [catalogs, featuresRes, paymentMethodsRes] = await Promise.all([
    getEventCatalogs(),
    supabase.from('features').select('id,name').order('name', { ascending: true }),
    supabase
      .from('paymentMethod')
      .select('id,name,type,number,is_active')
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
  ]);

  if (featuresRes.error) {
    throw new Error(featuresRes.error.message);
  }

  if (paymentMethodsRes.error) {
    throw new Error(paymentMethodsRes.error.message);
  }

  const features = (featuresRes.data ?? [])
    .map((feature) => ({
      id: Number(feature.id),
      name: String(feature.name || '').trim(),
    }))
    .filter((feature) => Number.isInteger(feature.id) && feature.id > 0 && feature.name.length > 0);

  const paymentMethods = (paymentMethodsRes.data ?? [])
    .map((method) => ({
      id: Number(method.id),
      name: String(method.name || '').trim() || `Método #${method.id}`,
      type: String(method.type || 'yape')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace('/', '_'),
      number: method.number === null || method.number === undefined ? null : Number(method.number),
      isActive: method.is_active !== false,
    }))
    .filter((method) => Number.isInteger(method.id) && method.id > 0);

  const eventTypes =
    catalogs.eventTypes.filter((option) => option.name.trim().toLowerCase() === 'pichanga libre') ||
    [];
  const selectableEventTypes =
    eventTypes.length > 0 ? eventTypes : catalogs.eventTypes.length > 0 ? [catalogs.eventTypes[0]] : [];

  async function handleCreate(fd: FormData) {
    'use server';
    const created = await createEvent(parseEventFormData(fd));
    return { eventId: created.id };
  }

  return (
    <div className="bg-white rounded-md shadow p-4">
      <h2 className="text-lg font-semibold text-mulberry mb-4">Crear evento</h2>
      <EventFormComponent
        submitLabel="Crear"
        onSubmit={handleCreate}
        eventTypes={selectableEventTypes}
        levels={catalogs.levels}
        features={features}
        paymentMethods={paymentMethods}
        initial={{
          eventTypeId: selectableEventTypes[0]?.id ?? 1,
          levelId: catalogs.levels[0]?.id ?? 1,
          featureIds: [],
          paymentMethodIds: [],
        }}
        canManageFeatured={canManageFeatured}
        successRedirectTo="/admin/events"
      />
    </div>
  );
}
