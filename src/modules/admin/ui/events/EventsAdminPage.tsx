import { getEvents } from '@shared/lib/data/getEvents';
import Link from 'next/link';
import { getServerSupabase } from '@core/api/supabase.server';
import { isSuperAdmin } from '@shared/lib/auth/isAdmin';
import { setEventFeatured, setEventPublished } from '@modules/admin/api/events/_actions';
import { getAllUserEmailsForBroadcast } from '@modules/admin/api/users/services/adminUsers.service';
import EventQuickActionsMenu from '@modules/admin/ui/events/EventQuickActionsMenu';
import { getApprovedParticipantsCountByEventIds } from '@modules/admin/api/events/services/eventParticipants.service';
import { getEventPublishReadiness, parseStoredBoolean } from '@modules/admin/model/eventPublishReadiness';

type Props = {
  searchParams?: {
    dateOrder?: string;
  };
};

const DEFAULT_TIMEZONE = 'America/Lima';

function parseDate(value: unknown) {
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isSameCalendarDate(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDateRange(startRaw: unknown, endRaw: unknown) {
  const start = parseDate(startRaw);
  if (!start) return '-';

  const end = parseDate(endRaw);
  const dateFormatter = new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: DEFAULT_TIMEZONE,
  });

  if (!end || isSameCalendarDate(start, end)) {
    return dateFormatter.format(start);
  }

  return `${dateFormatter.format(start)} - ${dateFormatter.format(end)}`;
}

function formatTimeRange(startRaw: unknown, endRaw: unknown) {
  const start = parseDate(startRaw);
  if (!start) return '-';

  const end = parseDate(endRaw);
  const timeFormatter = new Intl.DateTimeFormat('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: DEFAULT_TIMEZONE,
  });
  const dateTimeFormatter = new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: DEFAULT_TIMEZONE,
  });

  if (!end) {
    return `${timeFormatter.format(start)} - --:--`;
  }

  if (isSameCalendarDate(start, end)) {
    return `${timeFormatter.format(start)} - ${timeFormatter.format(end)}`;
  }

  return `${dateTimeFormatter.format(start)} - ${dateTimeFormatter.format(end)}`;
}

export default async function AdminEventsPage({ searchParams }: Props) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isUserSuperAdmin = isSuperAdmin(user as any);
  const canManageFeatured = isUserSuperAdmin;
  const dateOrder = searchParams?.dateOrder === 'desc' ? 'desc' : 'asc';
  const nextDateOrder = dateOrder === 'asc' ? 'desc' : 'asc';

  async function handleToggleFeatured(formData: FormData) {
    'use server';
    const id = String(formData.get('id') || '');
    const isFeatured = String(formData.get('isFeatured') || '') === 'true';
    await setEventFeatured(id, isFeatured);
  }

  async function handleTogglePublished(formData: FormData) {
    'use server';
    const id = String(formData.get('id') || '');
    const isPublished = String(formData.get('isPublished') || '') === 'true';
    await setEventPublished(id, isPublished);
  }

  const [events, promotionRecipientEmails] = await Promise.all([
    getEvents({ dateOrder, createdById: isUserSuperAdmin ? '' : user?.id || '' }),
    isUserSuperAdmin ? getAllUserEmailsForBroadcast() : Promise.resolve([]),
  ]);
  const normalizedEvents = events ?? [];
  const promotionRecipientCount = promotionRecipientEmails.length;
  const eventIds = normalizedEvents.map((event: any) => event.id);
  const approvedParticipantsByEventId = await getApprovedParticipantsCountByEventIds(
    eventIds
  );
  const paymentMethodRows =
    eventIds.length > 0
      ? await supabase.from('eventPaymentMethod').select('event,paymentMethod').in('event', eventIds)
      : { data: [], error: null };

  if (paymentMethodRows.error) {
    throw new Error(paymentMethodRows.error.message);
  }

  const linkedPaymentMethodIds = Array.from(
    new Set(
      (paymentMethodRows.data ?? [])
        .map((row) => Number((row as { paymentMethod: number | string | null }).paymentMethod))
        .filter((value) => Number.isInteger(value) && value > 0)
    )
  );
  const activePaymentMethods =
    linkedPaymentMethodIds.length > 0
      ? await supabase
          .from('paymentMethod')
          .select('id')
          .in('id', linkedPaymentMethodIds)
          .eq('is_active', true)
      : { data: [], error: null };

  if (activePaymentMethods.error) {
    throw new Error(activePaymentMethods.error.message);
  }

  const activePaymentMethodIds = new Set(
    (activePaymentMethods.data ?? []).map((row) => Number((row as { id: number | string }).id))
  );
  const eventIdsWithPaymentMethods = new Set(
    (paymentMethodRows.data ?? [])
      .filter((row) =>
        activePaymentMethodIds.has(Number((row as { paymentMethod: number | string | null }).paymentMethod))
      )
      .map((row) => String((row as { event: string | number }).event))
  );

  function canPublishEvent(event: any) {
    const description =
      event?.description && typeof event.description === 'object'
        ? (event.description as Record<string, unknown>)
        : {};
    const location =
      event?.location && typeof event.location === 'object'
        ? (event.location as Record<string, unknown>)
        : {};

    return getEventPublishReadiness({
      title: event?.title,
      startTime: event?.start_time,
      endTime: event?.end_time,
      district: event?.district,
      locationText: event?.location_text,
      lat: location.lat,
      lng: location.lng ?? location.long,
      paymentMethodCount: eventIdsWithPaymentMethods.has(String(event?.id || '')) ? 1 : 0,
      isFieldReservedConfirmed: parseStoredBoolean(description.field_reserved_confirmed),
    }).isReady;
  }

  return (
    <div className="rounded-md bg-white shadow">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Título</th>
              <th className="px-4 py-2 text-left">
                <Link
                  href={{
                    pathname: '/admin/events',
                    query: { dateOrder: nextDateOrder },
                  }}
                  className="inline-flex items-center gap-1 font-semibold text-slate-700 transition hover:text-mulberry"
                  title={`Ordenar por fecha ${dateOrder === 'asc' ? 'descendente' : 'ascendente'}`}
                >
                  Fecha
                  <span aria-hidden="true">{dateOrder === 'asc' ? '↑' : '↓'}</span>
                </Link>
              </th>
              <th className="px-4 py-2 text-left">Hora</th>
              <th className="px-4 py-2 text-left">Publicado</th>
              <th className="px-4 py-2 text-left">Destacado</th>
              <th className="px-4 py-2 text-left">Precio</th>
              <th className="px-4 py-2 text-left">Cupos</th>
              <th className="px-4 py-2 text-left">Participantes</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {normalizedEvents.map((e: any) => {
              const approvedParticipants = approvedParticipantsByEventId.get(String(e.id)) ?? 0;
              const publishReady = canPublishEvent(e);
              return (
                <tr key={e.id} className="border-t">
                  <td className="px-4 py-2">{e.title}</td>
                  <td className="px-4 py-2">{formatDateRange(e.start_time, e.end_time)}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{formatTimeRange(e.start_time, e.end_time)}</td>
                  <td className="px-4 py-2">
                    {e.is_published || publishReady ? (
                      <form action={handleTogglePublished} className="inline-flex items-center gap-2">
                        <input type="hidden" name="id" value={e.id} />
                        <input type="hidden" name="isPublished" value={e.is_published ? 'false' : 'true'} />
                        <button
                          type="submit"
                          role="switch"
                          aria-checked={Boolean(e.is_published)}
                          aria-label={`${e.is_published ? 'Ocultar' : 'Publicar'} ${e.title || 'evento'}`}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                            e.is_published ? 'bg-emerald-600' : 'bg-slate-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                              e.is_published ? 'translate-x-5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                        <span
                          className={`text-xs font-semibold ${
                            e.is_published ? 'text-emerald-700' : 'text-slate-600'
                          }`}
                        >
                          {e.is_published ? 'Publicado' : 'Borrador'}
                        </span>
                      </form>
                    ) : (
                      <div className="inline-flex items-center gap-2">
                        <span className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-200">
                          <span className="inline-block h-5 w-5 translate-x-1 transform rounded-full bg-white shadow" />
                        </span>
                        <Link
                          href={`/admin/events/${e.id}/edit`}
                          className="text-xs font-semibold text-amber-700 transition hover:text-mulberry"
                        >
                          Completar datos
                        </Link>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {canManageFeatured ? (
                      <form action={handleToggleFeatured} className="inline-flex items-center gap-2">
                        <input type="hidden" name="id" value={e.id} />
                        <input type="hidden" name="isFeatured" value={e.is_featured ? 'false' : 'true'} />
                        <button
                          type="submit"
                          role="switch"
                          aria-checked={Boolean(e.is_featured)}
                          aria-label={`Marcar ${e.title || 'evento'} como destacado`}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                            e.is_featured ? 'bg-mulberry' : 'bg-slate-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                              e.is_featured ? 'translate-x-5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                        <span
                          className={`text-xs font-semibold ${
                            e.is_featured ? 'text-emerald-700' : 'text-slate-600'
                          }`}
                        >
                          {e.is_featured ? 'Destacado' : 'No destacado'}
                        </span>
                      </form>
                    ) : (
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          e.is_featured
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {e.is_featured ? 'Destacado' : 'No destacado'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">{e.price}</td>
                  <td className="px-4 py-2">
                    {e.min_users} - {e.max_users}
                  </td>
                  <td className="px-4 py-2">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                      {approvedParticipants}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <a href={`/events/${e.id}`} className="text-mulberry hover:underline">
                        Ver
                      </a>
                      <Link href={`/admin/events/${e.id}/participants`} className="text-mulberry hover:underline">
                        Inscripciones
                      </Link>
                      <Link href={`/admin/events/${e.id}/edit`} className="text-mulberry hover:underline">
                        Editar
                      </Link>
                      <EventQuickActionsMenu
                        eventId={String(e.id)}
                        eventTitle={String(e.title || 'Evento')}
                        isPublished={Boolean(e.is_published)}
                        canPromote={Boolean(isUserSuperAdmin && e.is_published)}
                        recipientCount={promotionRecipientCount}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
