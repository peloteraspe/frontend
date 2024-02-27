import { ButtonWrapper } from '@/components/Button';
import { SubtitleL, Title2XL } from '@/components/atoms/Typography';
import React from 'react';

const Hero = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-16 flex justify-between">
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
            , conectarte con más mujeres apasionadas y vivir la verdadera
            esencia del fútbol femenino.
          </SubtitleL>
        </div>
        <div className="mt-8">
          <ButtonWrapper>Unirme a un evento</ButtonWrapper>
        </div>
      </div>
      <div className="hidden lg:block w-full">
        <img
          src="/assets/images/hero-image.png"
          alt="Hero image"
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
};

export default Hero;
