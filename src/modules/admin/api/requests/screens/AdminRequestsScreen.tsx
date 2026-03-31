import Link from 'next/link';

import {
  approveAdminRequest,
  markAdminRequestContacted,
  rejectAdminRequest,
} from '@modules/admin/api/requests/_actions';
import {
  getAdminRequests,
  getAdminRequestStatusLabel,
  type AdminRequestStatus,
} from '@modules/admin/api/requests/services/adminRequests.service';

type SearchParams = {
  status?: string;
  message?: string;
  error?: string;
};

const FILTERS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'Todas' },
  { value: 'new', label: 'Pendientes' },
  { value: 'contacted', label: 'Contactadas' },
  { value: 'qualified', label: 'Aprobadas' },
  { value: 'closed', label: 'Rechazadas' },
];

function normalizeText(value: unknown, fallback = '') {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function normalizeStatusFilter(value: unknown) {
  const normalized = normalizeText(value, 'all').toLowerCase();
  return FILTERS.some((item) => item.value === normalized) ? normalized : 'all';
}

function formatDateTime(value: string | null) {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';

  return date.toLocaleString('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Lima',
  });
}

function getStatusBadgeClass(status: AdminRequestStatus) {
  if (status === 'contacted') return 'bg-sky-100 text-sky-800';
  if (status === 'qualified') return 'bg-emerald-100 text-emerald-800';
  if (status === 'closed') return 'bg-rose-100 text-rose-800';
  return 'bg-amber-100 text-amber-900';
}

function getFilterHref(status: string) {
  return status === 'all' ? '/admin/requests' : `/admin/requests?status=${encodeURIComponent(status)}`;
}

function FlashMessage({
  type,
  children,
}: {
  type: 'message' | 'error';
  children: React.ReactNode;
}) {
  const className =
    type === 'error'
      ? 'mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800'
      : 'mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800';

  return <div className={className}>{children}</div>;
}

export default async function AdminRequestsScreen({ searchParams }: { searchParams?: SearchParams }) {
  const statusFilter = normalizeStatusFilter(searchParams?.status);
  const requests = await getAdminRequests(statusFilter);
  const redirectTo = statusFilter === 'all' ? '/admin/requests' : `/admin/requests?status=${statusFilter}`;
  const message = normalizeText(searchParams?.message);
  const error = normalizeText(searchParams?.error);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <div className="mb-4 flex flex-col gap-2">
        <h2 className="text-xl font-semibold text-mulberry">Solicitudes admin</h2>
        <p className="text-sm text-slate-600">
          Revisa las solicitudes, contacta a las jugadoras y activa permisos admin cuando corresponda.
        </p>
      </div>

      {message ? <FlashMessage type="message">{message}</FlashMessage> : null}
      {error ? <FlashMessage type="error">{error}</FlashMessage> : null}

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const active = filter.value === statusFilter;
          return (
            <Link
              key={filter.value}
              href={getFilterHref(filter.value)}
              className={[
                'inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
                active
                  ? 'border-mulberry bg-mulberry text-white'
                  : 'border-mulberry/30 bg-white text-mulberry hover:bg-mulberry/5',
              ].join(' ')}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Solicitud</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Contacto</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Estado</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Usuaria</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No hay solicitudes para este filtro.
                </td>
              </tr>
            ) : (
              requests.map((request) => {
                const acceptedCommitments = Object.values(request.commitments).filter(Boolean).length;
                const detailHref = `/admin/requests/${request.id}`;
                const approveDisabled = request.status === 'qualified' || !request.linkedUser;
                const contactedDisabled = request.status !== 'new';
                const rejectedDisabled = request.status === 'closed';

                return (
                  <tr key={request.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-slate-900">#{request.id}</div>
                      <div className="mt-1 text-xs text-slate-500">{formatDateTime(request.createdAt)}</div>
                      <div className="mt-2 text-xs text-slate-500">
                        Compromisos aceptados: {acceptedCommitments}/3
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-slate-700">
                      <div className="font-medium text-slate-900">{request.contactName}</div>
                      <div>{request.contactPhone}</div>
                      <div>{request.contactEmail}</div>
                      <div className="mt-1 text-xs text-slate-500">{request.district}</div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span
                        className={[
                          'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
                          getStatusBadgeClass(request.status),
                        ].join(' ')}
                      >
                        {getAdminRequestStatusLabel(request.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top text-slate-700">
                      {request.linkedUser ? (
                        <div>
                          <div className="font-medium text-slate-900">{request.linkedUser.name}</div>
                          <div>{request.linkedUser.email}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-amber-700">Sin cuenta vinculada</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={detailHref}
                          className="inline-flex items-center rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Ver detalle
                        </Link>

                        <form action={markAdminRequestContacted}>
                          <input type="hidden" name="requestId" value={request.id} readOnly />
                          <input type="hidden" name="redirectTo" value={redirectTo} readOnly />
                          <button
                            type="submit"
                            disabled={contactedDisabled}
                            className={[
                              'inline-flex items-center rounded-md px-3 py-2 text-xs font-semibold transition',
                              contactedDisabled
                                ? 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400'
                                : 'border border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100',
                            ].join(' ')}
                          >
                            Marcar contactada
                          </button>
                        </form>

                        <form action={approveAdminRequest}>
                          <input type="hidden" name="requestId" value={request.id} readOnly />
                          <input type="hidden" name="redirectTo" value={redirectTo} readOnly />
                          <button
                            type="submit"
                            disabled={approveDisabled}
                            className={[
                              'inline-flex items-center rounded-md px-3 py-2 text-xs font-semibold transition',
                              approveDisabled
                                ? 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400'
                                : 'border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
                            ].join(' ')}
                          >
                            Aprobar admin
                          </button>
                        </form>

                        <form action={rejectAdminRequest}>
                          <input type="hidden" name="requestId" value={request.id} readOnly />
                          <input type="hidden" name="redirectTo" value={redirectTo} readOnly />
                          <button
                            type="submit"
                            disabled={rejectedDisabled}
                            className={[
                              'inline-flex items-center rounded-md px-3 py-2 text-xs font-semibold transition',
                              rejectedDisabled
                                ? 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400'
                                : 'border border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100',
                            ].join(' ')}
                          >
                            Rechazar
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
