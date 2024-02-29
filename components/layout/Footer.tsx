import React from "react";
import Logo from "../../app/assets/Logo.svg";
import Image from "next/image";
import { ButtonUnWrapperOutline } from "../Button";
import InstagramIcon from "@/app/assets/social/InstagramIcon";
import FacebookIcon from "@/app/assets/social/FacebookIcon";
import TiktokIcon from "@/app/assets/social/TiktokIcon";
import { ParagraphM, SubtitleM } from "../atoms/Typography";

const Footer: React.FC = () => {
  return (
    <footer className="w-full flex flex-col items-center pt-10 pb-10 font-poppins justify-center mt-auto">
      <div className="md:flex justify-around w-full">
        <div className="flex flex-col items-center mb-4">
          <Image src={Logo} alt="Peloteras logo" className="pb-2" />
          <div className="mt-2">
            <SubtitleM color="text-mulberry">
              Hecho por <strong>Peloteras</strong> con ❤️
            </SubtitleM>
          </div>
        </div>
        <div className="md:flex md:flex-col md:items-center text-violeta font-semibold pl-8">
          <ul>
            <ParagraphM
              fontWeight="bold"
              color="text-mulberry"
              className="mb-2"
            >
              <a href="/sobre-peloteras">Sobre Peloteras</a>
            </ParagraphM>
            <ParagraphM
              fontWeight="bold"
              color="text-mulberry"
              className="mb-2"
            >
              <a href="/como-inscribir-nuevo-evento">
                ¿Cómo inscribir un nuevo evento?
              </a>
            </ParagraphM>
            <ParagraphM
              fontWeight="bold"
              color="text-mulberry"
              className="mb-2"
            >
              <a href="/contactanos">Contáctanos</a>
            </ParagraphM>
          </ul>
        </div>
        <div className="pl-8">
          <div className="text-mulberry font-semibold mb-4">Nuestras redes</div>
          <div className="flex">
            <ButtonUnWrapperOutline hovered="true" icon={<InstagramIcon />} />
            <ButtonUnWrapperOutline hovered="true" icon={<FacebookIcon />} />
            <ButtonUnWrapperOutline hovered="true" icon={<TiktokIcon />} />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
