export default function NotFound() {
  return (
    <section className="min-h-[60vh] flex items-center justify-center text-center px-6">
      <div>
        <h1 className="text-3xl font-bold">Página no encontrada</h1>
        <p className="mt-2 text-gray-600">La ruta que buscaste no existe.</p>
        <a href="/" className="mt-6 inline-block text-white bg-primary px-4 py-2 rounded-md">Volver al inicio</a>
      </div>
    </section>
  )
}
