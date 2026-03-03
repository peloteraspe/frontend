import { NextResponse } from 'next/server';

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

  const response = await fetch(endpoint, { cache: 'no-store' });
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
}
