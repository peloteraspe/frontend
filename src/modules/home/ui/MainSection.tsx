import Link from 'next/link';
import OrganizerEntryLink from '@modules/home/ui/OrganizerEntryLink';
import { getHeroVerifiedPlayers } from '@modules/home/api/getHeroVerifiedPlayers';
import HeroSoccerBallClient from '@modules/home/ui/HeroSoccerBallClient';

export default async function MainSection() {
  const verifiedPlayers = await getHeroVerifiedPlayers();

  return (
    <section className="relative mx-auto w-full max-w-[1600px] overflow-hidden px-5 py-8 sm:px-8 md:py-10 lg:px-10">
      <div className="absolute left-0 top-12 h-44 w-44 rounded-full bg-[#f6d3e5]/55 blur-3xl" />
      <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-mulberry/12 blur-3xl" />

      <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1.02fr)_minmax(320px,0.98fr)] lg:items-center">
        <div className="flex flex-col justify-center">
          <span className="inline-flex w-fit items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase text-mulberry bg-orange-400 italic">
            Más jugadoras, más fútbol
          </span>

          <h1 className="mt-4 font-eastman-extrabold text-6xl leading-[0.93] text-slate-900">
            Encuentra pichangas,
            <br />
            organiza eventos
            <span className="block text-mulberry">en un solo lugar.</span>
          </h1>

          <p className="mt-5 max-w-[34rem] text-lg leading-relaxed text-slate-500">
            Peloteras conecta a mujeres y diversidades que quieren jugar fútbol, sumarse a eventos
            y crear comunidad.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/events"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-mulberry px-7 text-sm font-semibold text-white transition hover:bg-[#470760]"
            >
              Ver eventos
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                <path fillRule="evenodd" d="M2 8a.75.75 0 0 1 .75-.75h8.69L8.22 4.03a.75.75 0 0 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 0 1-1.06-1.06l3.22-3.22H2.75A.75.75 0 0 1 2 8Z" clipRule="evenodd" />
              </svg>
            </Link>
            <OrganizerEntryLink className="inline-flex h-12 items-center justify-center rounded-full border border-slate-300 px-7 text-sm font-semibold text-slate-700 transition hover:bg-white">
              Quiero organizar
            </OrganizerEntryLink>
          </div>

          {verifiedPlayers.length > 0 && (
            <p className="mt-4 text-sm text-slate-500">
              <span className="font-semibold text-slate-700">{verifiedPlayers.length}+</span>{' '}
              jugadoras verificadas en la comunidad
            </p>
          )}
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
