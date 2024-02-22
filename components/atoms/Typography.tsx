import React, { ReactNode, FC } from 'react';

interface TypographyProps {
  children: ReactNode;
  color?: string;
  fontWeight?: string;
  underline?: boolean;
}

export const TitleXL: FC<TypographyProps> = ({ children }) => (
  <h1 className="font-eastman-extrabold text-8xl font-extrabold leading-tight">
    {children}
  </h1>
);

export const TitleL: FC<TypographyProps> = ({ children }) => (
  <h1 className="font-eastman-bold text-7xl font-bold leading-tight">
    {children}
  </h1>
);

export const TitleM: FC<TypographyProps> = ({ children }) => (
  <h1 className="font-eastman-bold text-6xl font-bold leading-tight">
    {children}
  </h1>
);

export const TitleS: FC<TypographyProps> = ({ children }) => (
  <h1 className="font-eastman-bold text-5xl font-bold leading-tight">
    {children}
  </h1>
);

export const TitleXS: FC<TypographyProps> = ({ children }) => (
  <h1 className="font-eastman-bold text-4xl font-bold leading-tight">
    {children}
  </h1>
);


export const SubtitleL: FC<TypographyProps> = ({ children, fontWeight = 'font-normal' }) => (
  <h2 className={`font-poppins text-2xl leading-6 ${fontWeight}`}>
    {children}
  </h2>
)

export const SubtitleM: FC<TypographyProps> = ({ children,  fontWeight = 'font-normal' }) => (
  <h2  className={`font-poppins text-xl leading-5 ${fontWeight}`}>
    {children}
  </h2>
);

export const SubtitleS: FC<TypographyProps> = ({ children, fontWeight = 'font-normal' }) => (
  <h2 className={`font-poppins text-lg leading-4 ${fontWeight}`}>
    {children}
  </h2>
)

export const ParagraphM: FC<TypographyProps> = ({ children, fontWeight = 'font-normal' }) => (
  <p className={`font-poppins text-base ${fontWeight} leading-5`}>
    {children}
  </p>
);

export const ParagraphS: FC<TypographyProps> = ({ children, color = 'text-current', fontWeight = 'font-normal', underline = false }) => {
  const underlineStyle = underline ? `hover:underline` : '';
  return (
    <p className={`font-poppins text-sm leading-3 ${fontWeight} ${color} ${underlineStyle}`}>
      {children}
    </p>
  );
}

export const ButtonM: FC<TypographyProps> = ({ children, color = 'text-current' }) => (
  <p className={`font-poppins text-sm font-semibold leading-5 ${color}`}>
    {children}
  </p>
);
