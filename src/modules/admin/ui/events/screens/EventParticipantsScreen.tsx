import {
  getParticipantContactsByEventId,
} from '@modules/admin/api/events/services/eventParticipants.service';
import {
  getDefaultEventAnnouncementEmail,
} from '@modules/admin/api/events/services/eventAnnouncementEmail.service';
import { assertCanManageEvent } from '@modules/admin/api/events/services/eventPermissions.service';
import { getEventAnnouncementHistory } from '@modules/admin/api/events/services/eventAnnouncementHistory.service';
import EventAnnouncementForm from '@modules/admin/ui/events/EventAnnouncementForm';
import EventAnnouncementHistory from '@modules/admin/ui/events/EventAnnouncementHistory';
import EventParticipantsTable from '@modules/admin/ui/events/EventParticipantsTable';
import { getEventById } from '@shared/lib/data/getEventById';
import { isSuperAdmin } from '@shared/lib/auth/isAdmin';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function EventParticipantsScreen({ id }: { id: string }) {
  let canRunLottery = false;
  try {
    const access = await assertCanManageEvent(id);
    canRunLottery = isSuperAdmin(access.user as any);
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
  const attendedCount = participants.filter((participant) => participant.hasAttended).length;
  const approvedRecipients = participants.filter(
    (participant) =>
      participant.state === 'approved' && participant.email && participant.email !== 'Sin correo'
  );
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

        <div className="grid gap-3 border-b p-4 md:grid-cols-4">
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
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Asistieron</p>
            <p className="mt-1 text-2xl font-bold text-sky-700">{attendedCount}</p>
          </div>
        </div>

        <EventParticipantsTable participants={participants} canRunLottery={canRunLottery} />
      </div>

      <EventAnnouncementForm
        eventId={id}
        defaultSubject={defaults.subject}
        defaultBody={defaults.body}
        recipientCount={approvedRecipients.length}
      />

      <EventAnnouncementHistory history={history} />
    </div>
  );
}
