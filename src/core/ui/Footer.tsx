import React from 'react';
import Logo from '@core/assets/Logo-text.svg';
import Image from 'next/image';
import { ButtonUnWrapperOutline } from './Button';
import InstagramIcon from '@shared/ui/icons/social/InstagramIcon';
import FacebookIcon from '@shared/ui/icons/social/FacebookIcon';
import TiktokIcon from '@shared/ui/icons/social/TiktokIcon';
import { ParagraphM, SubtitleM } from './Typography';
import Link from 'next/link';

const Footer: React.FC = () => {
  return (
    <footer className="mt-auto w-full pb-10 pt-8 font-poppins">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col items-center gap-6 px-5 sm:px-8 lg:px-10 sm:text-left text-center sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col sm:items-start items-center gap-2">
          <Image src={Logo} alt="Peloteras logo" />
          <div className="mt-2">
            <SubtitleM color="text-mulberry">
              Hecho por <strong>Peloteras</strong> con ❤️
            </SubtitleM>
          </div>
        </div>
        <div className="flex flex-col sm:items-start gap-4">
          <ParagraphM fontWeight="bold" color="text-mulberry">
            <Link href="/sobre-peloteras">Sobre Peloteras</Link>
          </ParagraphM>
          <ParagraphM fontWeight="bold" color="text-mulberry">
            <Link href="/como-inscribir-nuevo-evento">¿Cómo inscribir un nuevo evento?</Link>
          </ParagraphM>
          <ParagraphM fontWeight="bold" color="text-mulberry">
            <Link href="/contactanos">Contáctanos</Link>
          </ParagraphM>
        </div>
        <div>
          <div className="text-mulberry font-semibold mb-4">Nuestras redes</div>
          <div className="flex gap-6">
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
