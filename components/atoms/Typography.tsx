import React, { FC, ReactNode } from 'react';

interface TypographyProps {
  children: ReactNode;
  color?: string;
  fontWeight?: string;
  underline?: boolean;
  italic?: boolean;
}

const getFontWeightClass = (fontWeight?: string) => {
  switch (fontWeight) {
    case 'bold':
      return 'font-bold';
    case 'extrabold':
      return 'font-extrabold';
    case 'semibold':
      return 'font-semibold';
    default:
      return 'font-normal';
  }
};

const getColorClass = (color?: string) => {
  return color || 'text-black';
};

const getUnderlineClass = (underline?: boolean) => {
  return underline ? 'underline' : '';
};

export const Title2XL: FC<TypographyProps> = ({ children, fontWeight, color }) => (
  <h1
    className={`font-eastman-extrabold ${getFontWeightClass(
      fontWeight
    )} text-6xl leading-none ${getColorClass(color)}`}
  >
    {children}
  </h1>
);

export const TitleXL: FC<TypographyProps> = ({ children, fontWeight, color }) => (
  <h1
    className={`font-eastman ${getFontWeightClass(
      fontWeight
    )} text-5xl leading-none ${getColorClass(color)}`}
  >
    {children}
  </h1>
);

export const TitleL: FC<TypographyProps> = ({ children, fontWeight, color }) => (
  <h1
    className={`font-eastman ${getFontWeightClass(
      fontWeight
    )} text-4xl leading-none ${getColorClass(color)}`}
  >
    {children}
  </h1>
);

export const TitleM: FC<TypographyProps> = ({ children, fontWeight, color }) => (
  <h1
    className={`font-eastman ${getFontWeightClass(
      fontWeight
    )} text-3xl leading-none ${getColorClass(color)}`}
  >
    {children}
  </h1>
);

export const TitleS: FC<TypographyProps> = ({ children, fontWeight, color }) => (
  <h1
    className={`font-eastman ${getFontWeightClass(
      fontWeight
    )} text-2xl leading-none ${getColorClass(color)}`}
  >
    {children}
  </h1>
);

export const SubtitleL: FC<TypographyProps> = ({ children, fontWeight, color, italic }) => (
  <span
    className={`font-poppins text-2xl ${getFontWeightClass(
      fontWeight
    )} leading-8 ${getColorClass(color)} ${italic ? 'italic' : ''}`}
  >
    {children}
  </span>
);

export const SubtitleM: FC<TypographyProps> = ({ children, fontWeight, color }) => (
  <h2
    className={`font-poppins text-xl ${getFontWeightClass(
      fontWeight
    )} leading-6 ${getColorClass(color)}`}
  >
    {children}
  </h2>
);

export const SubtitleS: FC<TypographyProps> = ({ children, fontWeight, color }) => (
  <h2
    className={`font-poppins text-lg ${getFontWeightClass(
      fontWeight
    )} leading-5 ${getColorClass(color)}`}
  >
    {children}
  </h2>
);

export const ParagraphM: FC<TypographyProps> = ({ children, fontWeight, color }) => (
  <p
    className={`font-poppins text-base ${getFontWeightClass(
      fontWeight
    )} leading-5 ${getColorClass(color)}`}
  >
    {children}
  </p>
);

export const ParagraphS: FC<TypographyProps> = ({
  children,
  color,
  fontWeight,
  underline,
}) => (
  <p
    className={`font-poppins text-sm ${getFontWeightClass(
      fontWeight
    )} leading-4 ${getColorClass(color)} ${getUnderlineClass(underline)}`}
  >
    {children}
  </p>
);

export const ButtonM: FC<TypographyProps> = ({
  children,
  color,
  fontWeight,
}) => (
  <p
    className={`font-poppins text-sm ${getFontWeightClass(
      fontWeight
    )} leading-5 ${getColorClass(color)}`}
  >
    {children}
  </p>
);