import Link from 'next/link';
import { whatIsPeloterasCards } from '@modules/home/ui/homeContent';

export default function WhatIsPeloterasSection() {
  return (
    <section
      className="mx-auto w-full max-w-[1600px] px-5 py-8 sm:px-8 md:py-10 lg:px-10"
      id="que-es-peloteras"
    >
      <div className="rounded-[32px] border border-slate-200 bg-white/95 p-6 shadow-sm sm:p-8 lg:p-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:items-start">
          <div className="max-w-[39rem]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mulberry/75">
              Qué es Peloteras
            </p>
            <h2 className="mt-3 font-eastman-extrabold text-3xl leading-[1.02] text-slate-900 sm:text-4xl lg:text-[2.75rem]">
              Una plataforma para jugar fútbol, organizar eventos y mover comunidad.
            </h2>
            <p className="mt-4 max-w-[39rem] text-sm leading-7 text-slate-600 sm:text-base">
              Peloteras es una plataforma web creada para conectar a mujeres y diversidades que
              quieren jugar fútbol, encontrar pichangas y organizar sus propios encuentros con más
              claridad. Nace para responder a una necesidad real: abrir más espacios seguros,
              visibles y sostenibles para jugar, encontrarse y hacer crecer el fútbol femenino y
              diverso.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {/* <Link
                href="/sobre-peloteras"
                className="inline-flex h-11 items-center rounded-full border border-slate-300 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Conocer Peloteras
              </Link> */}
              <Link
                href="/events"
                className="inline-flex h-11 items-center rounded-full bg-mulberry px-5 text-sm font-semibold text-white transition hover:bg-[#470760]"
              >
                Ver eventos publicados
              </Link>
            </div>
          </div>

          <div className="grid gap-4">
            {whatIsPeloterasCards.map((card) => (
              <article
                key={card.title}
                className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5"
              >
                <h3 className="text-lg font-semibold text-slate-900">{card.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{card.description}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
