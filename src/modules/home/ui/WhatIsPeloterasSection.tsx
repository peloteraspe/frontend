import Link from 'next/link';
import HomeReveal from '@modules/home/ui/HomeReveal';
import { whatIsPeloterasCards } from '@modules/home/ui/homeContent';

export default function WhatIsPeloterasSection() {
  return (
    <section className="home-scroll-target w-full bg-white" id="que-es-peloteras">
      <div className="mx-auto w-full max-w-[1600px] px-5 py-12 sm:px-8 sm:py-16 lg:px-10 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-center">
          <HomeReveal>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mulberry/75">
              Qué es Peloteras
            </p>
            <h2 className="mt-3 max-w-[22ch] font-eastman-extrabold text-3xl leading-[1.02] text-slate-900 sm:text-4xl lg:text-[2.75rem]">
              Una plataforma para jugar fútbol, organizar y mover comunidad.
            </h2>
            <p className="mt-4 max-w-[34rem] text-base leading-relaxed text-slate-500">
              Nace para responder a una necesidad real: abrir más espacios seguros, visibles y
              sostenibles para el fútbol femenino y diverso.
            </p>
            <Link
              href="/events"
              className="home-button-micro mt-6 inline-flex h-11 items-center rounded-full bg-mulberry px-5 text-sm font-semibold text-white shadow-[0_18px_36px_-28px_rgba(84,8,111,0.9)] hover:bg-[#470760]"
            >
              Ver eventos publicados
            </Link>
          </HomeReveal>

          <HomeReveal className="flex flex-col divide-y divide-slate-100" delayMs={90}>
            {whatIsPeloterasCards.map((card, i) => (
              <div
                key={card.title}
                className="group flex gap-5 py-5 transition-transform duration-300 first:pt-0 last:pb-0 hover:translate-x-1"
              >
                <span className="mt-0.5 w-8 shrink-0 select-none font-eastman-extrabold text-2xl leading-none text-slate-100 transition-colors duration-300 group-hover:text-mulberry/25">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="font-semibold text-slate-900">{card.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{card.description}</p>
                </div>
              </div>
            ))}
          </HomeReveal>
        </div>
      </div>
    </section>
  );
}
