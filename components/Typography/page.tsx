import {
  ButtonM,
  ParagraphM,
  ParagraphS,
  SubtitleL,
  SubtitleM,
  SubtitleS,
  Title2XL,
  TitleL,
  TitleM,
  TitleS,
  TitleXL,
} from '@/components/atoms/Typography';
import React from 'react';

const TypographyPage = () => {
  return (
    <div className="w-full px-8 justify-center">
      <div className="bg-[#F1F3F5] w-10/12 h-[136px] flex justify-start items-center rounded-xl px-10 m-auto">
        <TitleL fontWeight='extrabold'>Typography (Style)</TitleL>
      </div>
      <div className="grid grid-cols-7 mt-6 w-10/12 m-auto px-10">
        <div className="col-span-1 flex flex-col justify-center items-center">
          <div className="h-28 flex justify-center items-center">
            <Title2XL fontWeight="extrabold">Aa</Title2XL>
          </div>
          <div className="h-28 flex justify-center items-center">
            <TitleXL fontWeight="extrabold">Aa</TitleXL>
          </div>
          <div className="h-28 flex justify-center items-center">
            <TitleL fontWeight="extrabold">Aa</TitleL>
          </div>
          <div className="h-28 flex justify-center items-center">
            <TitleM fontWeight="extrabold">Aa</TitleM>
          </div>
          <div className="h-28 flex justify-center items-center">
            <TitleS fontWeight="extrabold">Aa</TitleS>
          </div>
          <div className="h-28 flex justify-center items-center">
            <SubtitleL fontWeight="bold">Aa</SubtitleL>
          </div>
          <div className="h-28 flex justify-center items-center">
            <SubtitleM fontWeight="bold">Aa</SubtitleM>
          </div>
          <div className="h-28 flex justify-center items-center">
            <SubtitleS fontWeight="bold">Aa</SubtitleS>
          </div>
          <div className="h-28 flex justify-center items-center">
            <ParagraphM fontWeight="regular">Aa</ParagraphM>
          </div>
          <div className="h-28 flex justify-center items-center">
            <ParagraphS fontWeight="regular">Aa</ParagraphS>
          </div>
          <div className="h-28 flex justify-center items-center">
            <ButtonM fontWeight="extrabold">Aa</ButtonM>
          </div>
        </div>
        <div className="col-span-1 flex flex-col justify-center items-center">
          {/* This is where the name of the style will go */}
          <div className="h-28 flex justify-center items-center">
            <SubtitleM fontWeight="regular">Titles-2XL</SubtitleM>
          </div>
          <div className="h-28 flex justify-center items-center">
            <SubtitleM fontWeight="regular">Titles-XL</SubtitleM>
          </div>
          <div className="h-28 flex justify-center items-center">
            <SubtitleM fontWeight="regular">Titles-L</SubtitleM>
          </div>
          <div className="h-28 flex justify-center items-center">
            <SubtitleM fontWeight="regular">Titles-M</SubtitleM>
          </div>
          <div className="h-28 flex justify-center items-center">
            <SubtitleM fontWeight="regular">Titles-S</SubtitleM>
          </div>
          <div className="h-28 flex justify-center items-center">
            <SubtitleM fontWeight="regular">Subtitle-L</SubtitleM>
          </div>
          <div className="h-28 flex justify-center items-center">
            <SubtitleM fontWeight="regular">Subtitle-M</SubtitleM>
          </div>
          <div className="h-28 flex justify-center items-center">
            <SubtitleM fontWeight="regular">Subtitle-S</SubtitleM>
          </div>
          <div className="h-28 flex justify-center items-center">
            <SubtitleM fontWeight="regular">Paragraph-M</SubtitleM>
          </div>
          <div className="h-28 flex justify-center items-center">
            <SubtitleM fontWeight="regular">Paragraph-S</SubtitleM>
          </div>
          <div className="h-28 flex justify-center items-center">
            <SubtitleM fontWeight="regular">Button-M</SubtitleM>
          </div>
        </div>
        <div className="col-span-1 flex flex-col justify-center items-center">
          {/* This is where the font family will be listed */}
          <div className="h-28 flex justify-center items-center">Eastman</div>
          <div className="h-28 flex justify-center items-center">Eastman</div>
          <div className="h-28 flex justify-center items-center">Eastman</div>
          <div className="h-28 flex justify-center items-center">Eastman</div>
          <div className="h-28 flex justify-center items-center">Eastman</div>
          <div className="h-28 flex justify-center items-center">Poppins</div>
          <div className="h-28 flex justify-center items-center">Poppins</div>
          <div className="h-28 flex justify-center items-center">Poppins</div>
          <div className="h-28 flex justify-center items-center">Poppins</div>
          <div className="h-28 flex justify-center items-center">Poppins</div>
          <div className="h-28 flex justify-center items-center">Poppins</div>
        </div>
        <div className="col-span-1 flex flex-col justify-center items-center">
          {/* This is where you'll put the font size */}
          <div className="h-28 flex justify-center items-center">64px</div>
          <div className="h-28 flex justify-center items-center">48px</div>
          <div className="h-28 flex justify-center items-center">36px</div>
          <div className="h-28 flex justify-center items-center">24px</div>
          <div className="h-28 flex justify-center items-center">16px</div>
          <div className="h-28 flex justify-center items-center">24px</div>
          <div className="h-28 flex justify-center items-center">16px</div>
          <div className="h-28 flex justify-center items-center">12px</div>
          <div className="h-28 flex justify-center items-center">16px</div>
          <div className="h-28 flex justify-center items-center">12px</div>
          <div className="h-28 flex justify-center items-center">14px</div>
        </div>
        <div className="col-span-1 flex flex-col justify-center items-center">
          {/* This is where you'll put the font weight */}
          <div className="h-28 flex justify-center items-center">Extrabold</div>
          <div className="h-28 flex justify-center items-center">Extrabold</div>
          <div className="h-28 flex justify-center items-center">Extrabold</div>
          <div className="h-28 flex justify-center items-center">Extrabold</div>
          <div className="h-28 flex justify-center items-center">Extrabold</div>
          <div className="h-28 flex justify-center items-center">Bold</div>
          <div className="h-28 flex justify-center items-center">Bold</div>
          <div className="h-28 flex justify-center items-center">Bold</div>
          <div className="h-28 flex justify-center items-center">Regular</div>
          <div className="h-28 flex justify-center items-center">Regular</div>
          <div className="h-28 flex justify-center items-center">Extrabold</div>
        </div>
        <div className="col-span-1 flex flex-col justify-center items-center">
          {/* This is where you'll put the line height */}
          <div className="h-28 flex justify-center items-center">64px</div>
          <div className="h-28 flex justify-center items-center">48px</div>
          <div className="h-28 flex justify-center items-center">36px</div>
          <div className="h-28 flex justify-center items-center">24px</div>
          <div className="h-28 flex justify-center items-center">20px</div>
          <div className="h-28 flex justify-center items-center">36px</div>
          <div className="h-28 flex justify-center items-center">24px</div>
          <div className="h-28 flex justify-center items-center">20px</div>
          <div className="h-28 flex justify-center items-center">24px</div>
          <div className="h-28 flex justify-center items-center">20px</div>
          <div className="h-28 flex justify-center items-center">20px</div>
        </div>
        <div className="col-span-1 flex flex-col justify-center items-center">
          <div className="h-28 flex justify-center items-center">None</div>
          <div className="h-28 flex justify-center items-center">None</div>
          <div className="h-28 flex justify-center items-center">None</div>
          <div className="h-28 flex justify-center items-center">None</div>
          <div className="h-28 flex justify-center items-center">None</div>
          <div className="h-28 flex justify-center items-center">None</div>
          <div className="h-28 flex justify-center items-center">None</div>
          <div className="h-28 flex justify-center items-center">None</div>
          <div className="h-28 flex justify-center items-center">None</div>
          <div className="h-28 flex justify-center items-center">None</div>
          <div className="h-28 flex justify-center items-center">None</div>
        </div>
      </div>
    </div>
  );
};

export default TypographyPage;
