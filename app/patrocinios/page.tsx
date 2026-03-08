import type { Metadata } from 'next';
import PartnerLeadCaptureForm from '@modules/home/ui/PartnerLeadCaptureForm';

export const metadata: Metadata = {
  title: 'Patrocinios | Peloteras',
  description: 'Conecta tu marca con comunidad real y apoya el deporte femenino en eventos de Peloteras.',
};

const bullets = [
  'Audiencia femenina recurrente y activa',
  'Activaciones con propósito local',
  'Alineación directa con deporte femenino',
];

export default function PatrociniosPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-mulberry/20 bg-[#f8f2fb] p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mulberry/75">Patrocinios Peloteras</p>
        <h1 className="mt-2 font-eastman-extrabold text-4xl leading-tight text-slate-900 sm:text-5xl">
          ¿Quieres apoyar al deporte femenino?
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-600 sm:text-base">
          Diseñamos alianzas para que tu marca participe en comunidad real, con presencia en cancha y
          conexión directa con mujeres deportistas.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {bullets.map((item) => (
            <div key={item} className="rounded-xl border border-mulberry/20 bg-white px-4 py-3 text-sm text-slate-700">
              {item}
            </div>
          ))}
        </div>

        <PartnerLeadCaptureForm kind="sponsor" />
      </section>
    </main>
  );
}
