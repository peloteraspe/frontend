'use client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

import ArrowRight from '@core/assets/images/arrow-right.png';
import Badge, { StatusBadge } from '@core/ui/Badge';
import { ButtonWrapper } from '@core/ui/Button';
import { hasEventStarted } from '@modules/events/lib/eventTiming';
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
}: {
  event: EventEntity;
  isActive: boolean;
  onHover: () => void;
  onLeave: () => void;
}) {
  const router = useRouter();
  const isVersus = isVersusEventTypeName(event.eventTypeName);
  const isSoldOut = event.isSoldOut === true;
  const isPastEvent = hasEventStarted(event.startTime);

  return (
    <div
      onClick={() => router.push(`/events/${event.id}`)}
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
            disabled={isSoldOut || isPastEvent}
            onClick={(e: any) => {
              e.stopPropagation();
              if (isSoldOut || isPastEvent) return;
              router.push(isVersus ? `/versus/${event.id}` : `/payments/${event.id}`);
            }}
          >
            {isPastEvent
              ? 'Evento finalizado'
              : isSoldOut
              ? 'Cupos completos'
              : isVersus
              ? 'Anotar a mi equipo'
              : 'Anotarme'}
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
  if (!events.length) {
    return (
      <div className="h-[60vh] md:h-[76vh] rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      className="relative h-auto min-h-0 overflow-visible [overflow-anchor:none] md:h-[76vh] md:min-h-[520px] md:overflow-y-auto md:pr-2 xl:h-[calc(100vh-140px)]"
      aria-busy={isLoading}
    >
      <div className="space-y-5 pb-4 mt-5 ml-1">
        {events.map((event) => (
          <div key={event.id} data-event-id={event.id}>
            <EventCardSameAsLanding
              event={event}
              isActive={selectedEventId === event.id || hoveredEventId === event.id}
              onHover={() => onHoverEvent(event.id)}
              onLeave={() => onHoverEvent(null)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
