import { getEvents } from '@shared/lib/data/getEvents';
import Link from 'next/link';

export default async function AdminEventsPage() {
  const events = await getEvents();
  return (
    <div className="rounded-md bg-white shadow overflow-x-auto">
      <div className="p-4 flex justify-end">
        <Link href="/admin/events/new" className="px-3 py-2 rounded-md bg-mulberry text-white">
          Crear evento
        </Link>
      </div>
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left">Título</th>
            <th className="px-4 py-2 text-left">Fecha</th>
            <th className="px-4 py-2 text-left">Destacado</th>
            <th className="px-4 py-2 text-left">Precio</th>
            <th className="px-4 py-2 text-left">Cupos</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {events?.map((e: any) => (
            <tr key={e.id} className="border-t">
              <td className="px-4 py-2">{e.title}</td>
              <td className="px-4 py-2">{e.start_time ? new Date(e.start_time).toLocaleString('es-PE') : '-'}</td>
              <td className="px-4 py-2">
                {e.is_featured ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                    Sí
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                    No
                  </span>
                )}
              </td>
              <td className="px-4 py-2">{e.price}</td>
              <td className="px-4 py-2">
                {e.min_users} - {e.max_users}
              </td>
              <td className="px-4 py-2 text-right">
                <div className="flex gap-3 justify-end">
                  <a href={`/events/${e.id}`} className="text-mulberry hover:underline">
                    Ver
                  </a>
                  <Link href={`/admin/events/${e.id}/edit`} className="text-mulberry hover:underline">
                    Editar
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
