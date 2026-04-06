import type { Metadata } from 'next';
import Link from 'next/link';
import OrganizerSupportFallback from '@modules/home/ui/OrganizerSupportFallback';

export const metadata: Metadata = {
  title: 'Activa tu perfil organizadora | Peloteras',
  description: 'Activa tu perfil, crea tu primer borrador y publica con Peloteras.',
};

const bullets = [
  'Operación más ordenada para tus eventos',
  'Flujo claro de pagos y confirmaciones',
  'Soporte para profesionalizar tu comunidad',
];

export default function OrganizaConPeloterasPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mulberry/75">Peloteras para admins</p>
        <h1 className="mt-2 font-eastman-extrabold text-4xl leading-tight text-slate-900 sm:text-5xl">
          Postula para organizar con Peloteras
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-600 sm:text-base">
          Activa tu perfil, crea tu primer borrador y publica cuando tengas cancha y cobro listos. Si
          prefieres acompañamiento humano, también podemos ayudarte.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/create-event"
            className="inline-flex h-11 items-center rounded-full bg-mulberry px-6 text-sm font-semibold text-white transition hover:bg-[#470760]"
          >
            Activar perfil y crear evento
          </Link>
          <Link
            href="/events"
            className="inline-flex h-11 items-center rounded-full border border-slate-300 px-6 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Ver eventos
          </Link>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {bullets.map((item) => (
            <div key={item} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {item}
            </div>
          ))}
        </div>

        <OrganizerSupportFallback />
      </section>
    </main>
  );
}
