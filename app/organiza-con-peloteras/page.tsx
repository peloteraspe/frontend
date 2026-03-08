import type { Metadata } from 'next';
import PartnerLeadCaptureForm from '@modules/home/ui/PartnerLeadCaptureForm';

export const metadata: Metadata = {
  title: 'Postula como Admin | Peloteras',
  description: 'Deja tus datos para organizar eventos con Peloteras y escalar tu comunidad deportiva.',
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
          Queremos ayudarte a escalar tus pichangas con una operación más profesional, más confiable y
          centrada en comunidad.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {bullets.map((item) => (
            <div key={item} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {item}
            </div>
          ))}
        </div>

        <PartnerLeadCaptureForm kind="admin" />
      </section>
    </main>
  );
}
