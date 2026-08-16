import Link from 'next/link';
import HomeReveal from '@modules/home/ui/HomeReveal';
import OrganizerEntryLink from '@modules/home/ui/OrganizerEntryLink';
import { adminBenefits, playerBenefits } from '@modules/home/ui/homeContent';

const inner = 'site-shell';
export default function LandingGrowthBlocks() {
  return (
    <div className="flex w-full flex-col gap-8 sm:gap-10 lg:gap-12">
      {/* ── Para jugadoras ─────────────────────────────────────────── */}
      <section className="home-scroll-target w-full" id="para-jugadoras">
        <HomeReveal className={inner}>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)] lg:items-start">
            <div className="max-w-[34rem]">
              <p className="text-sm font-semibold text-mulberry">Para jugar</p>
              <h2 className="mt-2 font-eastman-extrabold text-4xl leading-[1.04] text-slate-900 sm:text-5xl">
                Todo claro antes de entrar a la cancha
              </h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                Encuentra pichangas con la información que necesitas para decidir si te sumas:
                fecha, sede, horario, costo, cupos e indicaciones. Sin depender solo de chats o
                invitaciones sueltas.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/events"
                  className="home-button-micro inline-flex h-12 items-center rounded-xl bg-mulberry px-6 text-base font-semibold text-white hover:bg-[#470760]"
                >
                  Ver pichangas
                </Link>
                <Link
                  href="/signUp?source=home-jugadoras"
                  className="home-button-micro premium-outline inline-flex h-12 items-center rounded-xl px-6 text-base font-semibold text-slate-700 hover:border-slate-400"
                >
                  Crear mi cuenta
                </Link>
              </div>
            </div>

            <div className="flex flex-col divide-y divide-slate-100/90">
              {playerBenefits.map((item, i) => (
                <div
                  key={item.title}
                  className="cursor-ball group flex gap-5 py-5 transition-transform duration-300 first:pt-0 last:pb-0 hover:translate-x-1"
                >
                  <span className="mt-0.5 w-8 shrink-0 select-none font-eastman-extrabold text-2xl leading-none text-mulberry transition-colors duration-300 group-hover:text-primary">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                    <p className="mt-1 text-base leading-7 text-slate-500">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </HomeReveal>
      </section>

      {/* ── Para administradoras ───────────────────────────────────── */}
      <section className="home-scroll-target w-full" id="para-administradoras">
        <HomeReveal className={inner}>
          <div className="rounded-2xl border border-mulberry/10 bg-[#f7f1fb] px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-11">
            <div className="max-w-[34rem]">
              <p className="text-sm font-semibold text-mulberry">Para organizar</p>
              <h2 className="mt-2 max-w-[15ch] font-eastman-extrabold text-4xl leading-[1.04] text-slate-900 sm:text-5xl">
                Publica y gestiona cada fecha en un solo lugar
              </h2>
              <p className="mt-4 max-w-[42rem] text-lg leading-8 text-slate-600">
                Publica tus pichangas, ordena la información del evento y facilita que más
                jugadoras encuentren dónde sumarse.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {adminBenefits.map((item, i) => (
                <article
                  key={item.title}
                  className="cursor-ball rounded-xl border border-mulberry/10 bg-white px-5 py-5"
                >
                  <span className="text-sm font-semibold text-mulberry/50">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mt-2 text-lg font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-1.5 text-base leading-7 text-slate-500">{item.description}</p>
                </article>
              ))}
            </div>

            <div className="mt-7">
              <OrganizerEntryLink className="home-button-micro inline-flex h-12 items-center rounded-xl bg-mulberry px-6 text-base font-semibold text-white hover:bg-[#470760]">
                Publicar un evento
              </OrganizerEntryLink>
            </div>
          </div>
        </HomeReveal>
      </section>

    </div>
  );
}
