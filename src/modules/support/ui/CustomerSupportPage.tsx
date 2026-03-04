import Link from 'next/link';

const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'soporte@peloteras.com';
const supportPhone = process.env.NEXT_PUBLIC_SUPPORT_PHONE || '+51 900 000 000';
const supportWhatsapp =
  process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_URL || 'https://wa.me/51900000000';
const supportHours = process.env.NEXT_PUBLIC_SUPPORT_HOURS || 'Lunes a viernes, 9:00 a 18:00 (PET)';

export default function CustomerSupportPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-mulberry">Peloteras Support</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Atención al cliente</h1>
        <p className="mt-3 text-slate-600">
          Si tienes problemas con tu entrada, pagos o validación de QR, nuestro equipo puede ayudarte.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <article className="rounded-xl border border-slate-200 p-4">
            <h2 className="text-sm font-semibold text-slate-900">Correo de soporte</h2>
            <a className="mt-2 block text-mulberry hover:underline" href={`mailto:${supportEmail}`}>
              {supportEmail}
            </a>
          </article>

          <article className="rounded-xl border border-slate-200 p-4">
            <h2 className="text-sm font-semibold text-slate-900">Teléfono</h2>
            <a className="mt-2 block text-mulberry hover:underline" href={`tel:${supportPhone.replace(/\s+/g, '')}`}>
              {supportPhone}
            </a>
          </article>

          <article className="rounded-xl border border-slate-200 p-4">
            <h2 className="text-sm font-semibold text-slate-900">WhatsApp</h2>
            <a className="mt-2 block text-mulberry hover:underline" href={supportWhatsapp} target="_blank" rel="noreferrer">
              Contactar por WhatsApp
            </a>
          </article>

          <article className="rounded-xl border border-slate-200 p-4">
            <h2 className="text-sm font-semibold text-slate-900">Horario</h2>
            <p className="mt-2 text-slate-700">{supportHours}</p>
          </article>
        </div>

        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-700">
          <p>
            Para acelerar la atención, comparte: correo de tu cuenta, ID del evento y captura del error.
          </p>
        </div>

        <div className="mt-6">
          <Link href="/" className="inline-flex rounded-lg bg-mulberry px-4 py-2 text-sm font-semibold text-white">
            Volver al inicio
          </Link>
        </div>
      </section>
    </main>
  );
}
