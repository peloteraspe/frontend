import { NextResponse } from 'next/server';

export const HTTP_401 = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
export const HTTP_403 = NextResponse.json({ error: 'Forbidden' }, { status: 403 });

export function jsonNoStore(data: any, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}
