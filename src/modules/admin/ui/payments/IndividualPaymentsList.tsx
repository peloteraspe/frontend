import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  TicketIcon,
} from '@heroicons/react/24/outline';
import Badge, { StatusBadge } from '@core/ui/Badge';
import type { AssistantDetails } from '@shared/lib/data/getAssistants';
import {
  canApproveCouponPayment,
  canRequestCouponReimbursement,
  getCouponReimbursementStatusLabel,
  getCouponReimbursementStatusVariant,
  type CouponReimbursementStatus,
} from '@modules/payments/lib/couponReimbursement';
import PaymentDecisionActions from './PaymentDecisionActions';
import CouponReimbursementRequestButton from './CouponReimbursementRequestButton';

type Props = {
  items: AssistantDetails[];
  hasTeamItems: boolean;
  selectedEventId: string;
};

const PAYMENT_TIME_ZONE = 'America/Lima';

function formatCurrency(value: number) {
  return `S/ ${Number(value || 0).toFixed(2)}`;
}

function formatPaymentDate(value: string) {
  if (!value) return 'Fecha no disponible';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';

  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: PAYMENT_TIME_ZONE,
  }).format(date);
}

function getCouponFlowStep(status: CouponReimbursementStatus) {
  if (status === 'not_requested') return 1;
  if (status === 'requested') return 2;
  return 3;
}

function PaymentReference({ payment }: { payment: AssistantDetails }) {
  return (
    <div className="min-w-[11rem]">
      <p className="font-mono text-sm font-semibold tracking-tight text-slate-900">
        {payment.operationNumber ? `Op. ${payment.operationNumber}` : 'Sin número de operación'}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        #{payment.id} · {formatPaymentDate(payment.created_at)}
      </p>

      {payment.coupon ? (
        <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-xl border border-sky-200/80 bg-sky-50 px-2.5 py-2 text-sky-950">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
            <TicketIcon className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-sky-700">
              Cupón aplicado
            </span>
            <span className="block truncate text-xs font-bold">{payment.coupon.couponCode}</span>
          </span>
        </div>
      ) : null}
    </div>
  );
}

function PaymentAmount({ payment }: { payment: AssistantDetails }) {
  const price = Number(payment.eventPrice ?? 0);
  const discount = Number(payment.coupon?.discountApplied ?? 0);
  const amountPaid = Math.max(price - discount, 0);

  if (!price && !discount) {
    return <span className="text-sm text-slate-400">Monto no disponible</span>;
  }

  return (
    <div className="min-w-[9.5rem]">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
        {discount > 0 ? 'Pagado por jugadora' : 'Total a validar'}
      </p>
      <p className="mt-0.5 text-lg font-bold tracking-tight text-slate-950">
        {formatCurrency(amountPaid)}
      </p>
      {discount > 0 ? (
        <dl className="mt-2 space-y-1 border-t border-slate-200 pt-2 text-xs">
          <div className="flex justify-between gap-3 text-slate-500">
            <dt>Precio</dt>
            <dd>{formatCurrency(price)}</dd>
          </div>
          <div className="flex justify-between gap-3 font-semibold text-sky-700">
            <dt>Cupón</dt>
            <dd>− {formatCurrency(discount)}</dd>
          </div>
        </dl>
      ) : null}
    </div>
  );
}

function PaymentStatus({ payment }: { payment: AssistantDetails }) {
  return (
    <div className="min-w-[10rem]">
      {payment.state === 'approved' ? (
        <Badge badgeType="Third" text="Aprobado" icon={false} />
      ) : payment.state === 'rejected' ? (
        <Badge badgeType="Secondary" text="Rechazado" icon={false} />
      ) : (
        <Badge badgeType="Primary" text="Pendiente" icon={false} />
      )}

      {payment.coupon ? (
        <div className="mt-3 border-l-2 border-sky-200 pl-2.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
            Abono del cupón
          </p>
          <div className="mt-1">
            <StatusBadge
              variant={getCouponReimbursementStatusVariant(payment.coupon.reimbursementStatus)}
              size="sm"
              className="whitespace-nowrap"
            >
              {getCouponReimbursementStatusLabel(payment.coupon.reimbursementStatus)}
            </StatusBadge>
          </div>
          {payment.coupon.reimbursementStatus !== 'canceled' ? (
            <p className="mt-1.5 text-[11px] font-medium text-slate-500">
              Paso {getCouponFlowStep(payment.coupon.reimbursementStatus)} de 3
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function EventSummary({ payment }: { payment: AssistantDetails }) {
  const eventId = Number(payment.event);
  const eventHref = Number.isInteger(eventId) && eventId > 0 ? `/events/${eventId}` : null;
  const eventLabel = String(payment.eventTitle || '').trim() || `Evento #${payment.event}`;

  return (
    <div className="min-w-[11rem]">
      {eventHref ? (
        <a
          href={eventHref}
          target="_blank"
          rel="noreferrer"
          className="font-semibold leading-snug text-mulberry hover:underline hover:underline-offset-4"
          title={`Abrir ${eventLabel}`}
        >
          {eventLabel}
        </a>
      ) : (
        <span className="font-semibold leading-snug text-slate-900">{eventLabel}</span>
      )}
      {payment.eventDate ? (
        <span className="mt-1 block max-w-[14rem] text-xs leading-relaxed text-slate-500">
          {payment.eventDate}
        </span>
      ) : null}
    </div>
  );
}

function PlayerSummary({ payment }: { payment: AssistantDetails }) {
  const displayName = String(payment.userName || '').trim();

  return (
    <div className="min-w-[8rem]">
      <p className="font-semibold text-slate-900">{displayName ? `@${displayName}` : 'Sin usuario'}</p>
      {!displayName ? (
        <p className="mt-1 max-w-[10rem] truncate text-xs text-slate-500" title={payment.user}>
          {payment.user}
        </p>
      ) : null}
    </div>
  );
}

function CouponNextStep({
  payment,
  status,
}: {
  payment: AssistantDetails;
  status: CouponReimbursementStatus;
}) {
  const coupon = payment.coupon!;
  const allowApprove = canApproveCouponPayment(status);
  const allowRequest = canRequestCouponReimbursement(status);

  const notice =
    status === 'not_requested'
      ? {
          icon: ExclamationTriangleIcon,
          title: 'Falta solicitar el abono',
          body: `Solicita a Peloteras los ${formatCurrency(coupon.discountApplied)} cubiertos por el cupón.`,
          tone: 'border-amber-200 bg-amber-50 text-amber-950',
          iconTone: 'bg-amber-100 text-amber-700',
        }
      : status === 'requested'
        ? {
            icon: ClockIcon,
            title: 'Esperando a Peloteras',
            body: 'La solicitud ya fue enviada. Podrás aprobar cuando el abono figure como enviado.',
            tone: 'border-amber-200 bg-amber-50 text-amber-950',
            iconTone: 'bg-amber-100 text-amber-700',
          }
        : status === 'sent' || status === 'confirmed'
          ? {
              icon: CheckCircleIcon,
              title: 'Listo para decidir',
              body: 'El abono del cupón ya fue enviado. Revisa la operación y confirma el pago.',
              tone: 'border-emerald-200 bg-emerald-50 text-emerald-950',
              iconTone: 'bg-emerald-100 text-emerald-700',
            }
          : {
              icon: ExclamationTriangleIcon,
              title: 'Flujo de cupón cancelado',
              body: 'Este pago ya no puede aprobarse con el cupón aplicado.',
              tone: 'border-rose-200 bg-rose-50 text-rose-950',
              iconTone: 'bg-rose-100 text-rose-700',
            };
  const NoticeIcon = notice.icon;

  return (
    <div className="flex min-w-[16rem] max-w-[19rem] flex-col items-stretch gap-2.5">
      <div className={`rounded-xl border px-3 py-2.5 ${notice.tone}`}>
        <div className="flex gap-2.5">
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${notice.iconTone}`}>
            <NoticeIcon className="h-4 w-4" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-xs font-bold">{notice.title}</span>
            <span className="mt-0.5 block text-[11px] leading-relaxed opacity-80">{notice.body}</span>
          </span>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        {allowRequest ? (
          <CouponReimbursementRequestButton redemptionId={coupon.redemptionId} />
        ) : null}
        <PaymentDecisionActions
          assistantId={payment.id}
          allowApprove={allowApprove}
          allowReject
        />
      </div>
    </div>
  );
}

function PaymentActions({ payment }: { payment: AssistantDetails }) {
  if (payment.state !== 'pending') {
    return <span className="text-xs font-medium text-slate-500">No requiere acciones</span>;
  }

  if (!payment.coupon) {
    return <PaymentDecisionActions assistantId={payment.id} />;
  }

  return (
    <CouponNextStep
      payment={payment}
      status={payment.coupon.reimbursementStatus}
    />
  );
}

function MobileField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      {children}
    </div>
  );
}

export default function IndividualPaymentsList({
  items,
  hasTeamItems,
  selectedEventId,
}: Props) {
  if (items.length === 0) {
    return (
      <div className="px-5 py-14 text-center">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <TicketIcon className="h-5 w-5" aria-hidden="true" />
        </span>
        <p className="mt-3 text-sm font-semibold text-slate-800">No encontramos pagos individuales</p>
        <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">
          {hasTeamItems
            ? 'Sí hay pagos grupales con el filtro actual.'
            : selectedEventId
              ? 'Prueba cambiando el estado, la búsqueda o el evento seleccionado.'
              : 'Prueba cambiando el estado o limpiando la búsqueda.'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto 2xl:block">
        <table className="min-w-[1180px] w-full table-auto text-sm">
          <thead className="border-y border-slate-200 bg-slate-50/90">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                Pago
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                Monto
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                Estado
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                Evento
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                Jugadora
              </th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                Próximo paso
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {items.map((payment) => (
              <tr
                key={payment.id}
                className={
                  payment.coupon
                    ? 'bg-sky-50/30 align-top transition-colors hover:bg-sky-50/60'
                    : 'align-top transition-colors hover:bg-slate-50/70'
                }
              >
                <td className="px-4 py-4"><PaymentReference payment={payment} /></td>
                <td className="px-4 py-4"><PaymentAmount payment={payment} /></td>
                <td className="px-4 py-4"><PaymentStatus payment={payment} /></td>
                <td className="px-4 py-4"><EventSummary payment={payment} /></td>
                <td className="px-4 py-4"><PlayerSummary payment={payment} /></td>
                <td className="px-4 py-4 text-right"><PaymentActions payment={payment} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-slate-200 2xl:hidden">
        {items.map((payment) => (
          <article
            key={payment.id}
            className={payment.coupon ? 'bg-sky-50/30 p-4 sm:p-5' : 'p-4 sm:p-5'}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <PaymentReference payment={payment} />
              <PaymentStatus payment={payment} />
            </div>

            <div className="mt-5 grid gap-4 border-y border-slate-200 py-4 sm:grid-cols-3 xl:grid-cols-[minmax(9rem,1fr)_minmax(10rem,1fr)_minmax(8rem,0.8fr)_minmax(16rem,19rem)] xl:items-start">
              <MobileField label="Monto"><PaymentAmount payment={payment} /></MobileField>
              <MobileField label="Evento"><EventSummary payment={payment} /></MobileField>
              <MobileField label="Jugadora"><PlayerSummary payment={payment} /></MobileField>
              <div className="hidden xl:block">
                <MobileField label="Próximo paso"><PaymentActions payment={payment} /></MobileField>
              </div>
            </div>

            <div className="mt-4 flex justify-end xl:hidden">
              <PaymentActions payment={payment} />
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
