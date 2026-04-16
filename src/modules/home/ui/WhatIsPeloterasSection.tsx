import Link from 'next/link';
import { whatIsPeloterasCards } from '@modules/home/ui/homeContent';

export default function WhatIsPeloterasSection() {
  return (
    <section className="w-full bg-white" id="que-es-peloteras">
      <div className="mx-auto w-full max-w-[1600px] px-5 py-12 sm:px-8 sm:py-16 lg:px-10 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-center">
          <div>
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
              className="mt-6 inline-flex h-11 items-center rounded-full bg-mulberry px-5 text-sm font-semibold text-white transition hover:bg-[#470760]"
            >
              Ver eventos publicados
            </Link>
          </div>

          <div className="flex flex-col divide-y divide-slate-100">
            {whatIsPeloterasCards.map((card, i) => (
              <div key={card.title} className="flex gap-5 py-5 first:pt-0 last:pb-0">
                <span className="mt-0.5 w-8 shrink-0 font-eastman-extrabold text-2xl leading-none text-slate-100 select-none">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="font-semibold text-slate-900">{card.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{card.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
