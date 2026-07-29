'use client';
import Badge, { StatusBadge } from '@core/ui/Badge';
import { ButtonWrapper } from '@core/ui/Button';
import AuthRedirectLoader from '@modules/auth/ui/AuthRedirectLoader';
import { useSessionGuardNavigation } from '@modules/auth/ui/useSessionGuardNavigation';
import { hasEventEnded } from '@modules/events/lib/eventTiming';
import { getEventJoinLabel, isEventJoinDisabled } from '@modules/events/lib/eventJoinState';
import CardEvent from '@modules/events/ui/CardEvent';
import { EventEntity } from '@modules/events/model/types';
import { formattedPrice } from '@shared/lib/utils';
import { isVersusEventTypeName } from '@modules/events/lib/eventTypeRules';

type Props = {
  events: EventEntity[];
  selectedEventId: string | null;
  hoveredEventId: string | null;
  onHoverEvent: (id: string | null) => void;
  isLoading?: boolean;
  emptyMessage?: string;
};

function EventCardSameAsLanding({
  event,
  isActive,
  onHover,
  onLeave,
  onOpenJoinFlow,
}: {
  event: EventEntity;
  isActive: boolean;
  onHover: () => void;
  onLeave: () => void;
  onOpenJoinFlow: (eventId: string, isVersus: boolean) => void;
}) {
  const isVersus = isVersusEventTypeName(event.eventTypeName);
  const isSoldOut = event.isSoldOut === true;
  const isPastEvent = hasEventEnded(event.endTime, undefined, event.startTime);
  const isJoinDisabled = isEventJoinDisabled({
    isPastEvent,
    isPublished: event.isPublished,
    isSoldOut,
    isVersus,
    viewerHasApprovedRegistration: event.viewerHasApprovedRegistration,
    viewerHasPendingRegistration: event.viewerHasPendingRegistration,
  });
  const joinLabel = getEventJoinLabel({
    isPastEvent,
    isPublished: event.isPublished,
    isSoldOut,
    isVersus,
    viewerHasApprovedRegistration: event.viewerHasApprovedRegistration,
    viewerHasPendingRegistration: event.viewerHasPendingRegistration,
  });

  return (
    <div onMouseEnter={onHover} onMouseLeave={onLeave}>
      <CardEvent
        detailsHref={`/events/${event.id}`}
        typeEvent={event.eventTypeName}
        levelText={`Nivel ${event.levelName}`}
        matchText={event.title}
        dateText={event.dateLabel}
        textLocation={event.locationText}
        compact
        active={isActive}
        button={
          isJoinDisabled ? (
            <StatusBadge
              variant={
                event.viewerHasApprovedRegistration
                  ? 'success'
                  : event.viewerHasPendingRegistration
                    ? 'warning'
                    : 'default'
              }
              size="md"
              className="min-h-10 max-w-full justify-center whitespace-nowrap !px-3 text-center !text-xs"
            >
              {joinLabel}
            </StatusBadge>
          ) : (
            <ButtonWrapper
              width="fit-content"
              className="pointer-events-auto !min-h-10 !rounded-full !px-4 !py-2 text-sm leading-tight shadow-[0_18px_32px_-24px_rgba(84,8,111,0.72)]"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation();
                onOpenJoinFlow(event.id, isVersus);
              }}
            >
              {joinLabel}
            </ButtonWrapper>
          )
        }
        price={formattedPrice(event.price)}
        badge={
          [
            <Badge
              key={`${event.id}-type`}
              text={event.eventTypeName.toUpperCase()}
              icon={true}
              badgeType="Primary"
            />,
          ]
        }
      />
    </div>
  );
}

export default function EventListPanel({
  events,
  selectedEventId,
  hoveredEventId,
  onHoverEvent,
  isLoading = false,
  emptyMessage = 'No hay eventos en esta zona todavía.',
}: Props) {
  const { navigateWithSessionCheck, isPendingNavigation, pendingNavigationMessage } =
    useSessionGuardNavigation();

  function openJoinFlow(eventId: string, isVersus: boolean) {
    navigateWithSessionCheck({
      destination: isVersus ? `/versus/${eventId}` : `/payments/${eventId}`,
      authenticatedMessage: 'Preparando tu inscripción...',
      loginMessage: 'Inicia sesion para inscribirte al evento',
      loginRedirectMessage: 'Redirigiendo al login...',
      requireEmailConfirmed: true,
      emailConfirmationMessage: 'Verifica tu identidad para poder inscribirte a este evento.',
      requireEventProfile: true,
      eventProfileIntent: 'join_event',
    });
  }

  if (!events.length) {
    return (
      <div className="premium-card h-[60vh] border-dashed p-6 text-center text-sm text-slate-600 md:h-[76vh]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      <AuthRedirectLoader visible={isPendingNavigation} message={pendingNavigationMessage} />
      <div
        className="relative h-auto min-h-0 overflow-visible [overflow-anchor:none] md:h-[76vh] md:min-h-[520px] md:overflow-y-auto md:pr-2 xl:h-[calc(100vh-140px)]"
        aria-busy={isLoading}
      >
        <div className="ml-1 mt-4 space-y-5 pb-4">
          {events.map((event) => (
            <div key={event.id} data-event-id={event.id}>
              <EventCardSameAsLanding
                event={event}
                isActive={selectedEventId === event.id || hoveredEventId === event.id}
                onHover={() => onHoverEvent(event.id)}
                onLeave={() => onHoverEvent(null)}
                onOpenJoinFlow={openJoinFlow}
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
