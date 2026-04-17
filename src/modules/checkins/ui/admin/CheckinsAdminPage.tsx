'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import {
  buildCheckinPublicUrl,
  buildCheckinQrImageUrl,
  CHECKIN_QR_SIZE,
  sanitizeCheckinSlug,
} from '@modules/checkins/lib/checkins';
import type { CheckinEventOption, CheckinListItem } from '@modules/checkins/model/types';

const DEFAULT_TIMEZONE = 'America/Lima';

function formatDateTime(value: string) {
  if (!value) return 'Sin fecha';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Sin fecha';

  return new Intl.DateTimeFormat('es-PE', {
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
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: DEFAULT_TIMEZONE,
  }).format(parsed);
}

export default function CheckinsAdminPage({ eventOptions }: { eventOptions: CheckinEventOption[] }) {
  const [checkins, setCheckins] = useState<CheckinListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [eventId, setEventId] = useState('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);

  async function loadCheckins() {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/check-ins', { cache: 'no-store' });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        setCheckins([]);
        setError(body?.error || 'No se pudieron cargar los check-ins.');
        return;
      }

      setCheckins(Array.isArray(body?.checkins) ? body.checkins : []);
    } catch {
      setCheckins([]);
      setError('No se pudieron cargar los check-ins.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCheckins();
  }, []);

  const totalRegistrations = checkins.reduce((accumulator, item) => accumulator + Number(item.registrationCount || 0), 0);
  const previewUrl = slug
    ? buildCheckinPublicUrl(
        slug,
        typeof window !== 'undefined' && window.location?.origin ? window.location.origin : undefined
      )
    : '';

  async function handleCopy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copiado.`);
    } catch {
      toast.error(`No se pudo copiar ${label.toLowerCase()}.`);
    }
  }

  function handleEventChange(nextEventId: string) {
    setEventId(nextEventId);

    if (name.trim()) return;

    const selectedEvent = eventOptions.find((option) => option.id === nextEventId);
    if (!selectedEvent) return;

    const suggestedName = `Check-in ${selectedEvent.title}`;
    setName(suggestedName);

    if (!slugTouched) {
      setSlug(sanitizeCheckinSlug(suggestedName));
    }
  }

  function handleNameChange(nextName: string) {
    setName(nextName);

    if (!slugTouched) {
      setSlug(sanitizeCheckinSlug(nextName));
    }
  }

  function handleSlugChange(nextSlug: string) {
    setSlugTouched(true);
    setSlug(sanitizeCheckinSlug(nextSlug));
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!eventOptions.length) {
      toast.error('Primero crea al menos un evento.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/admin/check-ins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId,
          name,
          slug,
        }),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(body?.error || 'No se pudo crear el check-in.');
        return;
      }

      toast.success('Check-in creado.');
      setEventId('');
      setName('');
      setSlug('');
      setSlugTouched(false);
      await loadCheckins();
    } catch {
      toast.error('No se pudo crear el check-in.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-mulberry/70">Superadmin</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Check-ins</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
              Crea links personalizados por evento, comparte el QR del formulario público y revisa
              cuántas personas se registraron en cada check-in.
            </p>
          </div>

          <div className="grid gap-3 sm:min-w-[320px] sm:grid-cols-3 lg:w-[360px] lg:grid-cols-1">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Check-ins</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{checkins.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Registros</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{totalRegistrations}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Eventos disponibles</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{eventOptions.length}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col gap-2">
          <h3 className="text-lg font-semibold text-mulberry">Crear nuevo check-in</h3>
          <p className="text-sm text-slate-600">
            Cada check-in queda ligado a un solo evento y genera una URL pública y su QR.
          </p>
        </div>

        {!eventOptions.length ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Aún no hay eventos para asociar. Crea un evento primero y luego vuelve aquí.
          </div>
        ) : (
          <form className="grid gap-4 lg:grid-cols-[1.2fr_1fr]" onSubmit={handleCreate}>
            <div className="grid gap-4">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Evento
                <select
                  value={eventId}
                  onChange={(event) => handleEventChange(event.target.value)}
                  className="peloteras-form-control peloteras-form-control--select h-11 px-3"
                  disabled={submitting}
                  required
                >
                  <option value="">Selecciona un evento</option>
                  {eventOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Nombre interno del check-in
                <input
                  value={name}
                  onChange={(event) => handleNameChange(event.target.value)}
                  placeholder="Ej. Check-in prensa, check-in invitadas, check-in general"
                  className="peloteras-form-control h-11 px-3"
                  disabled={submitting}
                  required
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Link personalizado
                <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-3 focus-within:border-mulberry">
                  <span className="shrink-0 text-sm text-slate-500">/check-in/</span>
                  <input
                    value={slug}
                    onChange={(event) => handleSlugChange(event.target.value)}
                    placeholder="evento-open-day"
                    className="h-11 w-full border-0 bg-transparent px-2 text-sm text-slate-900 outline-none"
                    disabled={submitting}
                    required
                  />
                </div>
                <span className="text-xs text-slate-500">Se normaliza automáticamente a minúsculas y guiones.</span>
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-mulberry px-5 text-sm font-semibold text-white transition hover:bg-[#470760] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? 'Creando...' : 'Crear check-in'}
                </button>
              </div>
            </div>

            <aside className="rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,rgba(84,8,111,0.06),rgba(240,129,91,0.08))] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-mulberry/70">Vista previa</p>
              <div className="mt-4 rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur">
                <p className="text-sm font-semibold text-slate-900">{name.trim() || 'Tu check-in aparecerá aquí'}</p>
                <p className="mt-1 text-sm text-slate-500">{previewUrl || 'Completa el slug para generar el link.'}</p>

                <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Evento asociado</p>
                  <p className="mt-2 text-sm font-medium text-slate-900">
                    {eventOptions.find((option) => option.id === eventId)?.title || 'Selecciona un evento'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatEventDate(eventOptions.find((option) => option.id === eventId)?.startTime || null)}
                  </p>
                </div>
              </div>
            </aside>
          </form>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
          <h3 className="text-lg font-semibold text-mulberry">Check-ins creados</h3>
          <p className="mt-1 text-sm text-slate-600">
            Entra a cada check-in para revisar el detalle y la lista de personas registradas.
          </p>
        </div>

        {loading ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500 sm:px-6">Cargando check-ins...</p>
        ) : error ? (
          <div className="px-4 py-6 sm:px-6">
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              {error}
            </div>
          </div>
        ) : checkins.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500 sm:px-6">
            Todavía no hay check-ins creados.
          </p>
        ) : (
          <div className="grid gap-4 p-4 sm:p-6">
            {checkins.map((checkin) => {
              const qrDownloadUrl = buildCheckinQrImageUrl(checkin.slug, {
                size: CHECKIN_QR_SIZE,
                download: true,
              });

              return (
                <article
                  key={checkin.id}
                  className="grid gap-4 rounded-[28px] border border-slate-200 bg-slate-50/80 p-4 lg:grid-cols-[1.2fr_190px]"
                >
                  <div className="grid gap-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-mulberry/70">
                          {checkin.event.title}
                        </p>
                        <h4 className="text-xl font-black tracking-tight text-slate-900">{checkin.name}</h4>
                        <p className="mt-1 text-sm text-slate-500">
                          Creado {formatDateTime(checkin.createdAt)} · {checkin.registrationCount} registradas
                        </p>
                      </div>

                      <div className="inline-flex w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        {checkin.isActive ? 'Activo' : 'Inactivo'}
                      </div>
                    </div>

                    <div className="grid gap-3 rounded-2xl border border-white bg-white p-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Link público</p>
                        <p className="mt-1 break-all text-sm font-medium text-slate-800">{checkin.publicUrl}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopy(checkin.publicUrl, 'Link')}
                          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-mulberry hover:text-mulberry"
                        >
                          Copiar link
                        </button>
                        <a
                          href={checkin.publicUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-mulberry hover:text-mulberry"
                        >
                          Abrir formulario
                        </a>
                        <Link
                          href={`/admin/check-ins/${checkin.id}`}
                          className="inline-flex h-10 items-center justify-center rounded-xl bg-mulberry px-4 text-sm font-semibold text-white transition hover:bg-[#470760]"
                        >
                          Ver inscritas
                        </Link>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center rounded-[24px] border border-white bg-white p-4 shadow-sm">
                    <img
                      src={checkin.qrImageUrl}
                      alt={`QR del check-in ${checkin.name}`}
                      className="h-40 w-40 rounded-2xl border border-slate-200 bg-white p-2"
                      loading="lazy"
                    />
                    <a
                      href={qrDownloadUrl}
                      download
                      className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-mulberry hover:text-mulberry"
                    >
                      Descargar QR
                    </a>
                    <p className="mt-2 text-center text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                      PNG 500x500
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
