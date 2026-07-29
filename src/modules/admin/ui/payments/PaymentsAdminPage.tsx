import { getAssistantsCounts, getAssistantsWithDetails } from '@shared/lib/data/getAssistants';
import Badge from '@core/ui/Badge';
import { FunnelIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { getServerSupabase } from '@core/api/supabase.server';
import PaymentsEventSelect from './PaymentsEventSelect';
import { isSuperAdmin } from '@shared/lib/auth/isAdmin';
import ReimbursementsTab from './ReimbursementsTab';
import {
  getTeamRegistrationPaymentCounts,
  getTeamRegistrationPayments,
} from '@modules/admin/api/payments/teamRegistrations';
import TeamPaymentDecisionActions from './TeamPaymentDecisionActions';
import IndividualPaymentsList from './IndividualPaymentsList';

export default async function PaymentsAdminPage({
  searchParams,
}: {
  searchParams?: { state?: string; q?: string; event?: string };
}) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const canViewAllEvents = isSuperAdmin(user as any);
  const isReimbursementsTab = searchParams?.state === 'reimbursements';

  let eventsQuery = supabase.from('event').select('id,title,start_time');
  if (!canViewAllEvents) {
    eventsQuery = eventsQuery.eq('created_by_id', String(user?.id || ''));
  }
  const { data: rawEvents, error: eventsError } = await eventsQuery.order('start_time', {
    ascending: false,
  });

  const events = eventsError || !rawEvents ? [] : rawEvents;
  const eventOptions = events.map((event) => ({
    id: String(event.id),
    label: String(event.title || '').trim() || `Evento #${event.id}`,
  }));
  const requestedEvent = String(searchParams?.event || '').trim();
  const selectedEvent = events.find((event) => String(event.id) === requestedEvent) || null;
  const selectedEventId = selectedEvent ? String(selectedEvent.id) : '';
  const allowedEventIds = events.map((event) => String(event.id));

  const requestedState = searchParams?.state;
  const state: 'pending' | 'approved' | 'rejected' | 'cancelled' =
    requestedState === 'approved' || requestedState === 'rejected' || requestedState === 'cancelled'
      ? requestedState
      : 'pending';
  const q = searchParams?.q || '';
  const assistantEventScope = selectedEventId
    ? { eventId: selectedEventId }
    : canViewAllEvents
      ? {}
      : { eventIds: allowedEventIds };
  const teamEventScope = {
    eventId: selectedEventId || undefined,
    eventIds: canViewAllEvents ? null : allowedEventIds,
  };

  const [individualCounts, items, teamCounts, teamItems] = await Promise.all(
    !isReimbursementsTab
      ? [
          getAssistantsCounts(assistantEventScope),
          state === 'cancelled'
            ? Promise.resolve([])
            : getAssistantsWithDetails(state, {
                search: q,
                limit: 50,
                offset: 0,
                ...assistantEventScope,
              }),
          getTeamRegistrationPaymentCounts(teamEventScope),
          getTeamRegistrationPayments({ ...teamEventScope, state, search: q }),
        ]
      : [
          Promise.resolve({ pending: 0, approved: 0, rejected: 0, all: 0 }),
          Promise.resolve([]),
          Promise.resolve({ pending: 0, approved: 0, rejected: 0, cancelled: 0 }),
          Promise.resolve([]),
        ]
  );
  const counts = {
    pending: individualCounts.pending + teamCounts.pending,
    approved: individualCounts.approved + teamCounts.approved,
    rejected: individualCounts.rejected + teamCounts.rejected,
    cancelled: teamCounts.cancelled,
  };

  const selectedScopeLabel = selectedEvent
    ? String(selectedEvent.title || '').trim() || `Evento #${selectedEvent.id}`
    : 'Todos los eventos';
  const activeTab = isReimbursementsTab ? 'reimbursements' : state;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_-38px_rgba(15,23,42,0.35)]">
      <header className="border-b border-slate-200 bg-gradient-to-r from-white via-white to-mulberry/[0.035] px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-mulberry/70">
              Administración
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Pagos</h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
              Valida operaciones y sigue el abono de los cupones antes de confirmar cada inscripción.
            </p>
          </div>
          <p className="text-xs font-medium text-slate-500">
            Viendo <span className="font-bold text-slate-800">{selectedScopeLabel}</span>
          </p>
        </div>
      </header>

      <div className="p-4 sm:p-6">
        <section
          className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 lg:grid-cols-[minmax(17rem,0.8fr)_minmax(20rem,1.2fr)] lg:items-end"
          aria-label="Filtros de pagos"
        >
          <div>
            <label
              className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.1em] text-slate-600"
              htmlFor="payments-event-select"
            >
              <FunnelIcon className="h-4 w-4 text-mulberry" aria-hidden="true" />
              Evento
            </label>
            <PaymentsEventSelect
              options={eventOptions}
              selectedEventId={selectedEventId}
              state={isReimbursementsTab ? 'reimbursements' : state}
              q={q}
            />
          </div>

          {!isReimbursementsTab ? (
            <form className="flex flex-col gap-2 sm:flex-row lg:justify-end" action="/admin/payments" method="get">
              <label className="sr-only" htmlFor="payments-operation-search">
                Buscar por número de operación
              </label>
              <div className="relative min-w-0 flex-1 lg:max-w-md">
                <MagnifyingGlassIcon
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="payments-operation-search"
                  name="q"
                  defaultValue={q}
                  placeholder="Buscar por número de operación"
                  inputMode="numeric"
                  className="peloteras-form-control h-11 pl-9 pr-3"
                />
              </div>
              <input type="hidden" name="state" value={state} />
              {selectedEventId ? <input type="hidden" name="event" value={selectedEventId} /> : null}
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-mulberry px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#470760] focus:outline-none focus:ring-2 focus:ring-mulberry/25 focus:ring-offset-2"
              >
                Buscar
              </button>
              {q.trim() ? (
                <Link
                  href={{
                    pathname: '/admin/payments',
                    query: {
                      ...(selectedEventId ? { event: selectedEventId } : {}),
                      state,
                    },
                  }}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Limpiar
                </Link>
              ) : null}
            </form>
          ) : (
            <p className="text-sm leading-relaxed text-slate-600 lg:text-right">
              Revisa los abonos solicitados por las organizadoras y actualiza su envío.
            </p>
          )}
        </section>

        <nav
          className="mt-5 flex gap-2 overflow-x-auto border-b border-slate-200 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Estados de pago"
        >
          {[
            { k: 'pending', label: 'Pendientes', count: counts.pending },
            { k: 'approved', label: 'Aprobados', count: counts.approved },
            { k: 'rejected', label: 'Rechazados', count: counts.rejected },
            { k: 'cancelled', label: 'Cancelados', count: counts.cancelled },
            ...(canViewAllEvents
              ? [{ k: 'reimbursements', label: 'Reembolsos', count: null }]
              : []),
          ].map((tab) => {
            const isActive = activeTab === tab.k;
            return (
              <Link
                key={tab.k}
                href={{
                  pathname: '/admin/payments',
                  query: {
                    ...(selectedEventId ? { event: selectedEventId } : {}),
                    state: tab.k,
                    ...(q ? { q } : {}),
                  },
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
                  isActive
                    ? 'border-mulberry bg-mulberry text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-mulberry/30 hover:bg-mulberry/[0.035] hover:text-mulberry'
                }`}
              >
                {tab.label}
                {typeof tab.count === 'number' ? (
                  <span
                    className={`inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        {isReimbursementsTab ? (
          <div className="mt-5">
            <ReimbursementsTab eventId={selectedEventId} />
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {teamItems.length > 0 ? (
            <section className="overflow-hidden rounded-2xl border border-mulberry/15 bg-white">
              <div className="flex flex-col gap-1 border-b border-mulberry/10 bg-mulberry/[0.045] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div>
                  <h2 className="font-bold text-slate-950">Pagos grupales</h2>
                  <p className="mt-0.5 text-xs text-slate-600">
                    Una decisión actualiza a todo el plantel y sus entradas.
                  </p>
                </div>
                <span className="text-xs font-semibold text-mulberry">
                  {teamItems.length} {teamItems.length === 1 ? 'registro visible' : 'registros visibles'}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[980px] w-full text-sm">
                  <thead className="bg-slate-50/90">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Operación</th>
                      {!selectedEventId ? <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Evento</th> : null}
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Equipo / capitana</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Plantel</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Total</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Estado</th>
                      <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamItems.map((registration) => (
                      <tr key={registration.id} className="border-t border-slate-200 transition-colors hover:bg-slate-50/70">
                        <td className="px-4 py-3 font-mono text-xs">{registration.operationNumber}</td>
                        {!selectedEventId ? (
                          <td className="px-4 py-3">
                            <a
                              href={`/events/${registration.eventId}`}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-mulberry hover:underline underline-offset-2"
                            >
                              {registration.eventTitle}
                            </a>
                          </td>
                        ) : null}
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">{registration.teamName}</p>
                          <p className="text-xs text-slate-500">Capitana: @{registration.captainName}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold">{registration.participantCount} jugadoras</p>
                          <p className="max-w-xs truncate text-xs text-slate-500" title={registration.memberNames.map((name) => `@${name}`).join(', ')}>
                            {registration.memberNames.map((name) => `@${name}`).join(', ')}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold">S/ {registration.totalAmount.toFixed(2)}</p>
                          <p className="text-xs text-slate-500">{registration.priceMode === 'fixed_team' ? 'Fijo por equipo' : `S/ ${registration.unitPrice.toFixed(2)} por jugadora`}</p>
                          {registration.paymentMethodName ? <p className="text-xs text-slate-500">{registration.paymentMethodName}</p> : null}
                        </td>
                        <td className="px-4 py-3">
                          {registration.state === 'approved' ? <Badge badgeType="Third" text="Aprobado" icon={false} /> : registration.state === 'rejected' ? <Badge badgeType="Secondary" text="Rechazado" icon={false} /> : registration.state === 'cancelled' ? <Badge badgeType="Secondary" text="Cancelado" icon={false} /> : <Badge badgeType="Primary" text="Pendiente" icon={false} />}
                          {registration.rejectReason ? <p className="mt-1 max-w-xs text-xs text-rose-700">{registration.rejectReason}</p> : null}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {registration.state === 'pending' ? <TeamPaymentDecisionActions registrationId={registration.id} /> : <span className="text-xs text-slate-500">Sin acciones</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            ) : null}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="flex flex-col gap-1 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div>
                  <h2 className="font-bold text-slate-950">Pagos individuales</h2>
                  <p className="mt-0.5 text-xs text-slate-600">
                    El monto y el avance del cupón se muestran por separado para evitar aprobaciones incompletas.
                  </p>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  {items.length} {items.length === 1 ? 'registro visible' : 'registros visibles'}
                </span>
              </div>
              <IndividualPaymentsList
                items={items}
                hasTeamItems={teamItems.length > 0}
                selectedEventId={selectedEventId}
              />
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
