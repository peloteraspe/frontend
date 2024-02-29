import {
  ParagraphM,
  ParagraphS,
  SubtitleS,
  TitleM,
  TitleS,
} from "./atoms/Typography";

import Ball from "@/app/assets/images/ball.png";
import Calendar from "@/app/assets/images/calendar.png";
import DoubleBall from "@/app/assets/images/double-ball.png";
import Image from "next/image";
import Ubication from "@/app/assets/images/ubication.png";

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
    <div className="relative min-w-[714px] min-h-[157px] ">
      {/* quantity */}
      {quantity && (
        <TitleS color="text-btnBg-light">
          <div className="bg-white font-eastman-bold border-btnBg-light absolute top-0 right-0 border-2 rounded-xl z-10 w-[65px] h-[35px]">
            <div className="absolute left-1 bottom-[0.4rem]">{quantity}</div>
            <div className="absolute top-2  left-5 flex flex-col">
              <span className="text-[8px]">quedan cupos</span>
            </div>
          </div>
        </TitleS>
      )}
      <div className="card-info hover:bg-[#744D7C] hover:bg-opacity-20 grid grid-cols-3 absolute left-0 bottom-0 w-full h-[90%] shadow-md rounded-xl">
        <div className="grid grid-cols-10 col-span-2">
          <div className=" col-span-2 m-auto">
            {/* typeEvent */}
            {typeEvent.toLowerCase().includes("pichanga") ? (
              <Image src={Ball} alt="ball" width={56} height={56} />
            ) : (
              <Image src={DoubleBall} alt="ball" width={56} height={56} />
            )}
          </div>
          <div className="grid grid-cols-1 p-1 col-span-8 items-center uppercase">
            <ParagraphS fontWeight="bold" color="text-btnBg-light">
              {/* levelText */}
              {levelText}
            </ParagraphS>
            <div className=" flex justify-start items-center uppercase">
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
            <div className="flex justify-start gap-1">
              {badge?.map((b) => b)}
            </div>
          </div>
        </div>
        <div className="col-span-1 relative font-poppins font-semibold text-sm text-white min-w">
          <div className="right-4 absolute top-9 ">{button}</div>
        </div>
        <div className="absolute bottom-2 right-4 uppercase">
          <TitleM fontWeight="bold" color="text-btnBg-light">
            {/* price */}
            {price}
          </TitleM>
        </div>
      </div>
    </div>
  );
};

export default CardEvent;
