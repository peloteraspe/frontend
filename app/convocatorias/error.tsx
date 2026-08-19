'use client';

export default function InvitationsError({ reset }: { reset: () => void }) {
  return (
    <main className="site-shell grid min-h-[60vh] w-full place-items-center py-10">
      <section className="w-full max-w-lg rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-950">No pudimos cargar tus convocatorias</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Tu información sigue segura. Intenta cargarla nuevamente.</p>
        <button type="button" onClick={reset} className="mt-6 h-11 rounded-xl bg-mulberry px-5 text-sm font-semibold text-white">Reintentar</button>
      </section>
    </main>
  );
}
