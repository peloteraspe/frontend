import Link from 'next/link';
import OrganizerEntryLink from '@modules/home/ui/OrganizerEntryLink';
import { getHeroCommunitySnapshot } from '@modules/home/api/getHeroVerifiedPlayers';
import HomeReveal from '@modules/home/ui/HomeReveal';
import HeroSoccerBallClient from '@modules/home/ui/HeroSoccerBallClient';

export default async function MainSection() {
  const { registeredPlayersCount, verifiedPlayers } = await getHeroCommunitySnapshot();

  return (
    <section className="site-shell home-scroll-target relative mt-3 overflow-x-clip sm:mt-4" id="inicio">
      <div className="site-panel rounded-[2rem] bg-gradient-to-br from-[#FFF9F6] via-white to-[#F8F0FF] shadow-[0_0_0_1px_rgba(15,23,42,0.06)] px-6 py-10 sm:px-8 sm:py-12 lg:px-10 lg:py-14">

        {/* Ambient glows — anclan los colores de marca al fondo del panel */}
        <div
          className="pointer-events-none absolute -left-20 -top-20 h-[30rem] w-[30rem] rounded-full bg-primary/8 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-20 right-4 h-[26rem] w-[26rem] rounded-full bg-mulberry/6 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1.02fr)_minmax(320px,0.98fr)] lg:items-center">
          <HomeReveal className="flex min-w-0 flex-col justify-center" eager>
            <div className="relative w-fit max-w-full pr-2">
              <div className="origin-left -rotate-[4deg] rounded-md border-[2.5px] border-mulberry px-4 py-2.5 ring-[1.5px] ring-mulberry/20 ring-offset-1 sm:-rotate-[6deg] sm:px-5 sm:py-3">
                <span className="block font-eastman-extrabold text-[0.82rem] uppercase leading-tight tracking-[0.1em] text-mulberry sm:text-[0.98rem]">
                  Más jugadoras,
                  <span className="block">más fútbol</span>
                </span>
              </div>
            </div>

            <h1 className="mt-4 max-w-[12ch] font-eastman-extrabold text-[clamp(44px,11vw,104px)] leading-[0.95] tracking-[-0.04em] text-slate-900">
              Encuentra tu próxima{' '}
              <span className="text-primary">pichanga</span>
            </h1>

            <p className="mt-5 max-w-[40rem] text-[17px] leading-[1.55] text-slate-600 sm:text-[20px] sm:leading-[1.6]">
              En Peloteras puedes jugar fútbol, encontrar eventos deportivos, organizar los
              tuyos, conectar con más mujeres y personas de la diversidad.
            </p>

            <div className="mt-8 flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/events"
                className="group home-button-micro inline-flex min-h-12 w-full min-w-0 max-w-full items-center justify-center gap-2 rounded-full bg-mulberry px-5 py-3 text-[15px] font-semibold text-white hover:bg-[#470760] sm:h-12 sm:w-auto sm:px-7 sm:py-0 sm:text-base"
              >
                <span className="min-w-0 text-center">Ver eventos</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M2 8a.75.75 0 0 1 .75-.75h8.69L8.22 4.03a.75.75 0 0 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 0 1-1.06-1.06l3.22-3.22H2.75A.75.75 0 0 1 2 8Z"
                    clipRule="evenodd"
                  />
                </svg>
              </Link>
              <OrganizerEntryLink className="group home-button-micro premium-outline inline-flex min-h-12 w-full min-w-0 max-w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-[15px] font-semibold text-slate-700 hover:border-slate-300 hover:bg-white sm:h-12 sm:w-auto sm:px-7 sm:py-0 sm:text-base">
                <span className="min-w-0 text-center leading-tight">Quiero organizar una pichanga</span>
                <span
                  className="h-1.5 w-1.5 rounded-full bg-primary transition-transform duration-300 group-hover:scale-125"
                  aria-hidden="true"
                />
              </OrganizerEntryLink>
            </div>

            {/* Stat de comunidad */}
            <div className="mt-8 flex items-center gap-2.5">
              <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-primary opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              <span className="text-sm font-medium text-slate-500">
                {registeredPlayersCount > 0 ? (
                  <>
                    <span className="font-semibold text-slate-800">{registeredPlayersCount}+</span>{' '}
                    jugadoras ya son parte de la comunidad
                  </>
                ) : (
                  'Comunidad activa'
                )}
              </span>
            </div>
          </HomeReveal>

          <HomeReveal
            className="relative flex min-w-0 items-center justify-center px-1 sm:px-8 lg:pl-6 lg:pr-14"
            delayMs={120}
            eager
          >
            <div className="min-w-0 w-full">
              <div className="relative">
                <HeroSoccerBallClient players={verifiedPlayers} />
              </div>
            </div>
          </HomeReveal>
        </div>
      </div>
    </section>
  );
}
