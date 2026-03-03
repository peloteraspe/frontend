import { ButtonWrapper } from '@src/core/ui/Button';
import { SubtitleL, Title2XL } from '@src/core/ui/Typography';
import React from 'react';

const MainSection = () => {
  return (
    <div className="mx-auto flex w-full max-w-[1600px] justify-between px-5 sm:px-8 lg:px-10 py-8 md:py-12">
      <div className="flex flex-col gap-6 justify-center">
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
        <div className="mt-8">
          <ButtonWrapper width={'fit-content'} navigateTo="/events">
            Unirme a un evento
          </ButtonWrapper>
        </div>
      </div>
      <div className="hidden lg:block w-full">
        <img
          src="/assets/images/peloteras-hero.png"
          alt="MainSection image"
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
};

export default MainSection;
