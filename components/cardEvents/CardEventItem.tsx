'use cliente'

import ArrowRight from "@/app/assets/images/arrow-right.png";
import Badge from "@/components/Badge";
import Image from "next/image";
import { ButtonWrapper } from "../Button";
import CardEvent from "../CardEvent";
import { formattedPrice } from "@/lib/utils";

interface CardEventItemProps {
    cardEvents: any[]
}

const CardEventItem = ({cardEvents}: CardEventItemProps) => {
    
  return (
    <div className="flex flex-col">
        {cardEvents?.map((event: any) => {
            return ( 
                <div key={event.id}>
                    <CardEvent 
                        typeEvent={event.eventType.name}
                        quantity={event.placesLeft}
                        levelText={`NIVEL: ${event.level.name}`}
                        matchText={event.title}
                        dateText={event.formattedDateTime}
                        textLocation={event.locationText}
                        button={
                            <ButtonWrapper
                                icon={<Image src={ArrowRight} alt="arrow" width={24} height={24} />}
                                children="Anotar a mi equipo"
                            />
                        }
                        price={formattedPrice(event.price)}
                        badge={event.featuresData.map((feature: any, index:number) => (
                            <Badge
                                key={index} 
                                text={feature.feature.name.toUpperCase()}
                                icon={true}
                                badgeType="Primary"
                            />
                        ))}
                    />
                </div>
            );
        })}
    </div>
  )
}

export default CardEventItem
