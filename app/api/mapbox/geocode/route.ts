import { NextResponse } from 'next/server';
import { fetchWithTimeout, isAbortError } from '@core/api/backend';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();

  if (!q || q.length < 3) {
    return NextResponse.json({ data: [] });
  }

  const token = process.env.MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: 'Falta MAPBOX_ACCESS_TOKEN o NEXT_PUBLIC_MAPBOX_TOKEN en entorno.' },
      { status: 500 }
    );
  }

  const endpoint =
    'https://api.mapbox.com/geocoding/v5/mapbox.places/' +
    encodeURIComponent(q) +
    `.json?access_token=${token}&autocomplete=true&types=address,place,poi&language=es&limit=5&country=PE`;

  try {
    const response = await fetchWithTimeout(endpoint, { cache: 'no-store' }, 4000);
    const body = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: body?.message || 'Error de geocodificación.' }, { status: 502 });
    }

    const data = (body?.features || []).map((feature: any) => ({
      id: feature.id,
      placeName: feature.place_name,
      center: feature.center,
    }));

    return NextResponse.json({ data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (isAbortError(error)) {
      return NextResponse.json(
        { data: [], timeout: true },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }
    return NextResponse.json({ error: 'No se pudo consultar geocodificación.' }, { status: 502 });
  }
}
