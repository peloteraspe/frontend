import Link from 'next/link';
import HomeReveal from '@modules/home/ui/HomeReveal';

const steps = [
  {
    eyebrow: 'Explora',
    title: 'Encuentra una fecha para ti',
    description: 'Compara pichangas por fecha, sede, horario, nivel, costo y cupos disponibles.',
  },
  {
    eyebrow: 'Decide',
    title: 'Revisa todo antes de sumarte',
    description: 'Abre el detalle del evento, confirma que va contigo y completa tu inscripción.',
  },
  {
    eyebrow: 'Juega',
    title: 'Llega a la cancha',
    description: 'Ten la información clara, conoce nuevas peloteras y vuelve a jugar más seguido.',
  },
];

export default function HomeHowItWorksSection() {
  return (
    <section className="home-scroll-target w-full" id="como-funciona">
      <HomeReveal className="site-shell">
        <div className="relative overflow-hidden rounded-[2rem] bg-[#f7f1fb] px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <div
            className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-primary/15 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative grid gap-8 lg:grid-cols-[minmax(280px,0.72fr)_minmax(0,1.28fr)] lg:gap-12">
            <div className="max-w-[32rem]">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-mulberry/75">
                Cómo funciona
              </p>
              <h2 className="mt-3 font-eastman-extrabold text-4xl leading-[1.02] text-slate-900 sm:text-5xl lg:text-[3rem]">
                De encontrar una pichanga a entrar a la cancha.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                Peloteras reúne la información importante en un solo lugar para que elegir y
                sumarte sea mucho más simple.
              </p>
              <Link
                href="/events"
                className="group home-button-micro mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-mulberry px-6 py-3 text-base font-semibold text-white hover:bg-[#470760]"
              >
                <span>Explorar todos los eventos</span>
                <span
                  aria-hidden="true"
                  className="transition-transform duration-300 group-hover:translate-x-1"
                >
                  →
                </span>
              </Link>
            </div>

            <ol className="grid gap-4 sm:grid-cols-3">
              {steps.map((step, index) => (
                <li key={step.title} className="relative flex">
                  <article className="premium-card flex h-full w-full flex-col px-5 py-6">
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-mulberry text-sm font-bold text-white">
                        {index + 1}
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-mulberry/60">
                        {step.eyebrow}
                      </span>
                    </div>
                    <h3 className="mt-6 text-xl font-semibold leading-snug text-slate-900">
                      {step.title}
                    </h3>
                    <p className="mt-3 text-base leading-7 text-slate-500">{step.description}</p>
                  </article>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </HomeReveal>
    </section>
  );
}
