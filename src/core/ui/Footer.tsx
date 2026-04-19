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
    <footer className="mt-auto w-full pb-8 pt-5 font-poppins sm:pb-12 sm:pt-8">
      <div className="site-shell">
        <div className="site-panel-soft px-6 py-8 sm:px-8 sm:py-10">
          <div className="flex flex-col gap-8 text-center sm:text-left lg:flex-row lg:items-start lg:justify-between">
            <div className="flex max-w-sm flex-col items-center gap-3 sm:items-start">
              <Image src={Logo} alt="Peloteras logo" width={150} height={40} />
              <div className="space-y-2">
                <SubtitleM color="text-slate-900">
                  Hecho por <strong>Peloteras</strong> para abrir más espacios, jugar más y hacer
                  comunidad.
                </SubtitleM>
              </div>
            </div>

            <nav
              aria-label="Enlaces del footer"
              className="flex flex-col items-center gap-3 sm:items-start"
            >
              <ParagraphM fontWeight="bold" color="text-mulberry">
                <Link
                  href="/sobre-peloteras"
                  className="transition-colors hover:text-slate-900 focus:text-slate-900 focus:outline-none"
                >
                  Sobre Peloteras
                </Link>
              </ParagraphM>

              <ParagraphM fontWeight="bold" color="text-mulberry">
                <Link
                  href="/contactanos"
                  className="transition-colors hover:text-slate-900 focus:text-slate-900 focus:outline-none"
                >
                  Contáctanos
                </Link>
              </ParagraphM>
            </nav>

            <div className="flex flex-col items-center gap-4 sm:items-start">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-mulberry/70">
                Nuestras redes
              </div>
              <div className="flex gap-3">
                <a
                  href={SOCIAL_LINKS.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Siguenos en Instagram"
                  className="home-button-micro premium-outline rounded-2xl p-3 text-btnBg-light transition-colors hover:border-mulberry/30 hover:bg-white hover:text-btnBg-dark focus:outline-none focus:ring-2 focus:ring-mulberry focus:ring-offset-2"
                >
                  <InstagramIcon />
                </a>
                <a
                  href={SOCIAL_LINKS.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Siguenos en TikTok"
                  className="home-button-micro premium-outline rounded-2xl p-3 text-btnBg-light transition-colors hover:border-mulberry/30 hover:bg-white hover:text-btnBg-dark focus:outline-none focus:ring-2 focus:ring-mulberry focus:ring-offset-2"
                >
                  <TiktokIcon />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
