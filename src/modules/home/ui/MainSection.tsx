import Link from 'next/link';
import OrganizerEntryLink from '@modules/home/ui/OrganizerEntryLink';
import { getHeroCommunitySnapshot } from '@modules/home/api/getHeroVerifiedPlayers';
import HomeReveal from '@modules/home/ui/HomeReveal';
import HeroSoccerBallClient from '@modules/home/ui/HeroSoccerBallClient';

export default async function MainSection() {
  const { registeredPlayersCount, verifiedPlayers } = await getHeroCommunitySnapshot();

  return (
    <section className="site-shell home-scroll-target relative mt-3 overflow-x-clip sm:mt-4" id="inicio">
      <div className="site-panel rounded-2xl border border-slate-200 bg-white px-6 py-9 sm:px-8 sm:py-11 lg:px-10">
        <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1.02fr)_minmax(320px,0.98fr)] lg:items-center">
          <HomeReveal className="flex min-w-0 flex-col justify-center" eager>
            <div className="flex items-center gap-3">
              <p className="font-eastman-bold text-base italic tracking-[-0.01em] text-mulberry sm:text-lg">
                Más jugadoras, más fútbol
              </p>
            </div>

            <h1
              className="mt-4 max-w-[12ch] font-eastman-extrabold text-slate-900"
              style={{
                fontSize: 'clamp(44px, 6.5vw, 74px)',
                lineHeight: 0.95,
                letterSpacing: '-0.035em',
              }}
            >
              Encuentra tu próxima{' '}
              <span className="text-primary">pichanga</span>
            </h1>

            <p
              className="mt-5 max-w-[34rem] text-slate-600"
              style={{ fontSize: 'clamp(17px, 1.45vw, 18px)', lineHeight: 1.6 }}
            >
              La cancha también es nuestra. Encuentra dónde jugar, conoce nuevas peloteras y haz
              del fútbol parte de tu semana.
            </p>

            <div className="mt-6 flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/events"
                className="group home-button-micro inline-flex min-h-12 w-full min-w-0 max-w-full items-center justify-center gap-2 rounded-xl bg-mulberry px-5 py-3 text-[15px] font-semibold text-white hover:bg-[#470760] sm:h-12 sm:w-auto sm:px-7 sm:py-0 sm:text-base"
              >
                <span className="min-w-0 text-center">Ver pichangas</span>
              </Link>
              <OrganizerEntryLink className="group home-button-micro premium-outline inline-flex min-h-12 w-full min-w-0 max-w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-[15px] font-semibold text-slate-700 hover:border-slate-400 sm:h-12 sm:w-auto sm:px-7 sm:py-0 sm:text-base">
                <span className="min-w-0 text-center leading-tight">Publicar un evento</span>
              </OrganizerEntryLink>
            </div>

            <div className="mt-8 border-l-2 border-primary pl-3">
              <span className="text-sm font-medium text-slate-500">
                {registeredPlayersCount > 0 ? (
                  <>
                    <span className="font-semibold text-slate-800">{registeredPlayersCount}+</span>{' '}
                    jugadoras inscritas
                  </>
                ) : (
                  'Comunidad activa'
                )}
              </span>
            </div>
          </HomeReveal>

          <HomeReveal
            className="relative flex min-w-0 flex-col items-center justify-center px-1 sm:px-8 lg:pl-6 lg:pr-10"
            delayMs={120}
            eager
          >
            <div className="min-w-0 w-full" aria-label="Jugadoras inscritas en Peloteras">
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
