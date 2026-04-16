import Link from 'next/link';
import HomeReveal from '@modules/home/ui/HomeReveal';
import OrganizerEntryLink from '@modules/home/ui/OrganizerEntryLink';
import { adminBenefits, playerBenefits } from '@modules/home/ui/homeContent';

const inner = 'mx-auto w-full max-w-[1600px] px-5 py-12 sm:px-8 sm:py-16 lg:px-10 lg:py-20';
const ballCursor = 'url("/assets/cursor-ball.svg") 9 9, pointer';

export default function LandingGrowthBlocks() {
  return (
    <div className="w-full">
      {/* ── Para jugadoras ─────────────────────────────────────────── */}
      <section className="home-scroll-target w-full border-t border-slate-100 bg-white" id="para-jugadoras">
        <HomeReveal className={inner}>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)] lg:items-start">
            <div className="max-w-[34rem]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mulberry/75">
                Para jugadoras
              </p>
              <h2 className="mt-3 font-eastman-extrabold text-3xl leading-[1.02] text-slate-900 sm:text-4xl lg:text-[2.75rem]">
                Más claridad para encontrar dónde jugar.
              </h2>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/signUp?source=home-jugadoras"
                  className="home-button-micro inline-flex h-11 items-center rounded-full bg-mulberry px-5 text-sm font-semibold text-white shadow-[0_18px_36px_-28px_rgba(84,8,111,0.9)] hover:bg-[#470760]"
                >
                  Crear mi cuenta
                </Link>
                <Link
                  href="/events"
                  className="home-button-micro inline-flex h-11 items-center rounded-full border border-slate-300 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Explorar eventos
                </Link>
              </div>
            </div>

            <div className="flex flex-col divide-y divide-slate-100">
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
                    <h3 className="font-semibold text-slate-900">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </HomeReveal>
      </section>

      {/* ── Para administradoras ───────────────────────────────────── */}
      <section className="home-scroll-target w-full bg-[#f4ecf9]" id="para-administradoras">
        <HomeReveal className={inner}>
          <div className="max-w-[34rem]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mulberry/75">
              Para administradoras de eventos
            </p>
            <h2 className="mt-3 font-eastman-extrabold text-3xl leading-[1.02] text-slate-900 sm:text-4xl lg:text-[2.75rem]">
              Las herramientas para organizar fútbol con más orden.
            </h2>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {adminBenefits.map((item, i) => (
              <article
                key={item.title}
                className="home-card-lift rounded-2xl border border-transparent bg-white px-5 py-5 shadow-[0_1px_4px_rgba(84,8,111,0.07)] hover:border-mulberry/10"
                style={{ cursor: ballCursor }}
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-mulberry/50">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-2 font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-slate-500">{item.description}</p>
              </article>
            ))}
          </div>

          <div className="mt-7">
            <OrganizerEntryLink className="home-button-micro inline-flex h-11 items-center rounded-full bg-mulberry px-5 text-sm font-semibold text-white shadow-[0_18px_36px_-28px_rgba(84,8,111,0.9)] hover:bg-[#470760]">
              Activar perfil organizadora
            </OrganizerEntryLink>
          </div>
        </HomeReveal>
      </section>

      {/* ── Patrocinios ────────────────────────────────────────────── */}
      <section className="home-scroll-target w-full bg-mulberry" id="patrocinios">
        <HomeReveal className={inner}>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="max-w-[34rem]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
                Patrocinios
              </p>
              <h2 className="mt-3 font-eastman-extrabold text-3xl leading-[1.02] text-white sm:text-4xl lg:text-[2.75rem]">
                Suma tu marca a una comunidad que activa fútbol femenino.
              </h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link
                href="/patrocinios"
                className="home-button-micro inline-flex h-11 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-mulberry hover:bg-slate-100"
              >
                Quiero sumar mi marca
              </Link>
              <a
                href="mailto:contacto@peloteras.com?subject=Quiero%20sumar%20mi%20marca%20a%20Peloteras"
                className="home-button-micro inline-flex h-11 items-center justify-center rounded-full border border-white/25 px-6 text-sm font-semibold text-white hover:bg-white/10"
              >
                contacto@peloteras.com
              </a>
            </div>
          </div>
        </HomeReveal>
      </section>

      {/* ── CTA final ──────────────────────────────────────────────── */}
      <section className="w-full bg-primary" id="cta-final">
        <HomeReveal className={inner}>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="max-w-[28rem]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-900/50">
                Súmate
              </p>
              <h2 className="mt-3 font-eastman-extrabold text-3xl leading-[1.02] text-slate-900 sm:text-4xl lg:text-[2.75rem]">
                Haz que tu próximo partido te encuentre en Peloteras.
              </h2>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link
                href="/events"
                className="home-button-micro inline-flex h-11 items-center justify-center rounded-full bg-slate-900 px-6 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Explorar eventos
              </Link>
              <Link
                href="/signUp?source=home-final-cta"
                className="home-button-micro inline-flex h-11 items-center justify-center rounded-full border border-slate-900/25 px-6 text-sm font-semibold text-slate-900 hover:bg-slate-900/8"
              >
                Crear mi cuenta
              </Link>
            </div>
          </div>
        </HomeReveal>
      </section>
    </div>
  );
}
