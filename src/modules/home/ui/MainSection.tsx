import { ButtonWrapper } from '@src/core/ui/Button';
import { SubtitleL, Title2XL } from '@src/core/ui/Typography';
import Image from 'next/image';
import React from 'react';

const MainSection = () => {
  return (
    <section className="mx-auto flex w-full max-w-[1600px] flex-col lg:flex-row lg:justify-between px-5 sm:px-8 lg:px-10 py-8 md:py-12 gap-8">
      {/* Imagen hero para mobile - visible solo en pantallas pequenas */}
      <div className="lg:hidden w-full relative aspect-[4/3] rounded-2xl overflow-hidden">
        <Image
          src="/assets/images/peloteras-hero.png"
          alt="Jugadoras de futbol femenino celebrando un gol en la cancha"
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 50vw"
          priority
        />
      </div>

      {/* Contenido de texto */}
      <div className="flex flex-col gap-4 md:gap-6 justify-center lg:max-w-[50%]">
        <div>
          <Title2XL>Donde dominamos</Title2XL>
          <Title2XL color="text-plum">la cancha</Title2XL>
        </div>
        <div>
          <SubtitleL>
            Regístrate para{' '}
            <SubtitleL fontWeight="bold" italic>
              {' '}
              ver y unirte a eventos deportivos
            </SubtitleL>
            , conectarte con más mujeres apasionadas y vivir la verdadera esencia del fútbol
            femenino.
          </SubtitleL>
        </div>
        <div className="mt-4 md:mt-8">
          <ButtonWrapper width={'fit-content'} navigateTo="/events">
            Unirme a un evento
          </ButtonWrapper>
        </div>
      </div>

      {/* Imagen hero para desktop - visible solo en pantallas grandes */}
      <div className="hidden lg:block w-full max-w-[45%]">
        <Image
          src="/assets/images/peloteras-hero.png"
          alt="Jugadoras de futbol femenino celebrando un gol en la cancha"
          width={600}
          height={450}
          className="w-full h-full object-cover rounded-2xl"
          sizes="45vw"
          priority
        />
      </div>
    </section>
  );
};

export default MainSection;
