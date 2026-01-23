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
            <th className="px-4 py-2 text-left">Precio</th>
            <th className="px-4 py-2 text-left">Cupos</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {events?.map((e: any) => (
            <tr key={e.id} className="border-t">
              <td className="px-4 py-2">{e.title}</td>
              <td className="px-4 py-2">{e.formattedDateTime || e.date}</td>
              <td className="px-4 py-2">{e.price}</td>
              <td className="px-4 py-2">{e.placesLeft ?? e.capacity}</td>
              <td className="px-4 py-2 text-right">
                <div className="flex gap-3 justify-end">
                  <a href={`/events/${e.id}`} className="text-mulberry hover:underline">
                    Ver
                  </a>
                  <Link
                    href={`/admin/events/${e.id}/edit`}
                    className="text-mulberry hover:underline"
                  >
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
