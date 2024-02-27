import React from "react";
import Logo from "../../app/assets/Logo.svg";
import Image from "next/image";
import { ParagraphS } from "../atoms/Typography";
import { ButtonUnWrapperOutline } from "../Button";
import InstagramIcon from "@/app/assets/social/InstagramIcon";
import CloudIcon from "@/app/assets/CloudIcon";
import FacebookIcon from "@/app/assets/social/FacebookIcon";
import TiktokIcon from "@/app/assets/social/TiktokIcon";

const Footer: React.FC = () => {
  return (
    <footer className="w-full flex items-center h-16 py-20 border font-poppins justify-center">
      <div className="flex justify-around w-full">
        <div className="flex flex-col items-center mb-4">
          <Image src={Logo} alt="Peloteras logo" className="pb-2"/>
          <div className="text-violeta mt-2">
            Hecho por <strong>Peloteras</strong> con ❤️
          </div>
        </div>
        <div className="text-violeta font-semibold">
          <ul>
            <li className="mb-2"><a href="/sobre-peloteras">Sobre Peloteras</a></li>
            <li className="mb-2"><a href="/como-inscribir-nuevo-evento">¿Cómo inscribir un nuevo evento?</a></li>
            <li className="mb-2"><a href="/contactanos">Contáctanos</a></li>
          </ul>
        </div>
        <div className="ml-8">
          <div className="text-violeta font-semibold mb-4">Nuestras redes</div>
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
