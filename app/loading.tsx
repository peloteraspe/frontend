export default function RouteLoading() {
  return (
    <>
      <div
        className="fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-mulberry/10"
        role="status"
        aria-live="polite"
        aria-label="Cargando página"
      >
        <span
          className="navigation-progress-indicator block h-full rounded-r-full bg-mulberry"
          aria-hidden="true"
        />
      </div>

      <section className="site-shell w-full py-7 sm:py-10" aria-busy="true">
        <span className="sr-only">Cargando página…</span>
        <div className="animate-pulse">
          <div className="h-7 w-36 rounded-full bg-mulberry/10" />
          <div className="mt-4 h-11 max-w-xl rounded-2xl bg-slate-100" />
          <div className="mt-3 h-5 max-w-md rounded-full bg-slate-100" />

          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="h-52 rounded-2xl border border-slate-100 bg-slate-50" />
            <div className="h-52 rounded-2xl border border-slate-100 bg-slate-50" />
            <div className="hidden h-52 rounded-2xl border border-slate-100 bg-slate-50 lg:block" />
          </div>
        </div>
      </section>
    </>
  );
}
