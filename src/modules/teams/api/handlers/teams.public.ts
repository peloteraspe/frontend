import { NextResponse } from 'next/server';
import { jsonNoStore } from '@core/api/responses';
import { getPublicTeamProfileBySlug } from '@modules/teams/api/services/teams.service';

type RouteContext = {
  params: Promise<{ teamRef: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { teamRef } = await context.params;
    const profile = await getPublicTeamProfileBySlug(teamRef);

    if (!profile) {
      return NextResponse.json({ error: 'Equipo no encontrado.' }, { status: 404 });
    }

    return jsonNoStore({ profile });
  } catch (err) {
    console.error('GET /api/teams/[teamRef] failed:', err);
    return NextResponse.json({ error: 'No se pudo cargar el equipo.' }, { status: 500 });
  }
}
