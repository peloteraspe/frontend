import {
  getParticipantContactsByEventId,
  type EventParticipant,
} from '@modules/admin/api/events/services/eventParticipants.service';
import {
  getDefaultEventAnnouncementEmail,
} from '@modules/admin/api/events/services/eventAnnouncementEmail.service';
import { assertCanManageEvent } from '@modules/admin/api/events/services/eventPermissions.service';
import { getEventAnnouncementHistory } from '@modules/admin/api/events/services/eventAnnouncementHistory.service';
import EventAnnouncementForm from '@modules/admin/ui/events/EventAnnouncementForm';
import EventAnnouncementHistory from '@modules/admin/ui/events/EventAnnouncementHistory';
import { getEventById } from '@shared/lib/data/getEventById';
import Link from 'next/link';
import { redirect } from 'next/navigation';

function stateLabel(state: string) {
  const normalized = String(state || '').trim().toLowerCase();
  if (normalized === 'approved') return 'Aprobada';
  if (normalized === 'pending') return 'Pendiente';
  if (normalized === 'rejected') return 'Rechazada';
  return normalized || 'Sin estado';
}

function stateClasses(state: string) {
  const normalized = String(state || '').trim().toLowerCase();
  if (normalized === 'approved') return 'bg-emerald-100 text-emerald-700';
  if (normalized === 'pending') return 'bg-amber-100 text-amber-700';
  if (normalized === 'rejected') return 'bg-rose-100 text-rose-700';
  return 'bg-slate-100 text-slate-700';
}

export default async function EventParticipantsScreen({ id }: { id: string }) {
  try {
    await assertCanManageEvent(id);
  } catch {
    redirect('/admin/events');
  }

  const event = await getEventById(id);
  if (!event) redirect('/admin/events');

  const participants = await getParticipantContactsByEventId(id);
  const history = await getEventAnnouncementHistory(id);
  const eventTitle = String(event.title || '').trim() || `Evento #${id}`;
  const approvedCount = participants.filter((participant) => participant.state === 'approved').length;
  const pendingCount = participants.filter((participant) => participant.state === 'pending').length;
  const recipients = participants.filter((participant) => participant.email && participant.email !== 'Sin correo');
  const defaults = getDefaultEventAnnouncementEmail();

  return (
    <div className="space-y-5">
      <div className="rounded-md bg-white shadow">
        <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-mulberry">Inscripciones</h2>
            <p className="text-sm text-slate-700">{eventTitle}</p>
          </div>
          <Link
            href="/admin/events"
            className="inline-flex h-9 items-center justify-center rounded-md border border-mulberry px-3 text-sm font-medium text-mulberry"
          >
            Volver a eventos
          </Link>
        </div>

        <div className="grid gap-3 border-b p-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Activas</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{participants.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Aprobadas</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{approvedCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pendientes</p>
            <p className="mt-1 text-2xl font-bold text-amber-700">{pendingCount}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Nombre</th>
                <th className="px-4 py-2 text-left">Correo</th>
                <th className="px-4 py-2 text-left">Estado</th>
              </tr>
            </thead>
            <tbody>
              {participants.length === 0 ? (
                <tr className="border-t">
                  <td className="px-4 py-4 text-sm text-slate-500" colSpan={3}>
                    Aún no hay inscripciones activas para este evento.
                  </td>
                </tr>
              ) : null}

              {participants.map((participant: EventParticipant) => (
                <tr key={participant.userId} className="border-t">
                  <td className="px-4 py-2">{participant.name}</td>
                  <td className="px-4 py-2">{participant.email}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${stateClasses(
                        participant.state
                      )}`}
                    >
                      {stateLabel(participant.state)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <EventAnnouncementForm
        eventId={id}
        defaultSubject={defaults.subject}
        defaultBody={defaults.body}
        recipientCount={recipients.length}
      />

      <EventAnnouncementHistory history={history} />
    </div>
  );
}
