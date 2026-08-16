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
        <div className="border-y border-slate-200 py-9 sm:py-10 lg:py-12">
          <div className="grid gap-8 lg:grid-cols-[minmax(280px,0.72fr)_minmax(0,1.28fr)] lg:gap-12">
            <div className="max-w-[32rem]">
              <p className="text-sm font-semibold text-mulberry">Cómo funciona</p>
              <h2 className="mt-2 font-eastman-extrabold text-4xl leading-[1.04] text-slate-900 sm:text-5xl">
                Encontrar, elegir y jugar
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                Peloteras reúne la información importante en un solo lugar para que elegir y
                sumarte sea mucho más simple.
              </p>
            </div>

            <ol className="divide-y divide-mulberry/10 border-y border-mulberry/10">
              {steps.map((step, index) => (
                <li key={step.title} className="grid gap-3 py-5 sm:grid-cols-[3rem_1fr] sm:gap-5">
                  <span className="font-eastman-extrabold text-2xl text-mulberry" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-mulberry/70">
                      {step.eyebrow}
                    </p>
                    <h3 className="mt-1 text-xl font-semibold leading-snug text-slate-900">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-base leading-7 text-slate-600">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </HomeReveal>
    </section>
  );
}
