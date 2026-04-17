import { NextResponse, type NextRequest } from 'next/server';
import { log } from '@core/lib/logger';
import {
  buildCheckinPublicUrl,
  buildCheckinQrSourceUrl,
  normalizeCheckinQrSize,
  sanitizeCheckinSlug,
} from '@modules/checkins/lib/checkins';

function buildFilename(slug: string, size: number) {
  return `checkin-${slug}-qr-${size}x${size}.png`;
}

export async function GET(request: NextRequest) {
  const slug = sanitizeCheckinSlug(request.nextUrl.searchParams.get('slug') || '');
  const size = normalizeCheckinQrSize(Number(request.nextUrl.searchParams.get('size') || 0));
  const shouldDownload = request.nextUrl.searchParams.get('download') === '1';

  if (!slug) {
    return NextResponse.json({ error: 'Debes indicar un slug válido.' }, { status: 400 });
  }

  const qrSourceUrl = buildCheckinQrSourceUrl(slug, {
    size,
    fallbackOrigin: request.nextUrl.origin,
  });
  const publicUrl = buildCheckinPublicUrl(slug, request.nextUrl.origin);

  try {
    const upstreamResponse = await fetch(qrSourceUrl, {
      next: { revalidate: 60 * 60 * 24 },
    });

    if (!upstreamResponse.ok) {
      log.error('Fetch check-in QR image failed', 'CHECKINS', {
        slug,
        size,
        publicUrl,
        status: upstreamResponse.status,
      });
      return NextResponse.json({ error: 'No se pudo generar el QR.' }, { status: 502 });
    }

    const imageBuffer = await upstreamResponse.arrayBuffer();
    const headers = new Headers();
    headers.set('Content-Type', upstreamResponse.headers.get('content-type') || 'image/png');
    headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');

    if (shouldDownload) {
      headers.set('Content-Disposition', `attachment; filename="${buildFilename(slug, size)}"`);
    }

    return new NextResponse(imageBuffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    log.error('Generate check-in QR failed', 'CHECKINS', error, {
      slug,
      size,
      publicUrl,
    });
    return NextResponse.json({ error: 'No se pudo generar el QR.' }, { status: 500 });
  }
}
