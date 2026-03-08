import Link from 'next/link';

const adminHighlights = [
  'Publica eventos en minutos',
  'Centraliza pagos sin errores manuales',
  'Valida entradas con QR',
  'Haz seguimiento de inscritas en un solo lugar',
];

const sponsorHighlights = [
  'Visibilidad frente a comunidad activa',
  'Activaciones con propósito local',
  'Asociación directa al deporte femenino',
];

export default function LandingGrowthBlocks() {
  return (
    <div className="mt-10 space-y-6">
      <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 md:max-h-[520px] md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mulberry/70">
          Para admins organizadoras
        </p>
        <h3 className="mt-2 font-eastman-extrabold text-3xl leading-tight text-slate-900 sm:text-4xl">
          Organiza mejor. Crece más rápido.
        </h3>
        <p className="mt-3 max-w-3xl text-sm text-slate-600 sm:text-base">
          Peloteras te da una operación clara para que dejes el caos del chat y conviertas tu
          comunidad en una experiencia profesional.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {adminHighlights.map((item) => (
            <div
              key={item}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
            >
              {item}
            </div>
          ))}
        </div>

        <div className="mt-6">
          <Link
            href="/organiza-con-peloteras"
            className="inline-flex h-11 items-center rounded-full bg-mulberry px-5 text-sm font-semibold text-white transition hover:bg-[#470760]"
          >
            Postular como admin
          </Link>
        </div>
      </article>

      <article className="overflow-hidden rounded-3xl border border-mulberry/20 bg-[#f8f2fb] p-6 md:max-h-[520px] md:p-10">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mulberry/75">
            Para patrocinadoras
          </p>
          <h3 className="mt-2 font-eastman-extrabold text-4xl leading-tight text-slate-900 sm:text-5xl">
            ¿Quieres apoyar al deporte femenino?
          </h3>
          <p className="mt-4 text-sm text-slate-600 sm:text-base">
            Conecta tu marca con mujeres que juegan cada semana y construyen comunidad real en
            cancha.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {sponsorHighlights.map((item) => (
              <div
                key={item}
                className="rounded-xl border border-mulberry/20 bg-white px-4 py-3 text-sm text-slate-700"
              >
                {item}
              </div>
            ))}
          </div>

          <div className="mt-7 flex justify-center">
            <Link
              href="/patrocinios"
              className="inline-flex h-11 items-center rounded-full bg-mulberry px-6 text-sm font-semibold text-white transition hover:bg-[#470760]"
            >
              Quiero patrocinar eventos
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
}

