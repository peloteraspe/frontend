import { parseEventFormData } from '@modules/admin/model/eventForm';
import { createEvent } from '@modules/admin/api/events/_actions';
import EventFormComponent from '@modules/admin/ui/events/EventFormComponent';
import { getServerSupabase } from '@core/api/supabase.server';
import { isSuperAdmin } from '@shared/lib/auth/isAdmin';
import { getEventCatalogs } from '@modules/events/api/queries/getEventCatalogs';
import { getEventById } from '@shared/lib/data/getEventById';
import { toDateTimeLocalInTimeZone } from '@shared/lib/dateTime';

type Props = {
  templateId?: string;
};

export default async function NewEventScreen({ templateId }: Props) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const canManageFeatured = isSuperAdmin(user as any);
  const normalizedTemplateId = String(templateId || '').trim();
  const [catalogs, featuresRes, paymentMethodsRes] = await Promise.all([
    getEventCatalogs(),
    supabase.from('features').select('id,name').order('name', { ascending: true }),
    supabase
      .from('paymentMethod')
      .select('id,name,type,number,is_active')
      .eq('is_active', true)
      .eq('created_by', user?.id || '')
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

  let templateInitial:
    | {
        title: string;
        description: string;
        startTime: string;
        endTime: string;
        price: number;
        minUsers: number;
        maxUsers: number;
        district: string;
        locationText: string;
        lat: number | undefined;
        lng: number | undefined;
        eventTypeId: number;
        levelId: number;
        featureIds: number[];
        paymentMethodIds: number[];
        isPublished: boolean;
        isFeatured: boolean;
      }
    | null = null;
  let templateTitle = '';

  if (normalizedTemplateId) {
    const templateEvent = await getEventById(normalizedTemplateId);
    const canUseTemplate =
      templateEvent &&
      (canManageFeatured || String(templateEvent.created_by_id || '') === String(user?.id || ''));

    if (canUseTemplate) {
      const [eventFeaturesRes, eventPaymentMethodsRes] = await Promise.all([
        supabase.from('eventFeatures').select('feature').eq('event', normalizedTemplateId),
        supabase.from('eventPaymentMethod').select('paymentMethod').eq('event', normalizedTemplateId),
      ]);

      if (eventFeaturesRes.error) {
        throw new Error(eventFeaturesRes.error.message);
      }

      if (eventPaymentMethodsRes.error) {
        throw new Error(eventPaymentMethodsRes.error.message);
      }

      const selectedFeatureIds = Array.from(
        new Set(
          (eventFeaturesRes.data ?? [])
            .map((row) => Number(row.feature))
            .filter((value) => Number.isInteger(value) && value > 0)
        )
      );
      const availablePaymentMethodIds = new Set(paymentMethods.map((method) => method.id));
      const selectedPaymentMethodIds = Array.from(
        new Set(
          (eventPaymentMethodsRes.data ?? [])
            .map((row) => Number(row.paymentMethod))
            .filter((value) => Number.isInteger(value) && value > 0 && availablePaymentMethodIds.has(value))
        )
      );

      templateTitle = String(templateEvent.title || 'Evento').trim() || 'Evento';
      templateInitial = {
        title: String(templateEvent.title || ''),
        description:
          typeof templateEvent.description === 'object'
            ? String(templateEvent.description?.description || '')
            : String(templateEvent.description || ''),
        startTime: toDateTimeLocalInTimeZone(templateEvent.start_time),
        endTime: toDateTimeLocalInTimeZone(templateEvent.end_time),
        price: Number(templateEvent.price || 0),
        minUsers: Number(templateEvent.min_users || 0),
        maxUsers: Number(templateEvent.max_users || 0),
        district: String(templateEvent.district || ''),
        locationText: String(templateEvent.location_text || ''),
        lat: templateEvent.location?.lat,
        lng: templateEvent.location?.lng ?? templateEvent.location?.long,
        eventTypeId: Number(templateEvent.EventType || selectableEventTypes[0]?.id || 1),
        levelId: Number(templateEvent.level || catalogs.levels[0]?.id || 1),
        featureIds: selectedFeatureIds,
        paymentMethodIds: selectedPaymentMethodIds,
        isPublished: templateEvent.is_published !== false,
        isFeatured: Boolean(templateEvent.is_featured),
      };
    }
  }

  async function handleCreate(fd: FormData) {
    'use server';
    try {
      const created = await createEvent(parseEventFormData(fd));
      return { eventId: created.id };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'No se pudo crear el evento.',
      };
    }
  }

  return (
    <div className="bg-white rounded-md shadow p-4">
      <h2 className="text-lg font-semibold text-mulberry mb-4">
        {templateInitial ? 'Crear evento desde plantilla' : 'Crear evento'}
      </h2>
      {templateInitial ? (
        <div className="mb-4 rounded-xl border border-mulberry/20 bg-mulberry/5 px-4 py-3 text-sm text-slate-700">
          Usando como plantilla: <strong>{templateTitle}</strong>. Ajusta lo necesario antes de crear el nuevo
          evento.
        </div>
      ) : null}
      <EventFormComponent
        submitLabel="Crear"
        onSubmit={handleCreate}
        eventTypes={selectableEventTypes}
        levels={catalogs.levels}
        features={features}
        paymentMethods={paymentMethods}
        initial={{
          featureIds: [],
          paymentMethodIds: [],
          eventTypeId: selectableEventTypes[0]?.id ?? 1,
          levelId: catalogs.levels[0]?.id ?? 1,
          isPublished: true,
          ...templateInitial,
        }}
        canManageFeatured={canManageFeatured}
        successRedirectTo="/admin/events"
      />
    </div>
  );
}
