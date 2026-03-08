import { getApprovedParticipantsByEventId } from '@modules/admin/api/events/services/eventParticipants.service';
import { getEventById } from '@shared/lib/data/getEventById';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function EventParticipantsScreen({ id }: { id: string }) {
  const event = await getEventById(id);
  if (!event) redirect('/admin/events');

  const participants = await getApprovedParticipantsByEventId(id);
  const eventTitle = String(event.title || '').trim() || `Evento #${id}`;

  return (
    <div className="rounded-md bg-white shadow">
      <div className="flex flex-col gap-2 border-b p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-mulberry">Participantes</h2>
          <p className="text-sm text-slate-700">{eventTitle}</p>
          <p className="text-xs text-slate-500">
            Pagos aprobados: <strong>{participants.length}</strong>
          </p>
        </div>
        <Link
          href="/admin/events"
          className="inline-flex h-9 items-center justify-center rounded-md border border-mulberry px-3 text-sm font-medium text-mulberry"
        >
          Volver a eventos
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Nombre</th>
              <th className="px-4 py-2 text-left">Correo</th>
            </tr>
          </thead>
          <tbody>
            {participants.length === 0 ? (
              <tr className="border-t">
                <td className="px-4 py-4 text-sm text-slate-500" colSpan={2}>
                  Aún no hay participantes aprobadas para este evento.
                </td>
              </tr>
            ) : null}

            {participants.map((participant) => (
              <tr key={participant.userId} className="border-t">
                <td className="px-4 py-2">{participant.name}</td>
                <td className="px-4 py-2">{participant.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
