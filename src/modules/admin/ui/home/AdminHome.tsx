import Link from 'next/link';

export default function AdminHome() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Link href="/admin/events" className="block rounded-lg bg-white shadow p-4 hover:shadow-md">
        <h2 className="text-lg font-semibold text-mulberry">Eventos</h2>
        <p className="text-sm text-gray-600">Crear, editar y administrar eventos.</p>
      </Link>

      <Link href="/admin/users" className="block rounded-lg bg-white shadow p-4 hover:shadow-md">
        <h2 className="text-lg font-semibold text-mulberry">Usuarios</h2>
        <p className="text-sm text-gray-600">Ver perfiles y asignar roles.</p>
      </Link>

      <Link href="/admin/payments" className="block rounded-lg bg-white shadow p-4 hover:shadow-md">
        <h2 className="text-lg font-semibold text-mulberry">Pagos</h2>
        <p className="text-sm text-gray-600">Aprobar o rechazar pagos pendientes.</p>
      </Link>
    </div>
  );
}
