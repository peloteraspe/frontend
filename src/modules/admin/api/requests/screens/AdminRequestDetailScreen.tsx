import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  approveAdminRequest,
  markAdminRequestContacted,
  rejectAdminRequest,
} from '@modules/admin/api/requests/_actions';
import {
  getAdminRequestById,
  getAdminRequestStatusLabel,
  type AdminRequestStatus,
} from '@modules/admin/api/requests/services/adminRequests.service';

type SearchParams = {
  message?: string;
  error?: string;
};

function normalizeText(value: unknown, fallback = '') {
  const normalized = String(value || '').trim();
  return normalized || fallback;
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

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm text-slate-900">{value}</p>
    </div>
  );
}

export default async function AdminRequestDetailScreen({
  id,
  searchParams,
}: {
  id: number;
  searchParams?: SearchParams;
}) {
  const request = await getAdminRequestById(id);
  if (!request) {
    redirect('/admin/requests');
  }

  const message = normalizeText(searchParams?.message);
  const error = normalizeText(searchParams?.error);
  const redirectTo = `/admin/requests/${request.id}`;
  const approveDisabled = request.status === 'qualified' || !request.linkedUser;
  const contactedDisabled = request.status !== 'new';
  const rejectedDisabled = request.status === 'closed';
  const reviewedAt = normalizeText(request.metadata.reviewed_at);
  const reviewedBy = normalizeText(request.metadata.reviewed_by);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <Link href="/admin/requests" className="text-sm font-semibold text-mulberry hover:underline">
            Volver a solicitudes
          </Link>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Solicitud admin #{request.id}</h2>
          <p className="mt-1 text-sm text-slate-600">
            Enviada el {formatDateTime(request.createdAt)} desde {request.source}.
          </p>
        </div>

        <span
          className={[
            'inline-flex w-fit rounded-full px-3 py-1 text-sm font-semibold',
            getStatusBadgeClass(request.status),
          ].join(' ')}
        >
          {getAdminRequestStatusLabel(request.status)}
        </span>
      </div>

      {message ? <FlashMessage type="message">{message}</FlashMessage> : null}
      {error ? <FlashMessage type="error">{error}</FlashMessage> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InfoCard label="Nombre" value={request.contactName} />
        <InfoCard label="Celular" value={request.contactPhone} />
        <InfoCard label="Correo" value={request.contactEmail} />
        <InfoCard label="Distrito" value={request.district} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-mulberry">Compromisos aceptados</h3>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <span className="mt-0.5 font-semibold text-slate-900">{request.commitments.reservedField ? 'Si' : 'No'}</span>
              <p>Crear eventos solo cuando el espacio de juego ya está reservado.</p>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <span className="mt-0.5 font-semibold text-slate-900">
                {request.commitments.noCancellation ? 'Si' : 'No'}
              </span>
              <p>No cancelar eventos salvo fuerza mayor y avisar a todas las inscritas.</p>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <span className="mt-0.5 font-semibold text-slate-900">
                {request.commitments.reportIncidents ? 'Si' : 'No'}
              </span>
              <p>Reportar incumplimientos a contacto@peloteras.com.</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-mulberry">Cuenta vinculada</h3>
          {request.linkedUser ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">{request.linkedUser.name}</p>
              <p className="mt-1">{request.linkedUser.email}</p>
              <p className="mt-3 text-xs text-slate-500">
                Estado actual: {request.linkedUser.isSuperAdmin ? 'Superadmin' : request.linkedUser.isAdmin ? 'Admin' : 'Usuaria'}
              </p>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              No encontramos una cuenta vinculada todavía. Para activar permisos admin, la jugadora debe iniciar sesión
              con su cuenta primero.
            </div>
          )}

          <div className="mt-4 space-y-2 text-sm text-slate-600">
            <p>
              <strong className="text-slate-900">Última actualización:</strong> {formatDateTime(request.updatedAt)}
            </p>
            {reviewedAt ? (
              <p>
                <strong className="text-slate-900">Revisada:</strong> {formatDateTime(reviewedAt)}
              </p>
            ) : null}
            {reviewedBy ? (
              <p>
                <strong className="text-slate-900">Revisó:</strong> {reviewedBy}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-mulberry">Acciones</h3>
        <div className="mt-4 flex flex-wrap gap-3">
          <form action={markAdminRequestContacted}>
            <input type="hidden" name="requestId" value={request.id} readOnly />
            <input type="hidden" name="redirectTo" value={redirectTo} readOnly />
            <button
              type="submit"
              disabled={contactedDisabled}
              className={[
                'inline-flex items-center rounded-md px-4 py-2 text-sm font-semibold transition',
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
                'inline-flex items-center rounded-md px-4 py-2 text-sm font-semibold transition',
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
                'inline-flex items-center rounded-md px-4 py-2 text-sm font-semibold transition',
                rejectedDisabled
                  ? 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400'
                  : 'border border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100',
              ].join(' ')}
            >
              Rechazar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
