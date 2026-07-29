export default function InvitationsLoading() {
  return (
    <main className="site-shell w-full py-7 sm:py-10" aria-busy="true" aria-label="Cargando convocatorias">
      <div className="h-44 animate-pulse rounded-3xl bg-mulberry/15" />
      <div className="mt-7 grid gap-4 lg:grid-cols-2">
        <div className="h-64 animate-pulse rounded-3xl bg-slate-100" />
        <div className="h-64 animate-pulse rounded-3xl bg-slate-100" />
      </div>
    </main>
  );
}
