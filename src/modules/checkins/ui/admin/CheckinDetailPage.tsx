import Link from 'next/link';
import { buildCheckinQrImageUrl, CHECKIN_QR_SIZE } from '@modules/checkins/lib/checkins';
import type { CheckinDetail } from '@modules/checkins/model/types';

const DEFAULT_TIMEZONE = 'America/Lima';

function formatDateTime(value: string) {
  if (!value) return 'Sin fecha';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Sin fecha';

  return new Intl.DateTimeFormat('es-PE', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: DEFAULT_TIMEZONE,
  }).format(parsed);
}

function formatEventDate(value: string | null) {
  if (!value) return 'Fecha por confirmar';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Fecha por confirmar';

  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: DEFAULT_TIMEZONE,
  }).format(parsed);
}

export default function CheckinDetailPage({ checkin }: { checkin: CheckinDetail }) {
  const qrDownloadUrl = buildCheckinQrImageUrl(checkin.slug, {
    size: CHECKIN_QR_SIZE,
    download: true,
  });

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <Link
              href="/admin/check-ins"
              className="inline-flex text-sm font-semibold text-mulberry transition hover:underline"
            >
              Volver a check-ins
            </Link>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.24em] text-mulberry/70">
              {checkin.event.title}
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{checkin.name}</h1>
            <p className="mt-2 text-sm text-slate-600">
              Formulario público: <span className="font-medium text-slate-900">{checkin.publicUrl}</span>
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Evento: {formatEventDate(checkin.event.startTime)}{checkin.event.locationText ? ` · ${checkin.event.locationText}` : ''}
            </p>
          </div>

          <div className="flex flex-col items-center rounded-[28px] border border-slate-200 bg-slate-50 p-4">
            <img
              src={checkin.qrImageUrl}
              alt={`QR del check-in ${checkin.name}`}
              className="h-40 w-40 rounded-2xl border border-slate-200 bg-white p-2"
              loading="lazy"
            />
            <div className="mt-3 grid w-full gap-2">
              <a
                href={qrDownloadUrl}
                download
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-mulberry hover:text-mulberry"
              >
                Descargar QR 500x500
              </a>
              <a
                href={checkin.publicUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center justify-center rounded-xl bg-mulberry px-4 text-sm font-semibold text-white transition hover:bg-[#470760]"
              >
                Abrir formulario
              </a>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Registradas</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{checkin.registrations.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Estado</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{checkin.isActive ? 'Activo' : 'Inactivo'}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Creado</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{formatDateTime(checkin.createdAt)}</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
          <h2 className="text-lg font-semibold text-mulberry">Personas registradas</h2>
          <p className="mt-1 text-sm text-slate-600">
            Lista de registros recibidos desde el formulario público de este check-in.
          </p>
        </div>

        {checkin.registrations.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500 sm:px-6">
            Aún no hay personas registradas en este check-in.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Nombre</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Correo</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Celular</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Registrado</th>
                </tr>
              </thead>
              <tbody>
                {checkin.registrations.map((registration) => (
                  <tr key={registration.id} className="border-t border-slate-200">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {registration.firstName} {registration.lastName}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{registration.email}</td>
                    <td className="px-4 py-3 text-slate-700">{registration.phone}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDateTime(registration.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
