import Link from 'next/link';
import { getServerSupabase } from '@core/api/supabase.server';
import { setEventFeatured, setEventPublished } from '@modules/admin/api/events/_actions';
import { getApprovedParticipantsCountByEventIds } from '@modules/admin/api/events/services/eventParticipants.service';
import { getEventPublishReadiness, parseStoredBoolean } from '@modules/admin/model/eventPublishReadiness';
import EventQuickActionsMenu from '@modules/admin/ui/events/EventQuickActionsMenu';
import { getAllUserEmailsForBroadcast } from '@modules/admin/api/users/services/adminUsers.service';
import { isSuperAdmin } from '@shared/lib/auth/isAdmin';
import { getIsoDateInTimeZone } from '@shared/lib/dateTime';
import { getEvents } from '@shared/lib/data/getEvents';
import { getEventIdsWithActivePaymentMethods } from '@shared/lib/paymentMethodSelection.server';

type EventStatusFilter = 'all' | 'published' | 'draft';
type EventPeriodFilter = 'all' | 'upcoming' | 'past';
type EventSort = 'operational' | 'asc' | 'desc';

type Props = {
  searchParams?: {
    q?: string;
    status?: string;
    period?: string;
    dateOrder?: string;
  };
};

type ServerFormAction = (formData: FormData) => Promise<void>;

type AdminEventRow = {
  id: string;
  title: string;
  dateLabel: string;
  timeLabel: string;
  locationLabel: string;
  priceLabel: string;
  minUsers: number;
  maxUsers: number;
  approvedParticipants: number;
  isPublished: boolean;
  isFeatured: boolean;
  isPast: boolean;
  hasDate: boolean;
  startTimestamp: number | null;
  publishReady: boolean;
  searchText: string;
};

const DEFAULT_TIMEZONE = 'America/Lima';
const DATE_FORMATTER = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: DEFAULT_TIMEZONE,
});
const TIME_FORMATTER = new Intl.DateTimeFormat('es-PE', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: DEFAULT_TIMEZONE,
});
const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: DEFAULT_TIMEZONE,
});
const PRICE_FORMATTER = new Intl.NumberFormat('es-PE', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function parseDate(value: unknown) {
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isSameCalendarDate(a: Date, b: Date) {
  return getIsoDateInTimeZone(a, DEFAULT_TIMEZONE) === getIsoDateInTimeZone(b, DEFAULT_TIMEZONE);
}

function formatDateRange(startRaw: unknown, endRaw: unknown) {
  const start = parseDate(startRaw);
  if (!start) return 'Fecha pendiente';

  const end = parseDate(endRaw);
  const startLabel = DATE_FORMATTER.format(start).replace(/\./g, '');
  if (!end || isSameCalendarDate(start, end)) return startLabel;

  return `${startLabel} – ${DATE_FORMATTER.format(end).replace(/\./g, '')}`;
}

function formatTimeRange(startRaw: unknown, endRaw: unknown) {
  const start = parseDate(startRaw);
  if (!start) return 'Hora pendiente';

  const end = parseDate(endRaw);
  if (!end) return `${TIME_FORMATTER.format(start)} – pendiente`;

  if (isSameCalendarDate(start, end)) {
    return `${TIME_FORMATTER.format(start)} – ${TIME_FORMATTER.format(end)}`;
  }

  return `${TIME_FORMATTER.format(start)} – ${DATE_TIME_FORMATTER.format(end).replace(/\./g, '')}`;
}

function formatPrice(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 'Precio pendiente';
  if (parsed <= 0) return 'Gratis';
  return `S/ ${PRICE_FORMATTER.format(parsed)}`;
}

function normalizeSearchText(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function resolveLocationLabel(event: any) {
  return (
    String(event?.district || '').trim() ||
    String(event?.place_text || '').trim() ||
    String(event?.location_text || '').trim() ||
    'Ubicación pendiente'
  );
}

function resolveStatusFilter(value: unknown): EventStatusFilter {
  if (value === 'published' || value === 'draft') return value;
  return 'all';
}

function resolvePeriodFilter(value: unknown): EventPeriodFilter {
  if (value === 'upcoming' || value === 'past') return value;
  return 'all';
}

function resolveSort(value: unknown): EventSort {
  if (value === 'asc' || value === 'desc') return value;
  return 'operational';
}

function sortEventRows(rows: AdminEventRow[], sort: EventSort) {
  return [...rows].sort((a, b) => {
    if (a.startTimestamp === null && b.startTimestamp === null) return 0;
    if (a.startTimestamp === null) return 1;
    if (b.startTimestamp === null) return -1;

    if (sort === 'asc') return a.startTimestamp - b.startTimestamp;
    if (sort === 'desc') return b.startTimestamp - a.startTimestamp;

    if (a.isPast !== b.isPast) return a.isPast ? 1 : -1;
    return a.isPast
      ? b.startTimestamp - a.startTimestamp
      : a.startTimestamp - b.startTimestamp;
  });
}

function SummaryMetric({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_16px_36px_-34px_rgba(15,23,42,0.35)]">
      <p className="text-2xl font-bold tabular-nums text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}

function PublicationControl({
  eventId,
  eventTitle,
  isPublished,
  publishReady,
  onToggle,
}: {
  eventId: string;
  eventTitle: string;
  isPublished: boolean;
  publishReady: boolean;
  onToggle: ServerFormAction;
}) {
  if (!isPublished && !publishReady) {
    return (
      <div className="flex flex-col items-start gap-1.5">
        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
          Incompleto
        </span>
        <Link
          href={`/admin/events/${eventId}/edit`}
          className="text-xs font-semibold text-mulberry transition hover:underline"
        >
          Completar datos
        </Link>
      </div>
    );
  }

  return (
    <form action={onToggle} className="inline-flex items-center gap-2.5">
      <input type="hidden" name="id" value={eventId} />
      <input type="hidden" name="isPublished" value={isPublished ? 'false' : 'true'} />
      <button
        type="submit"
        role="switch"
        aria-checked={isPublished}
        aria-label={`${isPublished ? 'Ocultar' : 'Publicar'} ${eventTitle}`}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
          isPublished ? 'bg-emerald-600' : 'bg-slate-300'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
            isPublished ? 'translate-x-5' : 'translate-x-1'
          }`}
        />
      </button>
      <span
        className={`text-xs font-semibold ${
          isPublished ? 'text-emerald-700' : 'text-slate-600'
        }`}
      >
        {isPublished ? 'Publicado' : 'Borrador'}
      </span>
    </form>
  );
}

function FeaturedControl({
  eventId,
  eventTitle,
  isFeatured,
  onToggle,
}: {
  eventId: string;
  eventTitle: string;
  isFeatured: boolean;
  onToggle: ServerFormAction;
}) {
  return (
    <form action={onToggle} className="inline-flex items-center gap-2.5">
      <input type="hidden" name="id" value={eventId} />
      <input type="hidden" name="isFeatured" value={isFeatured ? 'false' : 'true'} />
      <button
        type="submit"
        role="switch"
        aria-checked={isFeatured}
        aria-label={`${isFeatured ? 'Quitar de destacados' : 'Marcar como destacado'}: ${eventTitle}`}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
          isFeatured ? 'bg-mulberry' : 'bg-slate-300'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
            isFeatured ? 'translate-x-5' : 'translate-x-1'
          }`}
        />
      </button>
      <span className={`text-xs font-semibold ${isFeatured ? 'text-mulberry' : 'text-slate-500'}`}>
        {isFeatured ? 'Destacado' : 'Normal'}
      </span>
    </form>
  );
}

function CapacityIndicator({
  eventId,
  approved,
  minUsers,
  maxUsers,
}: {
  eventId: string;
  approved: number;
  minUsers: number;
  maxUsers: number;
}) {
  const normalizedMax = Math.max(0, maxUsers);
  const progress =
    normalizedMax > 0 ? Math.min(100, Math.round((approved / normalizedMax) * 100)) : 0;
  const remaining = Math.max(0, normalizedMax - approved);

  return (
    <div className="min-w-[10rem]">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-semibold tabular-nums text-slate-800">
          {approved} de {normalizedMax || '—'}
        </span>
        <span
          className={
            remaining === 0 && normalizedMax > 0
              ? 'font-semibold text-rose-700'
              : 'text-slate-500'
          }
        >
          {normalizedMax === 0
            ? 'Sin cupos definidos'
            : remaining === 0
              ? 'Completo'
              : `${remaining} libres`}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Cupos ocupados"
        aria-valuemin={0}
        aria-valuemax={normalizedMax || 1}
        aria-valuenow={Math.min(approved, normalizedMax || 1)}
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200"
      >
        <div
          className={`h-full rounded-full ${progress >= 100 ? 'bg-rose-500' : 'bg-mulberry'}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-3">
        <span className="text-[11px] text-slate-500">Mínimo {Math.max(0, minUsers)}</span>
        <Link
          href={`/admin/events/${eventId}/participants`}
          className="text-[11px] font-semibold text-mulberry transition hover:underline"
        >
          Ver inscripciones
        </Link>
      </div>
    </div>
  );
}

function EventActions({
  row,
  isUserSuperAdmin,
  promotionRecipientCount,
}: {
  row: AdminEventRow;
  isUserSuperAdmin: boolean;
  promotionRecipientCount: number;
}) {
  return (
    <div className="flex w-full items-center justify-between gap-2 lg:w-auto lg:justify-end">
      <Link
        href={`/admin/events/${row.id}/edit`}
        className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-mulberry/30 hover:bg-mulberry/5 hover:text-mulberry"
      >
        Editar
      </Link>
      <EventQuickActionsMenu
        eventId={row.id}
        eventTitle={row.title}
        isPublished={row.isPublished}
        canPromote={Boolean(isUserSuperAdmin && row.isPublished)}
        recipientCount={promotionRecipientCount}
      />
    </div>
  );
}

export default async function AdminEventsPage({ searchParams }: Props) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isUserSuperAdmin = isSuperAdmin(user as any);
  const canManageFeatured = isUserSuperAdmin;
  const statusFilter = resolveStatusFilter(searchParams?.status);
  const periodFilter = resolvePeriodFilter(searchParams?.period);
  const eventSort = resolveSort(searchParams?.dateOrder);
  const searchQuery = String(searchParams?.q || '').trim();
  const normalizedSearchTerms = normalizeSearchText(searchQuery).split(/\s+/).filter(Boolean);
  const queryDateOrder = eventSort === 'desc' ? 'desc' : 'asc';

  async function handleToggleFeatured(formData: FormData) {
    'use server';
    const id = String(formData.get('id') || '');
    const isFeatured = String(formData.get('isFeatured') || '') === 'true';
    await setEventFeatured(id, isFeatured);
  }

  async function handleTogglePublished(formData: FormData) {
    'use server';
    const id = String(formData.get('id') || '');
    const isPublished = String(formData.get('isPublished') || '') === 'true';
    await setEventPublished(id, isPublished);
  }

  const [events, promotionRecipientEmails] = await Promise.all([
    getEvents({ dateOrder: queryDateOrder, createdById: isUserSuperAdmin ? '' : user?.id || '' }),
    isUserSuperAdmin ? getAllUserEmailsForBroadcast() : Promise.resolve([]),
  ]);
  const normalizedEvents = events ?? [];
  const promotionRecipientCount = promotionRecipientEmails.length;
  const eventIds = normalizedEvents.map((event: any) => event.id);
  const [approvedParticipantsByEventId, eventIdsWithPaymentMethods] = await Promise.all([
    getApprovedParticipantsCountByEventIds(eventIds),
    getEventIdsWithActivePaymentMethods(supabase, eventIds),
  ]);
  const nowTimestamp = Date.now();

  function canPublishEvent(event: any) {
    const description =
      event?.description && typeof event.description === 'object'
        ? (event.description as Record<string, unknown>)
        : {};
    const location =
      event?.location && typeof event.location === 'object'
        ? (event.location as Record<string, unknown>)
        : {};

    return getEventPublishReadiness({
      title: event?.title,
      startTime: event?.start_time,
      endTime: event?.end_time,
      district: event?.district,
      locationText: event?.location_text,
      lat: location.lat,
      lng: location.lng ?? location.long,
      paymentMethodCount: eventIdsWithPaymentMethods.has(String(event?.id || '')) ? 1 : 0,
      isFieldReservedConfirmed: parseStoredBoolean(description.field_reserved_confirmed),
    }).isReady;
  }

  const allRows: AdminEventRow[] = normalizedEvents.map((event: any) => {
    const id = String(event?.id || '');
    const title = String(event?.title || '').trim() || 'Evento sin título';
    const start = parseDate(event?.start_time);
    const end = parseDate(event?.end_time);
    const anchorTimestamp = end?.getTime() ?? start?.getTime() ?? null;
    const locationLabel = resolveLocationLabel(event);

    return {
      id,
      title,
      dateLabel: formatDateRange(event?.start_time, event?.end_time),
      timeLabel: formatTimeRange(event?.start_time, event?.end_time),
      locationLabel,
      priceLabel: formatPrice(event?.price),
      minUsers: Number.isFinite(Number(event?.min_users)) ? Number(event.min_users) : 0,
      maxUsers: Number.isFinite(Number(event?.max_users)) ? Number(event.max_users) : 0,
      approvedParticipants: approvedParticipantsByEventId.get(id) ?? 0,
      isPublished: Boolean(event?.is_published),
      isFeatured: Boolean(event?.is_featured),
      isPast: anchorTimestamp !== null && anchorTimestamp < nowTimestamp,
      hasDate: anchorTimestamp !== null,
      startTimestamp: start?.getTime() ?? null,
      publishReady: canPublishEvent(event),
      searchText: normalizeSearchText(
        [title, locationLabel, event?.location_text, event?.place_text].filter(Boolean).join(' ')
      ),
    };
  });

  const filteredRows = sortEventRows(
    allRows.filter((row) => {
      const matchesSearch =
        normalizedSearchTerms.length === 0 ||
        normalizedSearchTerms.every((term) => row.searchText.includes(term));
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'published' ? row.isPublished : !row.isPublished);
      const matchesPeriod =
        periodFilter === 'all' ||
        (periodFilter === 'upcoming' ? row.hasDate && !row.isPast : row.isPast);
      return matchesSearch && matchesStatus && matchesPeriod;
    }),
    eventSort
  );

  const upcomingCount = allRows.filter((row) => row.hasDate && !row.isPast).length;
  const publishedCount = allRows.filter((row) => row.isPublished).length;
  const draftCount = allRows.length - publishedCount;
  const hasActiveFilters =
    Boolean(searchQuery) ||
    statusFilter !== 'all' ||
    periodFilter !== 'all' ||
    eventSort !== 'operational';
  const eventGridClass = canManageFeatured
    ? 'lg:grid-cols-[minmax(13rem,1.5fr)_minmax(9rem,0.9fr)_minmax(8rem,0.8fr)_minmax(11rem,1fr)_minmax(8rem,0.85fr)_auto]'
    : 'lg:grid-cols-[minmax(13rem,1.6fr)_minmax(9rem,0.9fr)_minmax(8rem,0.8fr)_minmax(11rem,1fr)_auto]';

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Eventos</h1>
          <p className="mt-1 text-sm text-slate-600">
            Gestiona la publicación, los cupos y las inscripciones desde un solo lugar.
          </p>
        </div>
        <Link
          href="/admin/events/new"
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-mulberry px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#470760] sm:w-auto"
        >
          Crear evento
        </Link>
      </div>

      <section aria-label="Resumen de eventos" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryMetric value={allRows.length} label="Eventos totales" />
        <SummaryMetric value={upcomingCount} label="Próximos" />
        <SummaryMetric value={publishedCount} label="Publicados" />
        <SummaryMetric value={draftCount} label="Borradores" />
      </section>

      <section
        aria-label="Filtrar eventos"
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.32)]"
      >
        <form
          action="/admin/events"
          method="get"
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(16rem,1.6fr)_minmax(10rem,0.75fr)_minmax(10rem,0.75fr)_minmax(11rem,0.85fr)_auto] xl:items-end"
        >
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Buscar</span>
            <input
              type="search"
              name="q"
              defaultValue={searchQuery}
              placeholder="Nombre o ubicación"
              className="peloteras-form-control h-11"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Estado</span>
            <select
              name="status"
              defaultValue={statusFilter}
              className="peloteras-form-control peloteras-form-control--select h-11"
            >
              <option value="all">Todos</option>
              <option value="published">Publicados</option>
              <option value="draft">Borradores</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Periodo</span>
            <select
              name="period"
              defaultValue={periodFilter}
              className="peloteras-form-control peloteras-form-control--select h-11"
            >
              <option value="all">Cualquier fecha</option>
              <option value="upcoming">Próximos</option>
              <option value="past">Finalizados</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Orden</span>
            <select
              name="dateOrder"
              defaultValue={eventSort}
              className="peloteras-form-control peloteras-form-control--select h-11"
            >
              <option value="operational">Próximos primero</option>
              <option value="asc">Fecha ascendente</option>
              <option value="desc">Fecha descendente</option>
            </select>
          </label>

          <div className="flex items-center gap-2 sm:col-span-2 xl:col-span-1">
            <button
              type="submit"
              className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 xl:flex-none"
            >
              Aplicar
            </button>
            {hasActiveFilters ? (
              <Link
                href="/admin/events"
                className="inline-flex h-11 items-center justify-center rounded-xl px-3 text-sm font-semibold text-mulberry transition hover:bg-mulberry/5"
              >
                Limpiar
              </Link>
            ) : null}
          </div>
        </form>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600" aria-live="polite">
          <strong className="text-slate-900">{filteredRows.length}</strong>{' '}
          {filteredRows.length === 1 ? 'evento encontrado' : 'eventos encontrados'}
          {filteredRows.length !== allRows.length ? ` de ${allRows.length}` : ''}
        </p>
      </div>

      {filteredRows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
          <h2 className="text-lg font-semibold text-slate-900">
            {allRows.length === 0 ? 'Todavía no hay eventos' : 'No encontramos eventos'}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            {allRows.length === 0
              ? 'Crea el primer evento para comenzar a gestionar inscripciones.'
              : 'Prueba con otro nombre, estado o periodo.'}
          </p>
          <Link
            href={allRows.length === 0 ? '/admin/events/new' : '/admin/events'}
            className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-mulberry px-5 text-sm font-semibold text-white transition hover:bg-[#470760]"
          >
            {allRows.length === 0 ? 'Crear primer evento' : 'Limpiar filtros'}
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_-34px_rgba(15,23,42,0.32)]">
          <div
            aria-hidden="true"
            className={`hidden gap-4 border-b border-slate-200 bg-slate-50/90 px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 lg:grid ${eventGridClass}`}
          >
            <span>Evento</span>
            <span>Fecha y hora</span>
            <span>Estado</span>
            <span>Inscripciones</span>
            {canManageFeatured ? <span>Visibilidad</span> : null}
            <span className="sr-only">Acciones</span>
          </div>

          <div role="list" className="divide-y divide-slate-100">
            {filteredRows.map((row) => (
              <article
                key={row.id}
                role="listitem"
                className={`grid gap-4 p-4 transition hover:bg-slate-50/70 lg:items-start lg:px-4 lg:py-4 ${eventGridClass}`}
              >
                <div className="min-w-0">
                  <Link
                    href={`/admin/events/${row.id}/edit`}
                    className="block truncate text-base font-semibold text-slate-900 transition hover:text-mulberry lg:text-sm"
                  >
                    {row.title}
                  </Link>
                  <p className="mt-1 truncate text-xs text-slate-500">{row.locationLabel}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700">{row.priceLabel}</span>
                    {row.isPast ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 lg:hidden">
                        Finalizado
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 lg:border-0 lg:pt-0">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 lg:hidden">
                    Fecha y hora
                  </p>
                  <p className="font-medium text-slate-800">{row.dateLabel}</p>
                  <p className="mt-1 text-xs text-slate-500">{row.timeLabel}</p>
                  {row.isPast ? (
                    <span className="mt-2 hidden rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 lg:inline-flex">
                      Finalizado
                    </span>
                  ) : null}
                </div>

                <div className="border-t border-slate-100 pt-3 lg:border-0 lg:pt-0">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 lg:hidden">
                    Publicación
                  </p>
                  <PublicationControl
                    eventId={row.id}
                    eventTitle={row.title}
                    isPublished={row.isPublished}
                    publishReady={row.publishReady}
                    onToggle={handleTogglePublished}
                  />
                </div>

                <div className="border-t border-slate-100 pt-3 lg:border-0 lg:pt-0">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 lg:hidden">
                    Inscripciones
                  </p>
                  <CapacityIndicator
                    eventId={row.id}
                    approved={row.approvedParticipants}
                    minUsers={row.minUsers}
                    maxUsers={row.maxUsers}
                  />
                </div>

                {canManageFeatured ? (
                  <div className="border-t border-slate-100 pt-3 lg:border-0 lg:pt-0">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 lg:hidden">
                      Visibilidad
                    </p>
                    <FeaturedControl
                      eventId={row.id}
                      eventTitle={row.title}
                      isFeatured={row.isFeatured}
                      onToggle={handleToggleFeatured}
                    />
                  </div>
                ) : null}

                <div className="border-t border-slate-100 pt-3 lg:border-0 lg:pt-0">
                  <EventActions
                    row={row}
                    isUserSuperAdmin={isUserSuperAdmin}
                    promotionRecipientCount={promotionRecipientCount}
                  />
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
