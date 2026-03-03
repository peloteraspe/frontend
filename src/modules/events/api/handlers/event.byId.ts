import { NextResponse } from 'next/server';
import { getEventExplorerById } from '@modules/events/api/queries/getEventsExplorer';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const event = await getEventExplorerById(id);

    if (!event) {
      return NextResponse.json({ error: 'Evento no encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ data: event }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'No se pudo obtener el evento.' }, { status: 500 });
  }
}
