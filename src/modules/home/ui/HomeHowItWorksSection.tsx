import HomeReveal from '@modules/home/ui/HomeReveal';

const steps = [
  {
    title: 'Encuentra una pichanga',
    description: 'Revisa eventos disponibles por fecha, zona, horario, nivel y cupos.',
  },
  {
    title: 'Elige dónde sumarte',
    description: 'Mira los detalles del evento y decide si va contigo antes de inscribirte.',
  },
  {
    title: 'Llega y juega',
    description: 'Vuelve a la cancha, conoce nuevas peloteras y encuentra más espacios para jugar.',
  },
];

export default function HomeHowItWorksSection() {
  return (
    <section className="home-scroll-target w-full" id="como-funciona">
      <HomeReveal className="site-shell">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:items-start">
          <div className="max-w-[34rem]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-mulberry/75">
              Cómo funciona
            </p>
            <h2 className="mt-3 font-eastman-extrabold text-4xl leading-[1.02] text-slate-900 sm:text-5xl lg:text-[3rem]">
              Pasar de querer jugar a estar en la cancha debería ser simple.
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {steps.map((step, index) => (
              <article
                key={step.title}
                className="premium-card flex h-full flex-col px-5 py-5"
              >
                <span className="font-eastman-extrabold text-2xl leading-none text-mulberry/30">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-base leading-7 text-slate-500">{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </HomeReveal>
    </section>
  );
}
