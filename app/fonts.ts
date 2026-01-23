import localFont from 'next/font/local';

export const eastmanBold = localFont({
  src: './fonts/Eastman-Bold.ttf',
  variable: '--font-eastman-bold',
  display: 'swap',
  weight: '700',
});

export const eastmanExtrabold = localFont({
  src: './fonts/Eastman-Extrabold.ttf',
  variable: '--font-eastman-extrabold',
  display: 'swap',
  weight: '800',
});
