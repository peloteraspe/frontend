import { ParagraphM, ParagraphS, SubtitleS, TitleM } from '../../../core/ui/Typography';

import Ball from '@core/assets/images/ball.png';
import Calendar from '@core/assets/images/calendar.png';
import DoubleBall from '@core/assets/images/double-ball.png';
import Image from 'next/image';
import Ubication from '@core/assets/images/ubication.png';

interface CardEventProps {
  typeEvent: string;
  levelText: string;
  matchText: string;
  dateText: string;
  textLocation: string;
  price: string;
  badge: React.ReactNode[];
  button: React.ReactNode;
  compact?: boolean;
}

const CardEvent: React.FC<CardEventProps> = ({
  typeEvent,
  levelText,
  matchText,
  dateText,
  textLocation,
  price,
  badge,
  button,
  compact = false,
}) => {
  const eventIcon = typeEvent.toLowerCase().includes('pichanga') ? Ball : DoubleBall;

  return (
    <div className="group w-full cursor-pointer">
      <div
        className={[
          'premium-card w-full p-5 transition duration-300 group-hover:-translate-y-0.5 group-hover:border-mulberry/20 group-hover:shadow-[0_28px_60px_-40px_rgba(84,8,111,0.35)] sm:grid sm:items-start sm:p-6',
          compact
            ? 'sm:grid-cols-[84px_minmax(0,1fr)_144px] sm:gap-4'
            : 'sm:grid-cols-[92px_minmax(0,1fr)_168px] sm:gap-6',
        ].join(' ')}
      >
        <div className="hidden h-full items-start justify-center sm:flex">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,rgba(240,129,91,0.16)_0%,rgba(84,8,111,0.08)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
            <Image src={eventIcon} alt="ball" width={48} height={48} />
          </div>
        </div>

        <div className="min-w-0 py-1 uppercase">
          <ParagraphS fontWeight="bold" color="text-mulberry/80">
            {levelText}
          </ParagraphS>

          <div className="mt-2 min-w-0">
            <ParagraphM fontWeight="bold" color="text-slate-900">
              <span className="break-words">{matchText}</span>
            </ParagraphM>
          </div>

          <div className="mt-3">
            <SubtitleS fontWeight="semibold" color="text-slate-600">
              <span className="flex min-w-0 items-start gap-2 !text-xs">
                <Image src={Calendar} alt="calendar" width={15} className="mt-0.5 shrink-0 opacity-80" />
                <span className="min-w-0 break-words">{dateText}</span>
              </span>
            </SubtitleS>
          </div>

          <div className="mt-2">
            <SubtitleS fontWeight="semibold" color="text-slate-600">
              <span className="flex min-w-0 items-start gap-2 !text-xs">
                <Image src={Ubication} alt="ubicacion" width={15} className="mt-0.5 shrink-0 opacity-80" />
                <span className="min-w-0 break-words">{textLocation}</span>
              </span>
            </SubtitleS>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {badge?.map((badgeItem, index) => (
              <div key={index} className="max-w-full">
                {badgeItem}
              </div>
            ))}
          </div>
        </div>

        <div className="hidden h-full flex-col items-end justify-between gap-4 sm:flex">
          <div className="flex min-h-[52px] w-full justify-end opacity-0 pointer-events-none transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100">
            {button}
          </div>

          <div className="mt-auto whitespace-nowrap text-right uppercase">
            <TitleM fontWeight="bold" color="text-mulberry">
              {price}
            </TitleM>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardEvent;
