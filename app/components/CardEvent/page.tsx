import ArrowRight from "@/app/assets/images/arrow-right.png";
import Badge from "@/components/Badge";
import { ButtonWrapper } from "@/components/Button";
import CardEvent from "@/components/CardEvent";
import Image from "next/image";

const CardEventPage = () => {
  return (
    <div>
      <CardEvent
        quantity={2}
        typeEvent="pichanga libre"
        levelText="nivel:intermedio - avanzado"
        matchText="full chocolate: jueves de pichanga"
        dateText="jueves 25 feb 2024: 8:30pm - 10:30pm"
        textLocation="colegio fanning - jesus maría"
        button={
          <ButtonWrapper
            icon={<Image src={ArrowRight} alt="arrow" width={24} height={24} />}
            children="Anotar a mi equipo"
          />
        }
        price="s/10.00"
        badge={[
          <Badge
            key={1}
            text="ESTACIOMAMIENTO"
            icon={true}
            badgeType="Primary"
          />,
          <Badge key={2} text="BOTIQUÍN" icon={true} badgeType="Primary" />,
          <Badge key={3} text="CHALECOS" icon={true} badgeType="Primary" />,
        ]}
      />
    </div>
  );
};

export default CardEventPage;
