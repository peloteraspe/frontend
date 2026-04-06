import { redirect } from 'next/navigation';
import CreateEventActivationGateway from '@modules/events/ui/createEvent/CreateEventActivationGateway';
import CreateEventEntryActions from '@modules/events/ui/createEvent/CreateEventEntryActions';
import CreateEventEntryTracker from '@modules/events/ui/createEvent/CreateEventEntryTracker';
import {
  type CreateEventDraftSummary,
  resolveCreateEventEntryState,
} from '@modules/events/lib/createEventEntry.server';

type PageSearchParams = {
  activated?: string;
};

export const dynamic = 'force-dynamic';
const DEFAULT_TIMEZONE = 'America/Lima';

function formatDashboardDateTime(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: DEFAULT_TIMEZONE,
  }).format(parsed);
}

function resolveEntryState({
  paymentMethodsReady,
  latestDraft,
}: {
  paymentMethodsReady: boolean;
  latestDraft: CreateEventDraftSummary | null;
}) {
  if (latestDraft) return 'dashboard_in_progress' as const;
  if (!paymentMethodsReady) return 'dashboard_payment_pending' as const;
  return 'dashboard_ready' as const;
}

function resolveHeroCopy({
  profileName,
  paymentMethodsReady,
  latestDraft,
  publishedEventCount,
}: {
  profileName: string;
  paymentMethodsReady: boolean;
  latestDraft: CreateEventDraftSummary | null;
  publishedEventCount: number;
}) {
  const hasPublishedEvents = publishedEventCount > 0;

  if (latestDraft && paymentMethodsReady) {
    return {
      title: `Sigue con tu evento, ${profileName}`,
      description: 'Ya tienes un evento empezado. Retómalo y publícalo cuando esté listo.',
    };
  }

  if (latestDraft) {
    return {
      title: `Sigue con tu evento, ${profileName}`,
      description: 'Ya empezaste un evento. Continúa desde aquí cuando quieras.',
    };
  }

  if (hasPublishedEvents && paymentMethodsReady) {
    return {
      title: `Ya puedes crear otro evento, ${profileName}`,
      description: 'Tu perfil y tu método de pago ya están listos para seguir organizando.',
    };
  }

  if (hasPublishedEvents) {
    return {
      title: `Ya puedes crear otro evento, ${profileName}`,
      description: 'Empieza uno nuevo hoy y deja el cobro listo antes de publicarlo.',
    };
  }

  if (paymentMethodsReady) {
    return {
      title: `Ya puedes crear tu primer evento, ${profileName}`,
      description: 'Tu perfil y tu método de pago ya están listos.',
    };
  }

  return {
    title: `Ya puedes empezar tu primer evento, ${profileName}`,
    description: 'Tu perfil ya está listo. Puedes empezar hoy y completar el cobro después.',
  };
}

function resolveActivationMessage({
  paymentMethodsReady,
  latestDraft,
  publishedEventCount,
}: {
  paymentMethodsReady: boolean;
  latestDraft: CreateEventDraftSummary | null;
  publishedEventCount: number;
}) {
  const hasPublishedEvents = publishedEventCount > 0;

  if (latestDraft) {
    return 'Tu perfil organizadora quedó activado. Ahora puedes retomar tu evento.';
  }

  if (hasPublishedEvents && paymentMethodsReady) {
    return 'Tu perfil organizadora quedó activado. Ya puedes crear otro evento.';
  }

  if (hasPublishedEvents) {
    return 'Tu perfil organizadora quedó activado. Ya puedes empezar otro evento y completar el cobro después.';
  }

  if (paymentMethodsReady) {
    return 'Tu perfil organizadora quedó activado. Ya puedes empezar tu primer evento.';
  }

  return 'Tu perfil organizadora quedó activado. Ya puedes empezar tu evento y dejar el cobro listo después.';
}

function resolveDraftSummary(draft: CreateEventDraftSummary | null) {
  if (!draft) return null;

  const scheduledLabel = formatDashboardDateTime(draft.startTime);
  if (scheduledLabel) {
    return `Programado para ${scheduledLabel}.`;
  }

  const createdLabel = formatDashboardDateTime(draft.createdAt);
  if (createdLabel) {
    return `Creado el ${createdLabel}.`;
  }

  return 'Aún no tiene fecha definida.';
}

export default async function CreateEventPage({
  searchParams,
}: {
  searchParams?: PageSearchParams | Promise<PageSearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const activated = resolvedSearchParams?.activated === '1';
  const state = await resolveCreateEventEntryState();

  if (state.kind === 'redirect') {
    redirect(state.destination);
  }

  if (state.kind === 'activation_required') {
    return (
      <CreateEventActivationGateway
        initialPhone={state.initialPhone}
        profileName={state.profileName}
      />
    );
  }

  const entryState = resolveEntryState(state);
  const hero = resolveHeroCopy(state);
  const latestDraftSummary = resolveDraftSummary(state.latestDraft);
  const additionalDraftCount = state.latestDraft ? Math.max(0, state.draftCount - 1) : state.draftCount;

  return (
    <main className="flex min-h-screen w-full flex-col bg-white">
      <CreateEventEntryTracker
        activated={activated}
        entryState={entryState}
        paymentMethodsReady={state.paymentMethodsReady}
        activePaymentMethodCount={state.activePaymentMethodCount}
        hasDraft={Boolean(state.latestDraft)}
        draftCount={state.draftCount}
        publishedEventCount={state.publishedEventCount}
      />
      <section className="flex-1 bg-white px-4 py-10 sm:px-6 lg:px-10 xl:px-12">
        <div className="max-w-3xl">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-mulberry/80">
            Crear evento
          </span>

          <h1 className="mt-4 font-eastman-extrabold text-4xl leading-tight text-slate-900 sm:text-5xl">
            {hero.title}
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-600 sm:text-base">{hero.description}</p>

          {activated ? (
            <div className="mt-5 rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-800 ring-1 ring-emerald-200/80">
              {resolveActivationMessage(state)}
            </div>
          ) : null}

          {state.latestDraft ? (
            <section className="mt-6 rounded-[18px] bg-white/80 px-5 py-4 ring-1 ring-slate-200/70 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Evento empezado
              </p>
              <h2 className="mt-2 text-lg font-semibold text-slate-900">{state.latestDraft.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{latestDraftSummary}</p>
              {additionalDraftCount > 0 ? (
                <p className="mt-2 text-sm text-slate-500">
                  {additionalDraftCount === 1
                    ? 'Además tienes 1 borrador adicional abierto.'
                    : `Además tienes ${additionalDraftCount} borradores adicionales abiertos.`}
                </p>
              ) : null}
            </section>
          ) : null}
        </div>

        <CreateEventEntryActions
          paymentMethodsReady={state.paymentMethodsReady}
          activePaymentMethodCount={state.activePaymentMethodCount}
          latestDraft={state.latestDraft}
          draftCount={state.draftCount}
          publishedEventCount={state.publishedEventCount}
        />
      </section>
    </main>
  );
}
