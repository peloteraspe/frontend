import type { StaticImageData } from 'next/image';
import bananaPopLogo from '@core/assets/aliadxs/Banana-Pop.png';
import bibliotecaAlSurLogo from '@core/assets/aliadxs/biblioteca-al-sur.png';
import fullChocolateLogo from '@core/assets/aliadxs/FULL-CHOCOLATE.png';
import hielosChillLogo from '@core/assets/aliadxs/hieloschill.jpeg';
import logoSiAcepto from '@core/assets/aliadxs/Logo-Si acepto.png';
import matCafecitoLogo from '@core/assets/aliadxs/mat-cafecito.png';
import mipMasIgualdadLogo from '@core/assets/aliadxs/mip_mas-igualdad.png';
import papatasComunidadLogo from '@core/assets/aliadxs/Papatas-comunidad.png';
import redBusLogo from '@core/assets/aliadxs/RedBus_Logo.png';
import vidaSinPlasticoPeruLogo from '@core/assets/aliadxs/vida-sin-plastico-peru.jpeg';

export type HomeCard = {
  title: string;
  description: string;
};

export type HomeAlly = {
  name: string;
  logoSrc: StaticImageData | string;
  href: string;
};

export const whatIsPeloterasCards: HomeCard[] = [
  {
    title: 'Encuentra dónde jugar',
    description:
      'Explora pichangas, partidos y encuentros con fecha, hora, lugar, cupos e indicaciones claras en un solo lugar.',
  },
  {
    title: 'Organiza con más orden',
    description:
      'Publica tus eventos, comparte la información importante y evita depender de chats dispersos para coordinar.',
  },
  {
    title: 'Haz crecer comunidad',
    description:
      'Conecta a jugadoras y organizadoras que quieren abrir más espacios para el fútbol femenino y diverso.',
  },
];

export const playerBenefits: HomeCard[] = [
  {
    title: 'Más claridad antes de jugar',
    description:
      'Revisa detalles clave del evento antes de inscribirte: costo, sede, horario, cupos e indicaciones.',
  },
  {
    title: 'Más opciones para sumarte',
    description:
      'Descubre eventos publicados por la comunidad y encuentra nuevas oportunidades para jugar más seguido.',
  },
  {
    title: 'Más comunidad en cancha',
    description:
      'Conoce a jugadoras con las mismas ganas de jugar y construye el hábito de estar en cancha más seguido.',
  },
];

export const adminBenefits: HomeCard[] = [
  {
    title: 'Publica con información completa',
    description:
      'Agrega fecha, hora, lugar, cupos, precio e indicaciones en un solo flujo para que todo quede claro desde el inicio.',
  },
  {
    title: 'Llega a más jugadoras interesadas',
    description:
      'Tu evento vive dentro de una comunidad que ya está buscando dónde jugar, inscribirse y conectar con más fútbol.',
  },
  {
    title: 'Gestiona inscripciones con confianza',
    description:
      'Haz seguimiento de participantes y organiza cada fecha con más orden y menos fricción operativa.',
  },
  {
    title: 'Valida ingresos con QR',
    description:
      'Acelera el check-in el día del evento con un sistema pensado para confirmar entradas de forma más rápida.',
  },
  {
    title: 'Reutiliza eventos como plantilla',
    description:
      'Si organizas seguido, puedes tomar una fecha anterior como base y lanzar nuevas convocatorias sin empezar de cero.',
  },
];

export const sponsorBenefits: HomeCard[] = [
  {
    title: 'Visibilidad en una comunidad activa',
    description:
      'Conecta con jugadoras, organizadoras y audiencias que participan en experiencias reales dentro y fuera de la cancha.',
  },
  {
    title: 'Activaciones con propósito',
    description:
      'Diseñamos colaboraciones que suman valor al evento, a la comunidad y a la presencia de tu marca.',
  },
  {
    title: 'Asociación con fútbol femenino y diverso',
    description:
      'Tu marca se vincula con una iniciativa que busca abrir más espacios para jugar, organizar y pertenecer.',
  },
];

export const homeAllies: HomeAlly[] = [
  // Agrega el enlace de redirección de cada marca en `href`.
  // Si lo dejas vacío, el logo se mostrará sin click.
  {
    name: 'Si Acepto',
    logoSrc: logoSiAcepto,
    href: 'https://www.siacepto.pe/',
  },
  {
    name: 'RedBus',
    logoSrc: redBusLogo,
    href: 'https://www.redbus.pe/',
  },
  {
    name: 'Full Chocolate',
    logoSrc: fullChocolateLogo,
    href: 'https://www.instagram.com/fullchocolate/',
  },
  {
    name: 'MIP Más Igualdad',
    logoSrc: mipMasIgualdadLogo,
    href: 'https://www.masigualdad.pe/',
  },
  {
    name: 'Biblioteca al Sur',
    logoSrc: bibliotecaAlSurLogo,
    href: 'https://www.instagram.com/bibliotecaalsur/',
  },
  {
    name: 'Hielos Chill',
    logoSrc: hielosChillLogo,
    href: 'https://www.instagram.com/hieloschill/',
  },
  {
    name: 'Vida sin Plástico Perú',
    logoSrc: vidaSinPlasticoPeruLogo,
    href: 'https://www.instagram.com/vidasinplasticoperu/',
  },
  {
    name: 'Banana Pop',
    logoSrc: bananaPopLogo,
    href: 'https://bananapop.pe/',
  },
  {
    name: 'Papatas Comunidad',
    logoSrc: papatasComunidadLogo,
    href: 'https://www.tiktok.com/@holapapatas',
  },
  {
    name: 'Mat Cafecito',
    logoSrc: matCafecitoLogo,
    href: 'https://www.instagram.com/matcafecito/',
  },
];
