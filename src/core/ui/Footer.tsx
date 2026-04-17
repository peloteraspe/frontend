import React from 'react';
import Logo from '@core/assets/Logo-text.svg';
import Image from 'next/image';
import InstagramIcon from '@shared/ui/icons/social/InstagramIcon';
import TiktokIcon from '@shared/ui/icons/social/TiktokIcon';
import { ParagraphM, SubtitleM } from './Typography';
import Link from 'next/link';

// URLs de redes sociales (actualizar con las reales)
const SOCIAL_LINKS = {
  instagram: 'https://instagram.com/peloteraspe',
  tiktok: 'https://tiktok.com/@peloteras.com',
};

const Footer: React.FC = () => {
  return (
    <footer className="mt-auto w-full pb-6 pt-8 font-poppins md:pb-10">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col items-center gap-6 px-5 sm:px-8 lg:px-10 sm:text-left text-center sm:flex-row sm:items-start sm:justify-between">
        {/* Logo y tagline */}
        <div className="flex flex-col sm:items-start items-center gap-2">
          <Image src={Logo} alt="Peloteras logo" width={150} height={40} />
          <div className="mt-2">
            <SubtitleM color="text-mulberry">
              Hecho por <strong>Peloteras</strong> con amor
            </SubtitleM>
          </div>
        </div>

        {/* Links de navegacion */}
        <nav aria-label="Enlaces del footer" className="flex flex-col sm:items-start gap-3">
          <ParagraphM fontWeight="bold" color="text-mulberry">
            <Link href="/sobre-peloteras" className="hover:underline focus:underline focus:outline-none">
              Sobre Peloteras
            </Link>
          </ParagraphM>
          <ParagraphM fontWeight="bold" color="text-mulberry">
            <Link href="/como-inscribir-nuevo-evento" className="hover:underline focus:underline focus:outline-none">
              Inscribir un evento
            </Link>
          </ParagraphM>
          <ParagraphM fontWeight="bold" color="text-mulberry">
            <Link href="/contactanos" className="hover:underline focus:underline focus:outline-none">
              Contactanos
            </Link>
          </ParagraphM>
        </nav>

        {/* Redes sociales */}
        <div>
          <div className="text-mulberry font-semibold mb-4">Nuestras redes</div>
          <div className="flex gap-4">
            <a
              href={SOCIAL_LINKS.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Siguenos en Instagram"
              className="p-2 rounded-xl border-2 border-btnBg-light text-btnBg-light hover:bg-btnBg-trans hover:text-btnBg-dark transition-colors focus:outline-none focus:ring-2 focus:ring-mulberry focus:ring-offset-2"
            >
              <InstagramIcon />
            </a>
            <a
              href={SOCIAL_LINKS.tiktok}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Siguenos en TikTok"
              className="p-2 rounded-xl border-2 border-btnBg-light text-btnBg-light hover:bg-btnBg-trans hover:text-btnBg-dark transition-colors focus:outline-none focus:ring-2 focus:ring-mulberry focus:ring-offset-2"
            >
              <TiktokIcon />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
