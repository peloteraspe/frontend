import {
  ParagraphM,
  ParagraphS,
  SubtitleS,
  TitleM,
  TitleS,
} from './atoms/Typography';

import Ball from '@/app/assets/images/ball.png';
import Calendar from '@/app/assets/images/calendar.png';
import DoubleBall from '@/app/assets/images/double-ball.png';
import Image from 'next/image';
import Ubication from '@/app/assets/images/ubication.png';

interface CardEventProps {
  typeEvent: string;
  quantity?: number;
  levelText: string;
  matchText: string;
  dateText: string;
  textLocation: string;
  price: string;
  badge: React.ReactNode[];
  button: React.ReactNode;
}

const CardEvent: React.FC<CardEventProps> = ({
  typeEvent,
  quantity,
  levelText,
  matchText,
  dateText,
  textLocation,
  price,
  badge,
  button,
}) => {
  return (
    <div className="relative sm:min-w-[714px] w-[92vw] min-h-[160px] group sm:w-full cursor-pointer">
      {Number(quantity) < 4 && (
        <div className="bg-white font-eastman-bold border-btnBg-light absolute top-[-20px] right-0 border-2 rounded-[14px] z-10 w-[80px] h-[40px]">
          <div className="flex justify-center items-center w-full h-full gap-[1px]">
            <TitleM fontWeight="bold" color="text-mulberry">
              {quantity}
            </TitleM>
            <div className="flex flex-col items-center justify-center w-min">
              <span className="text-[9px] leading-none font-eastman-bold text-mulberry uppercase">
                cupos quedan
              </span>
            </div>
          </div>
        </div>
      )}
      <div
        className="card-info hover:bg-[#744D7C] hover:bg-opacity-20 sm:grid absolute left-0 bottom-0 w-full shadow-md rounded-xl h-full"
        style={{ gridTemplateColumns: '15% 68% 20%' }}
      >
        <div className="flex sm:flex-row flex-col gap-4">
          <div className="m-auto sm:block hidden">
            {/* typeEvent */}
            {typeEvent.toLowerCase().includes('pichanga') ? (
              <Image src={Ball} alt="ball" width={56} height={56} />
            ) : (
              <Image src={DoubleBall} alt="ball" width={56} height={56} />
            )}
          </div>
        </div>
        <div className="py-2 w-full sm:w-fit justify-center uppercase h-full flex flex-col gap-2 px-4 sm:px-0">
          <ParagraphS fontWeight="bold" color="text-btnBg-light">
            {/* levelText */}
            {levelText}
          </ParagraphS>
          <div className="flex justify-start items-center uppercase">
            <ParagraphM fontWeight="bold" color="text-[#1F2937]">
              {/* matchText */}
              {matchText}
            </ParagraphM>
          </div>
          <SubtitleS fontWeight="semibold" color="text-btnBg-light">
            <div className="flex flex-row gap-1 items-center !text-xs">
              {/* dateText*/}
              <Image src={Calendar} alt="calendar" width={15} />
              {dateText}
            </div>
          </SubtitleS>
          <SubtitleS fontWeight="semibold" color="text-btnBg-light">
            <div className="flex items-center !text-xs gap-1">
              {/* textLocation */}
              <Image src={Ubication} alt="calendar" width={15} />
              {textLocation}
            </div>
          </SubtitleS>
          <div className="flex justify-start gap-1 max-w-[92vw] sm:max-w-none overflow-scroll sm:overflow-hidden">
            {badge?.map((b) => b)}
          </div>
        </div>
        <div className="hidden sm:block font-poppins font-semibold text-sm text-white min-w">
          <div className="absolute right-4 top-9 hidden group-hover:block">
            {button}
          </div>
        </div>
        <div className="absolute bottom-5 right-4 uppercase hidden sm:block">
          <TitleM fontWeight="bold" color="text-btnBg-light">
            {price}
          </TitleM>
        </div>
      </div>
    </div>
  );
};

export default CardEvent;
