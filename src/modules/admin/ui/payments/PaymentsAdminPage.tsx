import { getAssistantsCounts, getAssistantsWithDetails } from '@shared/lib/data/getAssistants';
import Badge from '@core/ui/Badge';
import { StatusBadge } from '@core/ui/Badge';
import Link from 'next/link';
import { getServerSupabase } from '@core/api/supabase.server';
import PaymentsEventSelect from './PaymentsEventSelect';
import { isSuperAdmin } from '@shared/lib/auth/isAdmin';
import PaymentDecisionActions from './PaymentDecisionActions';
import ReimbursementsTab from './ReimbursementsTab';
import CouponReimbursementRequestButton from './CouponReimbursementRequestButton';
import {
  canApproveCouponPayment,
  canRequestCouponReimbursement,
  getCouponReimbursementStatusLabel,
  getCouponReimbursementStatusVariant,
} from '@modules/payments/lib/couponReimbursement';

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
  if (!canViewAllEvents && user?.id) {
    eventsQuery = eventsQuery.eq('created_by_id', user.id);
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
  const selectedEvent =
    events.find((event) => String(event.id) === requestedEvent) || (events.length > 0 ? events[0] : null);
  const selectedEventId = selectedEvent ? String(selectedEvent.id) : '';

  const requestedState = searchParams?.state;
  const state: 'pending' | 'approved' | 'rejected' =
    requestedState === 'approved' || requestedState === 'rejected' ? requestedState : 'pending';
  const q = searchParams?.q || '';

  const [counts, items] = await Promise.all(
    selectedEventId && !isReimbursementsTab
      ? [
          getAssistantsCounts({ eventId: selectedEventId }),
          getAssistantsWithDetails(state, { search: q, limit: 50, offset: 0, eventId: selectedEventId }),
        ]
      : [Promise.resolve({ pending: 0, approved: 0, rejected: 0, all: 0 }), Promise.resolve([])]
  );

  return (
    <div className="rounded-md bg-white shadow">
      <div className="mb-3 flex flex-col gap-2">
        <div className="flex flex-col md:flex-row md:items-center gap-2">
          <label className="text-sm font-medium text-slate-700">Evento:</label>
          <PaymentsEventSelect
            options={eventOptions}
            selectedEventId={selectedEventId}
            state={isReimbursementsTab ? 'reimbursements' : state}
            q={q}
          />
        </div>

        <div className="text-xs text-slate-600">
          Mostrando pagos de: <strong>{selectedEvent ? String(selectedEvent.title || '').trim() || `Evento #${selectedEvent.id}` : '-'}</strong>
        </div>
      </div>

      <div className="mb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div className="flex gap-2 flex-wrap">
          {[
            { k: 'pending', l: `Pendientes (${counts.pending})` },
            { k: 'approved', l: `Aprobados (${counts.approved})` },
            { k: 'rejected', l: `Rechazados (${counts.rejected})` },
            ...(canViewAllEvents
              ? [{ k: 'reimbursements', l: 'Reembolsos' }]
              : []),
          ].map((t) => (
            <Link
              key={t.k}
              href={{
                pathname: '/admin/payments',
                query: q
                  ? { event: selectedEventId, state: t.k, q }
                  : { event: selectedEventId, state: t.k },
              }}
              className={`px-3 py-2 rounded-md text-sm border ${
                (isReimbursementsTab ? 'reimbursements' : state) === t.k
                  ? 'bg-mulberry text-white border-mulberry'
                  : 'bg-white text-mulberry border-mulberry'
              }`}
            >
              {t.l}
            </Link>
          ))}
        </div>
        {!isReimbursementsTab && (
          <form className="md:w-72 flex gap-2" action="/admin/payments" method="get">
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar operación..."
              className="peloteras-form-control h-9 px-3"
            />
            <input type="hidden" name="state" value={state} />
            <input type="hidden" name="event" value={selectedEventId} />
            <button
              type="submit"
              className="h-9 px-3 rounded-md bg-mulberry text-white text-sm font-medium whitespace-nowrap"
              disabled={!selectedEventId}
            >
              Buscar
            </button>
            {q.trim() ? (
              <Link
                href={{ pathname: '/admin/payments', query: { event: selectedEventId, state } }}
                className="h-9 px-3 rounded-md border border-slate-300 text-slate-700 text-sm font-medium whitespace-nowrap inline-flex items-center"
              >
                Limpiar
              </Link>
            ) : null}
          </form>
        )}
      </div>

      {isReimbursementsTab ? (
        <ReimbursementsTab eventId={selectedEventId} />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">ID</th>
                <th className="px-4 py-2 text-left">Fecha</th>
                <th className="px-4 py-2 text-left">Operación</th>
                <th className="px-4 py-2 text-left">Monto</th>
                <th className="px-4 py-2 text-left">Estado</th>
                <th className="px-4 py-2 text-left">Evento</th>
                <th className="px-4 py-2 text-left">Usuario</th>
                <th className="px-4 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr className="border-t">
                  <td className="px-4 py-4 text-sm text-slate-500" colSpan={8}>
                    {selectedEventId
                      ? 'No hay pagos para este evento con el filtro actual.'
                      : 'Selecciona un evento para ver pagos.'}
                  </td>
                </tr>
              ) : null}
              {items.map((a) => {
                const isPending = a.state === 'pending';
                const hasCoupon = !!a.coupon;
                const couponStatus = a.coupon?.reimbursementStatus;
                const allowCouponApproval = couponStatus ? canApproveCouponPayment(couponStatus) : false;
                const allowCouponRequest = couponStatus ? canRequestCouponReimbursement(couponStatus) : false;
                const eventId = Number(a.event);
                const eventHref = Number.isInteger(eventId) && eventId > 0 ? `/events/${eventId}` : null;
                const eventLabel = String(a.eventTitle || '').trim() || `Evento #${a.event}`;
                return (
                  <tr key={a.id} className="border-t">
                    <td className="px-4 py-2">{a.id}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-slate-600">
                      {a.created_at
                        ? new Intl.DateTimeFormat('es-PE', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                            timeZone: 'America/Lima',
                          }).format(new Date(a.created_at))
                        : '-'}
                    </td>
                    <td className="px-4 py-2">
                      {hasCoupon ? (
                        <div className="flex flex-col gap-1">
                          <StatusBadge variant="info" size="sm">
                            Cupón: {a.coupon!.couponCode}
                          </StatusBadge>
                          <span className="text-xs text-slate-500">
                            Descuento: S/. {a.coupon!.discountApplied.toFixed(2)}
                          </span>
                          {a.operationNumber && (
                            <span className="text-xs text-slate-500">Op: {a.operationNumber}</span>
                          )}
                        </div>
                      ) : (
                        <span>{a.operationNumber}</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {(() => {
                        const price = Number(a.eventPrice ?? 0);
                        const discount = a.coupon?.discountApplied ?? 0;
                        const paid = Math.max(price - discount, 0);
                        if (!price && !discount) return <span className="text-slate-400">-</span>;
                        return (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium">S/. {paid.toFixed(2)}</span>
                            {discount > 0 && (
                              <span className="text-xs text-slate-500">
                                (Precio: S/. {price.toFixed(2)})
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-col gap-1">
                        {a.state === 'approved' ? (
                          <Badge badgeType="Third" text="Aprobado" icon={false} />
                        ) : a.state === 'rejected' ? (
                          <Badge badgeType="Secondary" text="Rechazado" icon={false} />
                        ) : (
                          <Badge badgeType="Primary" text="Pendiente" icon={false} />
                        )}
                        {hasCoupon && (
                          <StatusBadge
                            variant={getCouponReimbursementStatusVariant(a.coupon!.reimbursementStatus)}
                            size="sm"
                          >
                            {getCouponReimbursementStatusLabel(a.coupon!.reimbursementStatus)}
                          </StatusBadge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-col">
                        {eventHref ? (
                          <a
                            href={eventHref}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-mulberry hover:underline underline-offset-2"
                            title={`Abrir ${eventLabel}`}
                          >
                            {eventLabel}
                          </a>
                        ) : (
                          <span className="font-medium">{eventLabel}</span>
                        )}
                        {a.eventDate && <span className="text-xs text-gray-500">{a.eventDate}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-2">{a.userName || a.user}</td>
                    <td className="px-4 py-2 text-right">
                      {isPending && !hasCoupon ? (
                        <PaymentDecisionActions assistantId={a.id} />
                      ) : isPending && hasCoupon ? (
                        <div className="inline-flex flex-col items-end gap-2">
                          {allowCouponRequest ? (
                            <CouponReimbursementRequestButton redemptionId={a.coupon!.redemptionId} />
                          ) : null}
                          <PaymentDecisionActions
                            assistantId={a.id}
                            allowApprove={allowCouponApproval}
                            allowReject
                          />
                          {!allowCouponApproval ? (
                            <p className="max-w-[17rem] text-right text-xs text-slate-500">
                              {couponStatus === 'requested'
                                ? 'Esperando que Peloteras marque el abono como enviado.'
                                : couponStatus === 'not_requested'
                                  ? 'Revisa el caso y solicita a Peloteras el monto cubierto por el cupón.'
                                  : 'Aún no se puede aprobar este pago.'}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-xs font-medium text-slate-500">Sin acciones</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
