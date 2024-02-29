import React from 'react';
import Logo from '../../app/assets/Logo.svg';
import Image from 'next/image';
import { ButtonUnWrapperOutline } from '../Button';
import InstagramIcon from '@/app/assets/social/InstagramIcon';
import FacebookIcon from '@/app/assets/social/FacebookIcon';
import TiktokIcon from '@/app/assets/social/TiktokIcon';
import { ParagraphM, SubtitleM } from '../atoms/Typography';
import Link from 'next/link';

const Footer: React.FC = () => {
  return (
    <footer className="w-full flex flex-col items-center sm:pt-10 pb-10 font-poppins justify-center mt-auto">
      <div className="flex sm:flex-row flex-col justify-center items-center sm:justify-around w-full sm:text-left text-center gap-4">
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
            <Link href="/como-inscribir-nuevo-evento">
              ¿Cómo inscribir un nuevo evento?
            </Link>
          </ParagraphM>
          <ParagraphM fontWeight="bold" color="text-mulberry">
            <Link href="/contactanos">Contáctanos</Link>
          </ParagraphM>
        </div>
        <div >
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
