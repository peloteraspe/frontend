import Link from 'next/link';
import HomeReveal from '@modules/home/ui/HomeReveal';
import OrganizerEntryLink from '@modules/home/ui/OrganizerEntryLink';
import { adminBenefits, playerBenefits } from '@modules/home/ui/homeContent';

const inner = 'site-shell';
const ballCursor = 'url("/assets/cursor-ball.svg") 9 9, pointer';

export default function LandingGrowthBlocks() {
  return (
    <div className="flex w-full flex-col gap-8 sm:gap-10 lg:gap-12">
      {/* ── Para jugadoras ─────────────────────────────────────────── */}
      <section className="home-scroll-target w-full" id="para-jugadoras">
        <HomeReveal className={inner}>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)] lg:items-start">
            <div className="max-w-[34rem]">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-mulberry/75">
                Para jugadoras
              </p>
              <h2 className="mt-3 font-eastman-extrabold text-4xl leading-[1.02] text-slate-900 sm:text-5xl lg:text-[3rem]">
                Más pichangas para volver a la cancha.
              </h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                Encuentra pichangas con toda la información que necesitas para decidir si te sumas.
                Sin depender de chats ni grupos de WhatsApp.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/signUp?source=home-jugadoras"
                  className="home-button-micro inline-flex h-12 items-center rounded-full bg-mulberry px-6 text-base font-semibold text-white shadow-[0_18px_36px_-28px_rgba(84,8,111,0.9)] hover:bg-[#470760]"
                >
                  Crear mi cuenta
                </Link>
                <Link
                  href="/events"
                  className="home-button-micro premium-outline inline-flex h-12 items-center rounded-full px-6 text-base font-semibold text-slate-700 hover:bg-white"
                >
                  Explorar eventos
                </Link>
              </div>
            </div>

            <div className="flex flex-col divide-y divide-slate-100/90">
              {playerBenefits.map((item, i) => (
                <div
                  key={item.title}
                  className="group flex gap-5 py-5 transition-transform duration-300 first:pt-0 last:pb-0 hover:translate-x-1"
                  style={{ cursor: ballCursor }}
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
          <div className="rounded-[2rem] bg-[#f7f1fb] px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
            <div className="max-w-[34rem]">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-mulberry/75">
                Para administradoras de eventos
              </p>
              <h2 className="mt-3 font-eastman-extrabold text-4xl leading-[1.02] text-slate-900 sm:text-5xl lg:text-[3rem]">
                Las herramientas para organizar fútbol con más orden.
              </h2>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {adminBenefits.map((item, i) => (
                <article
                  key={item.title}
                  className="rounded-[1.5rem] bg-white/70 px-5 py-5"
                  style={{ cursor: ballCursor }}
                >
                  <span className="text-xs font-semibold uppercase tracking-wide text-mulberry/50">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mt-2 text-lg font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-1.5 text-base leading-7 text-slate-500">{item.description}</p>
                </article>
              ))}
            </div>

            <div className="mt-7">
              <OrganizerEntryLink className="home-button-micro inline-flex h-12 items-center rounded-full bg-mulberry px-6 text-base font-semibold text-white shadow-[0_18px_36px_-28px_rgba(84,8,111,0.9)] hover:bg-[#470760]">
                Activar perfil organizadora
              </OrganizerEntryLink>
            </div>
          </div>
        </HomeReveal>
      </section>

      {/* ── Patrocinios ────────────────────────────────────────────── */}
      <section className="home-scroll-target w-full" id="patrocinios">
        <HomeReveal className={inner}>
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#54086F] via-[#3D0854] to-[#1E0635] px-6 py-10 sm:px-8 sm:py-12 lg:px-10 lg:py-14">
            {/* Glow coral — top right */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-[22rem] w-[22rem] rounded-full bg-primary/30 blur-3xl" aria-hidden="true" />
            {/* Anillos decorativos — círculo central de la cancha */}
            <div className="pointer-events-none absolute right-[-8rem] top-1/2 h-[28rem] w-[28rem] -translate-y-1/2 rounded-full border border-white/[0.12]" aria-hidden="true" />
            <div className="pointer-events-none absolute right-[-14rem] top-1/2 h-[42rem] w-[42rem] -translate-y-1/2 rounded-full border border-white/[0.07]" aria-hidden="true" />
            <div className="pointer-events-none absolute right-[-20rem] top-1/2 h-[56rem] w-[56rem] -translate-y-1/2 rounded-full border border-white/[0.04]" aria-hidden="true" />

            <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="max-w-[34rem]">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white opacity-80">
                  Patrocinios
                </p>
                <h2 className="mt-3 font-eastman-extrabold text-4xl leading-[1.02] text-white sm:text-5xl lg:text-[3rem]">
                  Suma tu marca a una comunidad que ya está en movimiento.
                </h2>
                <p className="mt-4 text-lg leading-8 text-white opacity-90">
                  Jugadoras, organizadoras y redes activas dentro y fuera de la cancha. Diseñamos
                  colaboraciones que suman valor real, no solo presencia.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <Link
                  href="/patrocinios"
                  className="home-button-micro inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-base font-semibold text-mulberry hover:bg-slate-50"
                >
                  Quiero sumar mi marca
                </Link>
                <a
                  href="mailto:contacto@peloteras.com?subject=Quiero%20sumar%20mi%20marca%20a%20Peloteras"
                  className="home-button-micro inline-flex h-12 items-center justify-center rounded-full border border-white/40 bg-white/15 px-6 text-base font-semibold text-white hover:bg-white/25"
                >
                  Escríbenos directo
                </a>
              </div>
            </div>
          </div>
        </HomeReveal>
      </section>

      {/* ── CTA final ──────────────────────────────────────────────── */}
      <section className="w-full" id="cta-final">
        <HomeReveal className={inner}>
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#F5916A] via-[#F0815B] to-[#E06040] px-6 py-10 sm:px-8 sm:py-12 lg:px-10 lg:py-14">
            {/* Glow mulberry — bottom left */}
            <div className="pointer-events-none absolute -bottom-16 -left-16 h-[22rem] w-[22rem] rounded-full bg-mulberry/40 blur-3xl" aria-hidden="true" />
            {/* Glow claro — top right */}
            <div className="pointer-events-none absolute -right-10 -top-10 h-[18rem] w-[18rem] rounded-full bg-white/20 blur-3xl" aria-hidden="true" />

            <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="max-w-[28rem]">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-900/60">
                  Súmate
                </p>
                <h2 className="mt-3 font-eastman-extrabold text-4xl leading-[1.02] text-slate-900 sm:text-5xl lg:text-[3rem]">
                  Haz que tu próximo partido te encuentre en Peloteras.
                </h2>
                <p className="mt-4 text-lg leading-8 text-slate-900/80">
                  Anótate a tu próxima pichanga o abre la tuya para tu comunidad. Las dos cuentan.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <Link
                  href="/events"
                  className="home-button-micro inline-flex h-12 items-center justify-center rounded-full bg-slate-900 px-6 text-base font-semibold text-white hover:bg-slate-800"
                >
                  Ver eventos
                </Link>
                <Link
                  href="/signUp?source=home-final-cta"
                  className="home-button-micro inline-flex h-12 items-center justify-center rounded-full border border-slate-900/25 bg-slate-900/[0.10] px-6 text-base font-semibold text-slate-900 hover:bg-slate-900/20"
                >
                  Crear mi cuenta
                </Link>
              </div>
            </div>
          </div>
        </HomeReveal>
      </section>
    </div>
  );
}
