import { getAssistantsCounts, getAssistantsWithDetails } from '@shared/lib/data/getAssistants';
import Badge from '@core/ui/Badge';
import { approveAssistant, rejectAssistant } from '../../api/payments/_actions';
import Link from 'next/link';

export default async function PaymentsAdminPage({
  searchParams,
}: {
  searchParams?: { state?: string; q?: string };
}) {
  const requestedState = searchParams?.state;
  const state: 'pending' | 'approved' | 'rejected' =
    requestedState === 'approved' || requestedState === 'rejected' ? requestedState : 'pending';
  const q = searchParams?.q || '';

  const [counts, items] = await Promise.all([
    getAssistantsCounts(),
    getAssistantsWithDetails(state, { search: q, limit: 50, offset: 0 }),
  ]);

  return (
    <div className="rounded-md bg-white shadow overflow-x-auto">
      <div className="mb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div className="flex gap-2">
          {[
            { k: 'pending', l: `Pendientes (${counts.pending})` },
            { k: 'approved', l: `Aprobados (${counts.approved})` },
            { k: 'rejected', l: `Rechazados (${counts.rejected})` },
          ].map((t) => (
            <Link
              key={t.k}
              href={{
                pathname: '/admin/payments',
                query: q ? { state: t.k, q } : { state: t.k },
              }}
              className={`px-3 py-2 rounded-md text-sm border ${
                state === t.k
                  ? 'bg-mulberry text-white border-mulberry'
                  : 'bg-white text-mulberry border-mulberry'
              }`}
            >
              {t.l}
            </Link>
          ))}
        </div>
        <form className="md:w-64" action="">
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar operación..."
            className="w-full h-9 px-3 rounded-md border-2 border-mulberry focus:outline-none focus:border-mulberry bg-white text-sm"
          />
          <input type="hidden" name="state" value={state} />
        </form>
      </div>

      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left">ID</th>
            <th className="px-4 py-2 text-left">Operación</th>
            <th className="px-4 py-2 text-left">Estado</th>
            <th className="px-4 py-2 text-left">Evento</th>
            <th className="px-4 py-2 text-left">Usuario</th>
            <th className="px-4 py-2 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.map((a) => {
            const approveAction = approveAssistant.bind(null, a.id);
            const rejectAction = rejectAssistant.bind(null, a.id);
            return (
              <tr key={a.id} className="border-t">
                <td className="px-4 py-2">{a.id}</td>
                <td className="px-4 py-2 flex items-center gap-2">
                  <span>{a.operationNumber}</span>
                  {/* TODO: Add copy functionality */}
                </td>
                <td className="px-4 py-2">
                  {a.state === 'approved' ? (
                    <Badge badgeType="Third" text="Aprobado" icon={false} />
                  ) : a.state === 'rejected' ? (
                    <Badge badgeType="Secondary" text="Rechazado" icon={false} />
                  ) : (
                    <Badge badgeType="Primary" text="Pendiente" icon={false} />
                  )}
                </td>
                <td className="px-4 py-2">
                  <div className="flex flex-col">
                    <span className="font-medium">{a.eventTitle || a.event}</span>
                    {a.eventDate && <span className="text-xs text-gray-500">{a.eventDate}</span>}
                  </div>
                </td>
                <td className="px-4 py-2">{a.userName || a.user}</td>
                <td className="px-4 py-2 text-right">
                  <form action={approveAction} className="inline">
                    <button className="px-3 py-1 rounded bg-green-600 text-white mr-2">
                      Aprobar
                    </button>
                  </form>
                  <form action={rejectAction} className="inline">
                    <button className="px-3 py-1 rounded bg-red-600 text-white">Rechazar</button>
                  </form>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
