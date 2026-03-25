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
          'card-info w-full rounded-xl p-4 shadow-md transition-colors hover:bg-[#744D7C]/20 sm:grid sm:items-start sm:p-5',
          compact ? 'sm:grid-cols-[72px_minmax(0,1fr)_130px] sm:gap-4' : 'sm:grid-cols-[84px_minmax(0,1fr)_160px] sm:gap-6',
        ].join(' ')}
      >
        <div className="hidden h-full items-center justify-center sm:flex">
          <Image src={eventIcon} alt="ball" width={56} height={56} />
        </div>

        <div className="min-w-0 py-2 uppercase">
          <ParagraphS fontWeight="bold" color="text-btnBg-light">
            {levelText}
          </ParagraphS>

          <div className="mt-2 min-w-0">
            <ParagraphM fontWeight="bold" color="text-[#1F2937]">
              <span className="break-words">{matchText}</span>
            </ParagraphM>
          </div>

          <div className="mt-3">
            <SubtitleS fontWeight="semibold" color="text-btnBg-light">
              <span className="flex min-w-0 items-start gap-2 !text-xs">
                <Image src={Calendar} alt="calendar" width={15} className="mt-0.5 shrink-0" />
                <span className="min-w-0 break-words">{dateText}</span>
              </span>
            </SubtitleS>
          </div>

          <div className="mt-2">
            <SubtitleS fontWeight="semibold" color="text-btnBg-light">
              <span className="flex min-w-0 items-start gap-2 !text-xs">
                <Image src={Ubication} alt="ubicacion" width={15} className="mt-0.5 shrink-0" />
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
          <div className="flex min-h-[52px] w-full justify-end opacity-0 pointer-events-none transition-opacity duration-200 group-hover:opacity-100 group-hover:pointer-events-auto">
            {button}
          </div>

          <div className="mt-auto whitespace-nowrap text-right uppercase">
            <TitleM fontWeight="bold" color="text-btnBg-light">
              {price}
            </TitleM>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardEvent;
