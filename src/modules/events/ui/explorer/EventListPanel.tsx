'use client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

import ArrowRight from '@core/assets/images/arrow-right.png';
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
  onOpenEvent,
  onOpenJoinFlow,
}: {
  event: EventEntity;
  isActive: boolean;
  onHover: () => void;
  onLeave: () => void;
  onOpenEvent: (eventId: string) => void;
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
    <div
      onClick={() => onOpenEvent(event.id)}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={isActive ? 'rounded-xl ring-2 ring-[#54086F]/40 ring-offset-2 ring-offset-white' : ''}
    >
      <CardEvent
        typeEvent={event.eventTypeName}
        levelText={`NIVEL: ${event.levelName.toUpperCase()}`}
        matchText={event.title}
        dateText={event.dateLabel}
        textLocation={event.locationText}
        compact
        button={
          <ButtonWrapper
            icon={<Image src={ArrowRight} alt="arrow" width={24} height={24} />}
            width="fit-content"
            disabled={isJoinDisabled}
            className="!h-11 !rounded-full !px-5 !py-0 shadow-[0_18px_32px_-24px_rgba(84,8,111,0.72)]"
            onClick={(e: any) => {
              e.stopPropagation();
              if (isJoinDisabled) return;
              onOpenJoinFlow(event.id, isVersus);
            }}
          >
            {joinLabel}
          </ButtonWrapper>
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
          ].concat(
            isPastEvent
              ? [
                  <StatusBadge
                    key={`${event.id}-status`}
                    variant="warning"
                    size="sm"
                    className="whitespace-nowrap"
                  >
                    Finalizado
                  </StatusBadge>,
                ]
              : []
          )
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
  const router = useRouter();
  const { navigateWithSessionCheck, isPendingNavigation, pendingNavigationMessage } =
    useSessionGuardNavigation();

  function openEventDetails(eventId: string) {
    router.push(`/events/${eventId}`);
  }

  function openJoinFlow(eventId: string, isVersus: boolean) {
    navigateWithSessionCheck({
      destination: isVersus ? `/versus/${eventId}` : `/payments/${eventId}`,
      authenticatedMessage: 'Preparando tu inscripción...',
      loginMessage: 'Inicia sesion para inscribirte al evento',
      loginRedirectMessage: 'Redirigiendo al login...',
      requireEmailConfirmed: true,
      emailConfirmationMessage: 'Verifica tu identidad para poder inscribirte a este evento.',
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
                onOpenEvent={openEventDetails}
                onOpenJoinFlow={openJoinFlow}
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
