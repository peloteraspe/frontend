import type { ResendSentEmailHistoryItem } from '@modules/admin/api/events/services/resendSentEmailHistory.service';

type Props = {
  history: ResendSentEmailHistoryItem[];
};

function formatDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Fecha no disponible';

  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

function eventLabel(lastEvent: string) {
  const normalized = String(lastEvent || '').trim().toLowerCase();
  if (normalized === 'delivered') return 'Entregado';
  if (normalized === 'opened') return 'Abierto';
  if (normalized === 'clicked') return 'Clic';
  if (normalized === 'bounced') return 'Rebotado';
  if (normalized === 'complained') return 'Reportado';
  if (normalized === 'sent') return 'Enviado';
  return normalized || 'Sin evento';
}

function eventClasses(lastEvent: string) {
  const normalized = String(lastEvent || '').trim().toLowerCase();
  if (normalized === 'bounced' || normalized === 'complained') return 'bg-rose-100 text-rose-800';
  if (normalized === 'opened' || normalized === 'clicked') return 'bg-sky-100 text-sky-800';
  return 'bg-slate-100 text-slate-800';
}

export default function ResendSentEmailHistory({ history }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-2">
        <h3 className="text-lg font-semibold text-mulberry">Histórico desde Resend</h3>
        <p className="text-sm text-slate-600">
          Esto muestra correos antiguos aceptados por Resend aunque no se hayan guardado en Peloteras. Es solo lectura.
        </p>
      </div>

      {history.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
          No se encontraron correos históricos en Resend para mostrar aquí.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Fecha
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Asunto
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Para
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.id} className="border-t border-slate-200">
                  <td className="px-3 py-2 text-slate-700">{formatDateTime(item.createdAt)}</td>
                  <td className="px-3 py-2 text-slate-900">{item.subject || 'Sin asunto'}</td>
                  <td className="px-3 py-2 text-slate-700">{item.to.join(', ') || 'Sin destinatarias'}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${eventClasses(item.lastEvent)}`}>
                      {eventLabel(item.lastEvent)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
