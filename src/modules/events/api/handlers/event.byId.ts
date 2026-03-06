import { NextResponse } from 'next/server';
import { getEventExplorerById } from '@modules/events/api/queries/getEventsExplorer';
import { rateLimitByRequest } from '@core/api/rateLimit';

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutError: Error) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => {
        if (timer) clearTimeout(timer);
        reject(timeoutError);
      }, timeoutMs);
    }),
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

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
    const event = await withTimeout(
      getEventExplorerById(id),
      4000,
      new Error('Event detail query timeout')
    );

    if (!event) {
      return NextResponse.json({ error: 'Evento no encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ data: event }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    if (error instanceof Error && error.message === 'Event detail query timeout') {
      return NextResponse.json(
        { error: 'La consulta del evento tardó demasiado. Intenta nuevamente.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: error.message || 'No se pudo obtener el evento.' }, { status: 500 });
  }
}
