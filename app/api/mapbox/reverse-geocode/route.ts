import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get('lat'));
  const lng = Number(searchParams.get('lng'));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: 'Latitud/longitud inválidas.' }, { status: 400 });
  }

  const token = process.env.MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: 'Falta MAPBOX_ACCESS_TOKEN o NEXT_PUBLIC_MAPBOX_TOKEN en entorno.' },
      { status: 500 }
    );
  }

  const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&language=es&limit=1`;

  const response = await fetch(endpoint, { cache: 'no-store' });
  const body = await response.json();

  if (!response.ok) {
    return NextResponse.json({ error: body?.message || 'Error de reverse geocoding.' }, { status: 502 });
  }

  const feature = body?.features?.[0];

  return NextResponse.json(
    {
      data: {
        placeName: feature?.place_name ?? '',
        center: feature?.center ?? [lng, lat],
        context: feature?.context ?? [],
      },
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
