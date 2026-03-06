import { NextResponse } from 'next/server';
import { getEventExplorerById } from '@modules/events/api/queries/getEventsExplorer';
import { rateLimitByRequest } from '@core/api/rateLimit';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitByRequest(request, {
    keyPrefix: 'api_events_by_id_get',
    limit: 240,
    windowMs: 60_000,
    message: 'Demasiadas consultas de detalle de eventos. Inténtalo nuevamente en un minuto.',
  });
  if (limited) return limited;

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
