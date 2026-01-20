import { NextResponse } from 'next/server';
import { getBearer } from '@core/auth/bearer';
import { getUserIdFromToken } from '@core/auth/supabase-user';
import { backendFetch, backendUrl } from '@core/api/backend';
import { HTTP_401, HTTP_403, jsonNoStore } from '@core/api/responses';

export async function GET(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId: routeUserId } = await params;

    const token = getBearer(request);
    if (!token) return HTTP_401;

    const authUserId = await getUserIdFromToken(token);
    if (!authUserId) return HTTP_401;
    if (authUserId !== routeUserId) return HTTP_403;

    const res = await backendFetch(backendUrl(`/profile/${routeUserId}`));
    if (!res.ok) {
      if (res.status === 404)
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
      const txt = await res.text().catch(() => '');
      throw new Error(`Backend error ${res.status}: ${txt || res.statusText}`);
    }

    return jsonNoStore(await res.json());
  } catch (err) {
    console.error('GET /api/profile/[userId] failed:', err);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId: routeUserId } = await params;

    const token = getBearer(request);
    if (!token) return HTTP_401;

    const authUserId = await getUserIdFromToken(token);
    if (!authUserId) return HTTP_401;
    if (authUserId !== routeUserId) return HTTP_403;

    const body = await request.json();

    const res = await backendFetch(backendUrl(`/profile/${routeUserId}`), {
      method: 'PATCH',
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      console.error('Backend update error:', res.status, txt);
      return NextResponse.json(
        { error: 'Failed to update profile in backend' },
        { status: res.status }
      );
    }

    return NextResponse.json(await res.json());
  } catch (err) {
    console.error('PATCH /api/profile/[userId] failed:', err);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
