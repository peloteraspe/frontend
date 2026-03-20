'use client';

import ArrowRight from '@core/assets/images/arrow-right.png';
import Badge from '@src/core/ui/Badge';
import Image from 'next/image';
import CardEvent from '../CardEvent';
import { ButtonWrapper } from '@src/core/ui/Button';

import { useRouter } from 'next/navigation';
import { isVersusEventTypeName } from '@modules/events/lib/eventTypeRules';
import { isEventSoldOut } from '@modules/events/lib/eventCapacity';
import { formattedPrice } from '@src/shared/lib/utils';

interface CardEventItemProps {
  cardEvents: CardEventData[];
  variant?: 'legacy' | 'landing';
}

type CardEventData = {
  id: string | number;
  title?: string;
  formattedDateTime?: string;
  dateLabel?: string;
  locationText?: string;
  price?: number;
  placesLeft?: number;
  approvedCount?: number;
  minUsers?: number;
  maxUsers?: number;
  isSoldOut?: boolean;
  level?: {
    name?: string;
  };
  levelName?: string;
  eventType?: {
    name?: string;
  };
  eventTypeName?: string;
  featuresData?: Array<{
    feature?: {
      name?: string;
    };
  }>;
};

function getEventTypeName(event: CardEventData) {
  return event.eventType?.name || event.eventTypeName || 'Partido';
}

function getLevelName(event: CardEventData) {
  return event.level?.name || event.levelName || 'Sin nivel';
}

function getDateLabel(event: CardEventData) {
  return event.formattedDateTime || event.dateLabel || 'Fecha por confirmar';
}

function getIsSoldOut(event: CardEventData) {
  if (typeof event.isSoldOut === 'boolean') return event.isSoldOut;
  return isEventSoldOut(event.maxUsers, event.approvedCount);
}

function getBadges(event: CardEventData) {
  if (Array.isArray(event.featuresData) && event.featuresData.length) {
    return event.featuresData
      .map((featureData) => featureData?.feature?.name)
      .filter((featureName): featureName is string => Boolean(featureName));
  }
  return [getEventTypeName(event)];
}

const CardEventItem = ({ cardEvents, variant = 'legacy' }: CardEventItemProps) => {
  const router = useRouter();
  const itemContainerClass = variant === 'landing' ? 'w-full max-w-none' : 'max-w-xl';

  return (
    <div className="flex flex-col">
      {cardEvents?.map((event) => {
        const eventTypeName = getEventTypeName(event);
        const badges = getBadges(event);
        const isVersus = isVersusEventTypeName(eventTypeName);
        const isSoldOut = getIsSoldOut(event);

        return (
          <div
            key={event.id}
            onClick={() => router.push(`/events/${event.id}`)}
            className={itemContainerClass}
          >
            <CardEvent
              typeEvent={eventTypeName}
              levelText={`NIVEL: ${getLevelName(event).toUpperCase()}`}
              matchText={event.title || 'Evento sin título'}
              dateText={getDateLabel(event)}
              textLocation={event.locationText || 'Ubicación por confirmar'}
              button={
                <ButtonWrapper
                  icon={<Image src={ArrowRight} alt="arrow" width={24} height={24} />}
                  disabled={isSoldOut}
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation();
                    if (isSoldOut) return;
                    router.push(isVersus ? `/versus/${event.id}` : `/payments/${event.id}`);
                  }}
                  children={isSoldOut ? 'Cupos completos' : isVersus ? 'Anotar a mi equipo' : 'Anotarme'}
                />
              }
              price={formattedPrice(Number(event.price ?? 0))}
              badge={badges.map((badge, index) => (
                <Badge
                  key={index}
                  text={badge.toUpperCase()}
                  icon={true}
                  badgeType="Primary"
                />
              ))}
            />
          </div>
        );
      })}
    </div>
  );
};

export default CardEventItem;
