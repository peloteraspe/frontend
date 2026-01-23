// src/modules/teams/api/handlers/teams.create.ts
import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@core/auth/supabase-user';
import { HTTP_401, jsonNoStore } from '@core/api/responses';
import { isEmailLike, isUuidLike, safeArray, toUrlOrNull } from '@core/lib/primitives';
import type { CreateTeamBody } from '@modules/teams/model/types';
import {
  createTeamRecord,
  insertInvites,
  rollbackTeamCascade,
  upsertTeamMembers,
} from '@modules/teams/api/services/teams.service';

export async function POST(req: Request) {
  try {
    const ownerId = await getCurrentUserId();
    if (!ownerId) return HTTP_401;

    let raw: CreateTeamBody;
    try {
      raw = (await req.json()) as CreateTeamBody;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const name = typeof raw.name === 'string' ? raw.name.trim() : '';
    if (name.length < 2) {
      return NextResponse.json({ error: 'Name is required (min 2 chars)' }, { status: 400 });
    }

    const imageUrl = toUrlOrNull(raw.imageUrl) ?? null;
    const memberIds = Array.from(new Set([ownerId, ...safeArray(raw.memberIds, isUuidLike)]));
    const invites = safeArray(raw.invites, isEmailLike);

    // 2) crear team
    const teamId = await createTeamRecord(name, ownerId, imageUrl);

    // 3) miembros
    try {
      await upsertTeamMembers(teamId, ownerId, memberIds);
    } catch (e: any) {
      await rollbackTeamCascade(teamId);
      return NextResponse.json({ error: e?.message || 'Members insert failed' }, { status: 500 });
    }

    // 4) invitaciones
    try {
      await insertInvites(teamId, ownerId, invites);
    } catch (e: any) {
      await rollbackTeamCascade(teamId);
      return NextResponse.json({ error: e?.message || 'Invites insert failed' }, { status: 500 });
    }

    // 5) ok
    return jsonNoStore({ ok: true, id: teamId }, 201);
  } catch (err) {
    console.error('POST /api/teams failed:', err);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
