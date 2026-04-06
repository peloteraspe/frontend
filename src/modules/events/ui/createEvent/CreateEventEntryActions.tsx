'use client';

import Link from 'next/link';
import { trackEvent } from '@shared/lib/analytics';

type DraftSummary = {
  id: string;
  title: string;
  createdAt: string | null;
  startTime: string | null;
};

type DashboardAction = {
  key: string;
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
  href: string;
  eventName: string;
  payload?: Record<string, unknown>;
  tone?: 'primary' | 'secondary' | 'neutral';
};

type Props = {
  paymentMethodsReady: boolean;
  activePaymentMethodCount: number;
  latestDraft: DraftSummary | null;
  draftCount: number;
  publishedEventCount: number;
};

function ActionCard({
  eyebrow,
  title,
  description,
  ctaLabel,
  href,
  eventName,
  payload,
  tone = 'secondary',
}: Omit<DashboardAction, 'key'>) {
  const isPrimary = tone === 'primary';
  const isNeutral = tone === 'neutral';

  return (
    <div
      className={[
        'rounded-[18px] px-5 py-4 ring-1 transition',
        isPrimary
          ? 'bg-mulberry/[0.045] ring-mulberry/12'
          : isNeutral
            ? 'bg-slate-50/85 ring-slate-200/70'
            : 'bg-white/88 ring-slate-200/70 backdrop-blur',
      ].join(' ')}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p
            className={[
              'text-[11px] font-semibold uppercase tracking-[0.16em]',
              isPrimary ? 'text-mulberry/80' : 'text-slate-500',
            ].join(' ')}
          >
            {eyebrow}
          </p>
          <h2 className="mt-1 text-base font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
        <Link
          href={href}
          onClick={() => {
            trackEvent(eventName, {
              channel: 'web',
              source: 'create_event_dashboard',
              ...payload,
            });
          }}
          className={[
            'inline-flex h-10 shrink-0 items-center rounded-xl px-4 text-sm font-semibold transition',
            isPrimary
              ? 'bg-mulberry text-white hover:bg-[#470760]'
              : 'border border-slate-300/90 bg-white text-slate-700 hover:bg-slate-50',
          ].join(' ')}
        >
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}

export default function CreateEventEntryActions({
  paymentMethodsReady,
  activePaymentMethodCount,
  latestDraft,
  draftCount,
  publishedEventCount,
}: Props) {
  const paymentHref = '/admin/payment-methods?returnTo=%2Fcreate-event';
  const latestDraftHref = latestDraft ? `/admin/events/${latestDraft.id}/edit` : '/admin/events/new';
  const hasDraft = Boolean(latestDraft);
  const hasPublishedEvents = publishedEventCount > 0;

  const primaryAction: DashboardAction = hasDraft
    ? {
        key: 'resume-draft',
        eyebrow: 'Sigue aquí',
        title: 'Continuar tu borrador',
        description: paymentMethodsReady
          ? 'Retoma el evento que ya empezaste y déjalo listo para publicar.'
          : 'Sigue avanzando con fecha, hora y cancha. Podrás dejar el cobro listo cuando quieras.',
        ctaLabel: 'Continuar borrador',
        href: latestDraftHref,
        eventName: 'create_event_resume_draft_clicked',
        payload: {
          draft_id: latestDraft?.id,
          payment_methods_ready: paymentMethodsReady,
          draft_count: draftCount,
        },
        tone: 'primary',
      }
    : paymentMethodsReady
      ? {
          key: 'new-draft-ready',
          eyebrow: 'Sigue aquí',
          title: hasPublishedEvents ? 'Crear otro evento' : 'Crear tu evento',
          description: hasPublishedEvents
            ? 'Ya está todo listo para seguir organizando.'
            : 'Ya está todo listo para empezar.',
          ctaLabel: hasPublishedEvents ? 'Nuevo evento' : 'Empezar evento',
          href: '/admin/events/new',
          eventName: 'create_event_draft_started',
          payload: {
            source_state: 'dashboard_ready',
            payment_methods_ready: true,
          },
          tone: 'primary',
        }
      : {
          key: 'payment-setup',
          eyebrow: 'Sigue aquí',
          title: 'Configurar método de pago',
          description: hasPublishedEvents
            ? 'Deja listo Yape, Plin o ambos para que tu siguiente evento quede publicable sin fricciones.'
            : 'Deja listo Yape, Plin o ambos para que tu evento salga publicable sin fricciones.',
          ctaLabel: 'Ir a formas de pago',
          href: paymentHref,
          eventName: 'create_event_payment_setup_clicked',
          payload: {
            intent: 'setup',
            payment_methods_ready: false,
          },
          tone: 'primary',
        };

  const secondaryAction: DashboardAction = hasDraft
    ? paymentMethodsReady
      ? {
          key: 'new-draft-secondary',
          eyebrow: draftCount > 1 ? `${draftCount} borradores activos` : 'También puedes',
          title: 'Crear otro borrador',
          description: 'Si este evento ya está encaminado, puedes abrir otro sin perder el progreso actual.',
          ctaLabel: 'Nuevo borrador',
          href: '/admin/events/new',
          eventName: 'create_event_draft_started',
          payload: {
            source_state: 'dashboard_in_progress',
            payment_methods_ready: true,
          },
          tone: 'secondary',
        }
      : {
          key: 'payment-secondary',
          eyebrow: 'También puedes',
          title: 'Dejar listo el cobro',
          description:
            'Todavía no tienes un método activo. Agrégalo ahora para que publicar sea solo el último paso.',
          ctaLabel: 'Configurar cobro',
          href: paymentHref,
          eventName: 'create_event_payment_setup_clicked',
          payload: {
            intent: 'setup',
            payment_methods_ready: false,
            draft_id: latestDraft?.id,
          },
          tone: 'secondary',
        }
    : paymentMethodsReady
      ? {
          key: 'payment-manage',
          eyebrow: 'También puedes',
          title: 'Gestionar formas de pago',
          description: 'Revisa QR, número o combinaciones activas antes de publicar tu evento.',
          ctaLabel: 'Gestionar cobro',
          href: paymentHref,
          eventName: 'create_event_payment_setup_clicked',
          payload: {
            intent: 'manage',
            payment_methods_ready: true,
            active_payment_method_count: activePaymentMethodCount,
          },
          tone: 'secondary',
        }
      : {
          key: 'new-draft-secondary',
          eyebrow: 'También puedes',
          title: hasPublishedEvents ? 'Crear otro evento' : 'Empezar tu evento',
          description: hasPublishedEvents
            ? 'Empieza otro evento por fecha, hora y cancha. Luego completas lo demás.'
            : 'Empieza por fecha, hora y cancha. Luego completas lo demás.',
          ctaLabel: hasPublishedEvents ? 'Nuevo evento' : 'Empezar evento',
          href: '/admin/events/new',
          eventName: 'create_event_draft_started',
          payload: {
            source_state: 'dashboard_payment_pending',
            payment_methods_ready: false,
          },
          tone: 'secondary',
        };

  const tertiaryAction: DashboardAction | null =
    publishedEventCount > 0
      ? {
          key: 'events-list',
          eyebrow: 'Ver eventos',
          title: 'Ver y gestionar tus eventos',
          description: 'Revisa publicaciones activas, duplica formatos que te funcionen y sigue construyendo recurrencia.',
          ctaLabel: 'Ir a mis eventos',
          href: '/admin/events',
          eventName: 'create_event_events_list_clicked',
          payload: {
            published_event_count: publishedEventCount,
          },
          tone: 'neutral',
        }
      : null;

  return (
    <div className="mt-8 grid gap-3">
      <ActionCard {...primaryAction} />
      <ActionCard {...secondaryAction} />
      {tertiaryAction ? <ActionCard {...tertiaryAction} /> : null}
    </div>
  );
}
