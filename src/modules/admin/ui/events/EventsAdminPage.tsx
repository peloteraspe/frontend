import { getEvents } from '@shared/lib/data/getEvents';
import Link from 'next/link';
import { getServerSupabase } from '@core/api/supabase.server';
import { isSuperAdmin } from '@shared/lib/auth/isAdmin';
import { setEventFeatured } from '@modules/admin/api/events/_actions';
import EventShareActionButton from '@modules/admin/ui/events/EventShareActionButton';
import { getApprovedParticipantsCountByEventIds } from '@modules/admin/api/events/services/eventParticipants.service';

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
  });
  const dateTimeFormatter = new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  if (!end) {
    return `${timeFormatter.format(start)} - --:--`;
  }

  if (isSameCalendarDate(start, end)) {
    return `${timeFormatter.format(start)} - ${timeFormatter.format(end)}`;
  }

  return `${dateTimeFormatter.format(start)} - ${dateTimeFormatter.format(end)}`;
}

export default async function AdminEventsPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const canManageFeatured = isSuperAdmin(user as any);

  async function handleToggleFeatured(formData: FormData) {
    'use server';
    const id = String(formData.get('id') || '');
    const isFeatured = String(formData.get('isFeatured') || '') === 'true';
    await setEventFeatured(id, isFeatured);
  }

  const events = (await getEvents()) ?? [];
  const approvedParticipantsByEventId = await getApprovedParticipantsCountByEventIds(
    events.map((event: any) => event.id)
  );

  return (
    <div className="rounded-md bg-white shadow overflow-x-auto">
      <div className="p-4 flex justify-end">
        <Link href="/admin/events/new" className="px-3 py-2 rounded-md bg-mulberry text-white">
          Crear evento
        </Link>
      </div>
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left">Título</th>
            <th className="px-4 py-2 text-left">Fecha</th>
            <th className="px-4 py-2 text-left">Hora</th>
            <th className="px-4 py-2 text-left">Destacado</th>
            <th className="px-4 py-2 text-left">Precio</th>
            <th className="px-4 py-2 text-left">Cupos</th>
            <th className="px-4 py-2 text-left">Participantes</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {events.map((e: any) => {
            const approvedParticipants = approvedParticipantsByEventId.get(String(e.id)) ?? 0;
            return (
              <tr key={e.id} className="border-t">
                <td className="px-4 py-2">{e.title}</td>
                <td className="px-4 py-2">{formatDateRange(e.start_time, e.end_time)}</td>
                <td className="px-4 py-2 whitespace-nowrap">{formatTimeRange(e.start_time, e.end_time)}</td>
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
                  <div className="flex gap-3 justify-end">
                    <a href={`/events/${e.id}`} className="text-mulberry hover:underline">
                      Ver
                    </a>
                    <Link href={`/admin/events/${e.id}/participants`} className="text-mulberry hover:underline">
                      Participantes
                    </Link>
                    <EventShareActionButton eventId={String(e.id)} eventTitle={String(e.title || 'Evento')} />
                    <Link href={`/admin/events/${e.id}/edit`} className="text-mulberry hover:underline">
                      Editar
                    </Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
