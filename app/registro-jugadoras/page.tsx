import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './landing.module.css';

const originStory = [
  {
    title: 'Empezamos por una necesidad real',
    description:
      'Muchas jugadoras querian jugar seguido, pero terminaban dependiendo de chats desordenados y cupos de ultimo minuto.',
  },
  {
    title: 'Construimos una comunidad primero',
    description:
      'Peloteras crece desde una idea simple: cuando hay espacios entre mujeres, aumenta la confianza para volver a la cancha.',
  },
  {
    title: 'Luego ordenamos la experiencia',
    description:
      'Evento, registro, pago y entrada en un mismo flujo para que la energia se vaya al juego y no a la logistica.',
  },
];

const communityPillars = [
  {
    title: 'Pertenencia',
    description:
      'No vienes solo a completar un cupo. Vienes a formar parte de una red de jugadoras que se reconoce y se acompana.',
  },
  {
    title: 'Seguridad y respeto',
    description:
      'Priorizamos espacios de juego sin violencia ni discriminacion, donde competir y aprender se sienta seguro.',
  },
  {
    title: 'Continuidad deportiva',
    description:
      'El objetivo no es un partido aislado. Es ayudarte a sostener el habito de jugar durante todo el ano.',
  },
];

const impactFacts = [
  {
    metric: '31%',
    insight:
      'de personas adultas no alcanzan actividad fisica suficiente; la inactividad es mayor en mujeres (OMS, 2024).',
    sourceLabel: 'OMS - Physical Activity (2024)',
    sourceUrl: 'https://www.who.int/news-room/fact-sheets/detail/physical-activity',
  },
  {
    metric: '85%',
    insight:
      'de adolescentes mujeres no cumplen recomendaciones de actividad fisica (OMS, 2024).',
    sourceLabel: 'OMS - Physical Activity (2024)',
    sourceUrl: 'https://www.who.int/news-room/fact-sheets/detail/physical-activity',
  },
  {
    metric: '1.3M',
    insight:
      'de chicas se desconectan del deporte en adolescencia por barreras de pertenencia, seguridad y juicio social (Women in Sport, 2026).',
    sourceLabel: 'Women in Sport (2026)',
    sourceUrl:
      'https://womeninsport.org/news/1-3-million-girls-who-once-loved-sport-drop-out-as-teenagers-and-thats-not-ok/',
  },
];

const testimonials = [
  {
    quote:
      'Antes era puro "quien arma?" y nunca cerrabamos. Aqui entre, reserve y ya tengo grupo fijo.',
    role: 'Defensa, 28 años',
  },
  {
    quote:
      'Me ayudo a encontrar partidos con mi ritmo. Ya no siento que juego fuera de nivel ni fuera de lugar.',
    role: 'Volante, 31 años',
  },
  {
    quote:
      'Lo mejor es que todo esta ordenado: evento, pago y entrada. Cero estres el dia del partido.',
    role: 'Delantera, 25 años',
  },
];

const faqs = [
  {
    question: 'Registrarme tiene costo?',
    answer:
      'No. Crear tu cuenta en Peloteras es gratis. Solo pagas cuando eliges reservar un evento.',
  },
  {
    question: 'Por que promover deporte solo femenino es importante?',
    answer:
      'Porque reduce barreras reales de participacion: miedo al juicio, falta de seguridad y ausencia de espacios donde sentirse parte.',
  },
  {
    question: 'Necesito equipo propio para empezar?',
    answer:
      'No necesariamente. Puedes registrarte como jugadora individual y unirte a partidos disponibles.',
  },
  {
    question: 'Como se que el partido es para mi nivel?',
    answer:
      'Tu nivel y posicion del perfil ayudan a mostrarte mejores opciones y a mantener partidos mas equilibrados.',
  },
  {
    question: 'Puedo actualizar mi perfil luego?',
    answer:
      'Si. Puedes editar nivel y posiciones cuando quieras desde tu perfil.',
  },
];

export const metadata: Metadata = {
  title: 'Registro de Jugadoras | Peloteras',
  description:
    'Unete a Peloteras y sumate a una comunidad que impulsa el futbol femenino con espacios seguros, pertenencia y juego constante.',
  alternates: { canonical: '/registro-jugadoras' },
};

export default function RegistroJugadorasPage() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
      <div className={`${styles.heroShell} rounded-3xl p-6 sm:p-8 lg:p-10`}>
        <span className={styles.glowOne} />
        <span className={styles.glowTwo} />

        <div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
          <div>
            <p className="inline-flex rounded-full border border-[#54086F]/15 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#54086F]">
              Comunidad + futbol femenino
            </p>
            <h1 className="mt-4 font-eastman-extrabold text-4xl leading-tight text-slate-900 sm:text-5xl">
              No es solo jugar un partido.
              <span className="block text-[#54086F]">Es volver a sentir que perteneces.</span>
            </h1>
            <p className="mt-4 max-w-2xl text-base text-slate-700 sm:text-lg">
              Peloteras nace para que mas mujeres jueguen de forma constante, segura y acompanada.
              Te conectamos con partidos reales y con una comunidad que te sostiene dentro y fuera
              de la cancha.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/signUp?source=landing-registro-jugadoras"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-[#54086F] px-6 text-sm font-semibold text-white transition hover:bg-[#470B62]"
              >
                Quiero unirme a la comunidad
              </Link>
              <Link
                href="/login?message=Inicia%20sesion%20para%20seguir%20jugando"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-[#54086F] px-6 text-sm font-semibold text-[#54086F] transition hover:bg-[#54086F] hover:text-white"
              >
                Ya tengo cuenta
              </Link>
            </div>

            <p className="mt-3 text-sm text-slate-500">
              Registro en minutos. Sin compromiso. Mas comunidad, mas cancha.
            </p>
          </div>

          <aside className={`${styles.sectionCard} rounded-2xl border border-white/70 p-5 shadow-sm sm:p-6`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#54086F]">
              Lo que defendemos en Peloteras
            </p>
            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-[#F0815B]" />
                Espacios de juego entre mujeres y diversidad de genero, con enfoque de respeto.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-[#F0815B]" />
                Comunidad activa para jugar mas seguido y sostener el habito deportivo.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-[#F0815B]" />
                Visibilidad y crecimiento del futbol femenino desde la practica real.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-[#F0815B]" />
                Experiencia ordenada para enfocarte en jugar, no en perseguir coordinaciones.
              </li>
            </ul>
          </aside>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="font-eastman-extrabold text-3xl text-slate-900 sm:text-4xl">
          Asi nace Peloteras
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-600 sm:text-base">
          Lo que somos hoy viene de una realidad compartida por miles de jugadoras.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {originStory.map((card) => (
            <article key={card.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">{card.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{card.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-eastman-extrabold text-3xl text-slate-900 sm:text-4xl">
          Por que impulsar deporte femenino importa
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-600 sm:text-base">
          No es una moda. Es una necesidad de salud, pertenencia y equidad deportiva.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {impactFacts.map((fact) => (
            <article
              key={fact.metric}
              className={`${styles.stepCard} rounded-2xl border border-slate-200 bg-white p-5`}
            >
              <p className="font-eastman-extrabold text-4xl text-[#54086F]">{fact.metric}</p>
              <p className="mt-2 text-sm text-slate-600">{fact.insight}</p>
              <a
                href={fact.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex text-xs font-semibold uppercase tracking-wide text-sky-700 hover:underline"
              >
                Fuente: {fact.sourceLabel}
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-eastman-extrabold text-3xl text-slate-900 sm:text-4xl">
          Como se vive comunidad en Peloteras
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {communityPillars.map((pillar) => (
            <article key={pillar.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">{pillar.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{pillar.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
        <h2 className="font-eastman-extrabold text-3xl text-slate-900 sm:text-4xl">
          Nuestro codigo de cancha
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            Respeto total entre jugadoras, organizadoras y equipos.
          </p>
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            Cero tolerancia a violencia, discriminacion o acoso.
          </p>
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            Puntualidad y compromiso para cuidar el tiempo de todas.
          </p>
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            Competencia con juego limpio y apoyo entre comunidad.
          </p>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-eastman-extrabold text-3xl text-slate-900 sm:text-4xl">
          Lo que dice la comunidad
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <blockquote
              key={testimonial.quote}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm leading-6 text-slate-700">&quot;{testimonial.quote}&quot;</p>
              <footer className="mt-3 text-xs font-semibold uppercase tracking-wide text-[#54086F]">
                {testimonial.role}
              </footer>
            </blockquote>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
        <h2 className="font-eastman-extrabold text-3xl text-slate-900 sm:text-4xl">
          Preguntas frecuentes
        </h2>
        <div className="mt-4 space-y-3">
          {faqs.map((faq) => (
            <details key={faq.question} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <summary className="cursor-pointer text-sm font-semibold text-slate-800">{faq.question}</summary>
              <p className="mt-2 text-sm text-slate-600">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-3xl border border-[#54086F]/15 bg-white p-6 text-center shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#54086F]">
          Tu siguiente partido empieza aqui
        </p>
        <h2 className="mt-2 font-eastman-extrabold text-3xl text-slate-900 sm:text-4xl">
          Registrate hoy y ayuda a que mas mujeres jueguen
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-600 sm:text-base">
          Cada nueva jugadora fortalece la comunidad y hace mas visible el futbol femenino.
        </p>
        <Link
          href="/signUp?source=landing-registro-jugadoras"
          className="mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-[#54086F] px-6 text-sm font-semibold text-white transition hover:bg-[#470B62]"
        >
          Unirme ahora a Peloteras
        </Link>
      </section>

      <div className={styles.stickyCta}>
        <Link
          href="/signUp?source=landing-registro-jugadoras"
          className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#54086F] px-4 text-sm font-semibold text-white"
        >
          Unirme a la comunidad
        </Link>
      </div>
    </section>
  );
}
