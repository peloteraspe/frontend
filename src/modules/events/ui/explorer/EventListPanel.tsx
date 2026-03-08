'use client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

import ArrowRight from '@core/assets/images/arrow-right.png';
import Badge from '@core/ui/Badge';
import { ButtonWrapper } from '@core/ui/Button';
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

  return (
    <div
      onClick={() => router.push(`/events/${event.id}`)}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={isActive ? 'rounded-xl ring-2 ring-[#54086F]/40 ring-offset-2 ring-offset-white' : ''}
    >
      <CardEvent
        typeEvent={event.eventTypeName}
        quantity={event.maxUsers - event.minUsers}
        levelText={`NIVEL: ${event.levelName.toUpperCase()}`}
        matchText={event.title}
        dateText={event.dateLabel}
        textLocation={event.locationText}
        compact
        button={
          <ButtonWrapper
            icon={<Image src={ArrowRight} alt="arrow" width={24} height={24} />}
            onClick={(e: any) => {
              e.stopPropagation();
              router.push(isVersus ? `/versus/${event.id}` : `/payments/${event.id}`);
            }}
          >
            {isVersus ? 'Anotar a mi equipo' : 'Anotarme'}
          </ButtonWrapper>
        }
        price={formattedPrice(event.price)}
        badge={[
          <Badge
            key={`${event.id}-type`}
            text={event.eventTypeName.toUpperCase()}
            icon={true}
            badgeType="Primary"
          />,
        ]}
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
}: Props) {
  if (!events.length) {
    return (
      <div className="h-[60vh] md:h-[76vh] rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">
        No hay eventos en esta zona todavía.
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
