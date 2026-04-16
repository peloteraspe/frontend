import Link from 'next/link';
import AlliesCarousel from '@modules/home/ui/AlliesCarousel';
import OrganizerEntryLink from '@modules/home/ui/OrganizerEntryLink';
import {
  adminBenefits,
  homeAllies,
  playerBenefits,
  sponsorBenefits,
} from '@modules/home/ui/homeContent';

const sectionIntroClass = 'max-w-[39rem]';
const sectionEyebrowClass = 'text-xs font-semibold uppercase tracking-[0.18em] text-mulberry/75';
const sectionTitleClass =
  'mt-3 font-eastman-extrabold text-3xl leading-[1.02] text-slate-900 sm:text-4xl lg:text-[2.75rem]';
const sectionTextClass = 'mt-4 max-w-[39rem] text-sm leading-7 text-slate-600 sm:text-base';
const sectionEyebrowOnDarkClass =
  'text-xs font-semibold uppercase tracking-[0.18em] text-white/70';
const sectionTitleOnDarkClass =
  'mt-3 font-eastman-extrabold text-3xl leading-[1.02] text-white sm:text-4xl lg:text-[2.75rem]';
const sectionTextOnDarkClass =
  'mt-4 max-w-[39rem] text-sm leading-7 text-white/75 sm:text-base';

export default function LandingGrowthBlocks() {
  return (
    <div className="space-y-6 pb-10 md:space-y-8 md:pb-16">
      <section
        className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 md:p-8 lg:p-10"
        id="para-jugadoras"
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)] lg:items-start">
          <div className={sectionIntroClass}>
            <p className={sectionEyebrowClass}>
              Para jugadoras
            </p>
            <h2 className={sectionTitleClass}>
              Más claridad para encontrar dónde jugar y sumarte con confianza.
            </h2>
            <p className={sectionTextClass}>
              Si quieres volver a jugar, encontrar nuevas pichangas o conocer más personas de la
              comunidad, Peloteras te ayuda a descubrir eventos y decidir con mejor información.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/signUp?source=home-jugadoras"
                className="inline-flex h-11 items-center rounded-full bg-mulberry px-5 text-sm font-semibold text-white transition hover:bg-[#470760]"
              >
                Crear mi cuenta
              </Link>
              <Link
                href="/events"
                className="inline-flex h-11 items-center rounded-full border border-slate-300 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Explorar eventos
              </Link>
            </div>
          </div>

          <div className="grid gap-3">
            {playerBenefits.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
              >
                <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="overflow-hidden rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fcf7fe_100%)] p-6 md:p-8 lg:p-10"
        id="para-administradoras"
      >
        <div className={sectionIntroClass}>
          <p className={sectionEyebrowClass}>Para administradoras de eventos</p>
          <h2 className={sectionTitleClass}>
            Si ya organizas pichangas, te ayudamos a hacerlo mejor. Si quieres empezar, te ayudamos
            a dar el primer paso.
          </h2>
          <p className={sectionTextClass}>
            Peloteras está pensada para quienes mueven fútbol en comunidad y necesitan más orden,
            claridad y visibilidad para gestionar sus eventos de forma más simple.
          </p>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {adminBenefits.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-mulberry/10 bg-white px-4 py-4 shadow-sm"
            >
              <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </article>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <OrganizerEntryLink
            className="inline-flex h-11 items-center rounded-full bg-mulberry px-5 text-sm font-semibold text-white transition hover:bg-[#470760]"
          >
            Activar perfil organizadora
          </OrganizerEntryLink>
          <Link
            href="/create-event"
            className="inline-flex h-11 items-center rounded-full border border-slate-300 px-5 text-sm font-semibold text-slate-700 transition hover:bg-white"
          >
            Crear un evento
          </Link>
        </div>
      </section>

      <section
        className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 md:p-8 lg:p-10"
        id="aliadxs"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className={sectionIntroClass}>
            <p className={sectionEyebrowClass}>
              Aliadxs
            </p>
            <h2 className={sectionTitleClass}>
              Marcas, espacios y comunidades que quieren sumar más fútbol.
            </h2>
            <p className={sectionTextClass}>
              Queremos construir alianzas con marcas, espacios y comunidades que compartan el
              objetivo de abrir más lugares para jugar, encontrarnos y activar experiencias con
              propósito alrededor del fútbol.
            </p>
          </div>
          <Link
            href="/patrocinios"
            className="inline-flex h-11 items-center rounded-full border border-slate-300 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Ver propuesta para marcas
          </Link>
        </div>

        {homeAllies.length > 0 ? (
          <AlliesCarousel allies={homeAllies} />
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-7 text-slate-600">
            Pronto anunciaremos a nuestras primeras marcas y comunidades aliadas. Si tu proyecto
            quiere ser parte de este crecimiento, conversemos.
          </div>
        )}
      </section>

      <section
        className="overflow-hidden rounded-3xl border border-mulberry/20 bg-[#f8f2fb] p-6 md:p-8 lg:p-10"
        id="patrocinios"
      >
        <div className={sectionIntroClass}>
          <p className={sectionEyebrowClass}>Patrocinios</p>
          <h2 className={sectionTitleClass}>
            Suma tu marca a una comunidad que juega, organiza y activa fútbol femenino.
          </h2>
          <p className={sectionTextClass}>
            Si tu marca quiere estar presente en experiencias con propósito, diseñamos alianzas,
            beneficios y activaciones pensadas para conectar con la comunidad Peloteras.
          </p>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {sponsorBenefits.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-mulberry/15 bg-white px-4 py-4 text-sm text-slate-700"
            >
              <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 leading-6 text-slate-600">{item.description}</p>
            </article>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/patrocinios"
            className="inline-flex h-11 items-center rounded-full bg-mulberry px-5 text-sm font-semibold text-white transition hover:bg-[#470760]"
          >
            Quiero sumar mi marca
          </Link>
          <a
            href="mailto:contacto@peloteras.com?subject=Quiero%20sumar%20mi%20marca%20a%20Peloteras"
            className="inline-flex h-11 items-center rounded-full border border-mulberry/30 px-5 text-sm font-semibold text-mulberry transition hover:bg-white"
          >
            contacto@peloteras.com
          </a>
        </div>
      </section>

      <section
        className="overflow-hidden rounded-3xl border border-slate-900 bg-slate-900 p-6 text-white md:p-8 lg:p-10"
        id="cta-final"
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className={sectionIntroClass}>
            <p className={sectionEyebrowOnDarkClass}>Súmate</p>
            <h2 className={sectionTitleOnDarkClass}>
              Haz que tu próximo partido te encuentre en Peloteras.
            </h2>
            <p className={sectionTextOnDarkClass}>
              Ya sea que quieras jugar, organizar o sumar tu marca, Peloteras es el punto de
              encuentro para abrir más espacios, conectar comunidad y mover más fútbol.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Link
              href="/events"
              className="inline-flex h-11 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Explorar eventos
            </Link>
            <Link
              href="/signUp?source=home-final-cta"
              className="inline-flex h-11 items-center justify-center rounded-full border border-white/30 px-6 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Crear mi cuenta
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
