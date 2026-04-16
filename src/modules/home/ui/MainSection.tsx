import Link from 'next/link';
import OrganizerEntryLink from '@modules/home/ui/OrganizerEntryLink';
import { getHeroVerifiedPlayers } from '@modules/home/api/getHeroVerifiedPlayers';
import HeroSoccerBallClient from '@modules/home/ui/HeroSoccerBallClient';

const heroPoints = [
  'Explora eventos deportivos y pichangas en un solo lugar.',
  'Inscríbete con información clara antes de salir a jugar.',
  'Crea y gestiona eventos deportivos con herramientas pensadas para tu comunidad',
];

export default async function MainSection() {
  const verifiedPlayers = await getHeroVerifiedPlayers();

  return (
    <section className="relative mx-auto w-full max-w-[1600px] overflow-hidden px-5 py-8 sm:px-8 md:py-10 lg:px-10">
      <div className="absolute left-0 top-12 h-44 w-44 rounded-full bg-[#f6d3e5]/55 blur-3xl" />
      <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-mulberry/12 blur-3xl" />

      <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1.02fr)_minmax(320px,0.98fr)] lg:items-center">
        <div className="flex flex-col justify-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mulberry/75">
            Más jugadoras, más fútbol
          </p>
          <h1 className="mt-3 max-w-[14ch] font-eastman-extrabold text-4xl leading-[0.95] text-slate-900 sm:text-5xl lg:text-[4.25rem]">
            Encuentra pichangas y organiza eventos de fútbol femenino
            <span className="block text-mulberry">en un solo lugar.</span>
          </h1>
          <p className="mt-4 max-w-[39rem] text-base leading-7 text-slate-700 sm:text-lg">
            Peloteras conecta a mujeres y diversidades que quieren jugar fútbol, sumarse a eventos
            y crear comunidad con una experiencia más clara, ordenada y pensada para la cancha.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {heroPoints.map((point) => (
              <div
                key={point}
                className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-700 shadow-[0_25px_45px_-40px_rgba(15,23,42,0.65)] backdrop-blur-sm"
              >
                {point}
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/events"
              className="inline-flex h-12 items-center justify-center rounded-full bg-mulberry px-6 text-sm font-semibold text-white transition hover:bg-[#470760]"
            >
              Ver eventos
            </Link>
            <OrganizerEntryLink
              className="inline-flex h-12 items-center justify-center rounded-full border border-slate-300 px-6 text-sm font-semibold text-slate-700 transition hover:bg-white"
            >
              Quiero organizar
            </OrganizerEntryLink>
          </div>

          <p className="mt-4 max-w-[39rem] text-sm leading-6 text-slate-500">
            Una plataforma creada para facilitar que más mujeres y diversidades encuentren dónde
            jugar y cómo organizar nuevos espacios.
          </p>
        </div>

        <div className="relative flex items-center justify-center lg:pl-4">
          <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-[62%] -translate-y-[56%] rounded-full bg-[#f0815b]/18 blur-3xl" />
          <div className="absolute left-1/2 top-1/2 h-44 w-44 translate-x-[10%] -translate-y-[42%] rounded-full bg-mulberry/12 blur-3xl" />
          <div className="relative w-full max-w-[560px] lg:max-w-[600px]">
            <HeroSoccerBallClient players={verifiedPlayers} />
          </div>
        </div>
      </div>
    </section>
  );
}
