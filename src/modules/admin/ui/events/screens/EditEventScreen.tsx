import { getEventById } from '@shared/lib/data/getEventById';
import EventFormComponent from '@modules/admin/ui/events/EventFormComponent';
import { deleteEvent, updateEvent } from '@modules/admin/api/events/_actions';
import { parseEventFormData } from '@modules/admin/model/eventForm';
import { redirect } from 'next/navigation';
import { getServerSupabase } from '@core/api/supabase.server';
import { isSuperAdmin } from '@shared/lib/auth/isAdmin';
import { getEventCatalogs } from '@modules/events/api/queries/getEventCatalogs';
import { toDateTimeLocalInTimeZone } from '@shared/lib/dateTime';

export default async function EditEventScreen({ id }: { id: string }) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const canManageFeatured = isSuperAdmin(user as any);

  const event = await getEventById(id);
  if (!event) redirect('/admin/events');
  const [catalogs, featuresRes, eventFeaturesRes, paymentMethodsRes, eventPaymentMethodsRes] =
    await Promise.all([
      getEventCatalogs(),
      supabase.from('features').select('id,name').order('name', { ascending: true }),
      supabase.from('eventFeatures').select('feature').eq('event', id),
      supabase
        .from('paymentMethod')
        .select('id,name,type,number,is_active')
        .eq('created_by', user?.id || '')
        .order('is_active', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase.from('eventPaymentMethod').select('paymentMethod').eq('event', id),
    ]);

  if (featuresRes.error) throw new Error(featuresRes.error.message);
  if (eventFeaturesRes.error) throw new Error(eventFeaturesRes.error.message);
  if (paymentMethodsRes.error) throw new Error(paymentMethodsRes.error.message);
  if (eventPaymentMethodsRes.error) throw new Error(eventPaymentMethodsRes.error.message);

  const features = (featuresRes.data ?? [])
    .map((feature) => ({
      id: Number(feature.id),
      name: String(feature.name || '').trim(),
    }))
    .filter((feature) => Number.isInteger(feature.id) && feature.id > 0 && feature.name.length > 0);

  const selectedFeatureIds = Array.from(
    new Set(
      (eventFeaturesRes.data ?? [])
        .map((row) => Number(row.feature))
        .filter((value) => Number.isInteger(value) && value > 0)
    )
  );

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

  const availablePaymentMethodIds = new Set(paymentMethods.map((method) => method.id));

  const selectedPaymentMethodIds = Array.from(
    new Set(
      (eventPaymentMethodsRes.data ?? [])
        .map((row) => Number(row.paymentMethod))
        .filter((value) => Number.isInteger(value) && value > 0 && availablePaymentMethodIds.has(value))
    )
  );

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
        eventTypes={catalogs.eventTypes}
        levels={catalogs.levels}
        features={features}
        paymentMethods={paymentMethods}
        initial={{
          title: event.title,
          description:
            typeof event.description === 'object' ? event.description?.description : event.description,
          startTime: toDateTimeLocalInTimeZone(event.start_time),
          endTime: toDateTimeLocalInTimeZone(event.end_time),
          price: event.price,
          minUsers: event.min_users,
          maxUsers: event.max_users,
          district: event.district,
          locationText: event.location_text,
          lat: event.location?.lat,
          lng: event.location?.lng ?? event.location?.long,
          eventTypeId: event.EventType,
          levelId: event.level,
          featureIds: selectedFeatureIds,
          paymentMethodIds: selectedPaymentMethodIds,
          isFeatured: Boolean(event.is_featured),
        }}
        canManageFeatured={canManageFeatured}
      />
    </div>
  );
}
