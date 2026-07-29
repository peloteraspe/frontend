import { NextResponse } from 'next/server';
import { getServerSupabase } from '@core/api/supabase.server';
import { getAdminSupabase } from '@core/api/supabase.admin';
import {
  removeUploadedTeamAvatar,
  uploadTeamAvatar,
} from './teams.create';

type RouteContext = { params: Promise<{ teamRef: string }> };

function numericId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function managementError(error: unknown) {
  const raw = error instanceof Error ? error.message : String((error as any)?.message || '');
  const messages: Record<string, string> = {
    AUTH_REQUIRED: 'Debes iniciar sesión.',
    CAPTAIN_REQUIRED: 'Solo la capitana puede realizar esta acción.',
    TEAM_NOT_FOUND: 'El equipo no está disponible.',
    TEAM_NAME_INVALID: 'El nombre debe tener entre 2 y 80 caracteres.',
    TEAM_MEMBER_LIMIT_INVALID: 'El límite debe estar entre 1 y 100 integrantes.',
    TEAM_MEMBER_LIMIT_BELOW_ACTIVE: 'El límite no puede ser menor que el plantel activo.',
    TEAM_MEMBER_LIMIT_REACHED: 'El equipo alcanzó su límite de integrantes.',
    ACTIVE_MEMBER_NOT_FOUND: 'La integrante ya no está activa en el equipo.',
    CANNOT_REMOVE_CAPTAIN: 'La capitana no puede ser retirada del equipo.',
    CAPTAIN_CANNOT_LEAVE: 'Transfiere la capitanía antes de salir del equipo.',
    FEATURED_TEAM_MEMBERSHIP_REQUIRED: 'Solo puedes destacar un equipo que integras actualmente.',
    PROFILE_NOT_FOUND: 'Completa tu perfil antes de destacar un equipo.',
    TEAM_HAS_ACTIVE_EVENT_REGISTRATIONS:
      'No puedes eliminar el equipo mientras tenga inscripciones pendientes o eventos futuros aprobados.',
  };
  const key = Object.keys(messages).find((candidate) => raw.includes(candidate));
  return key ? messages[key] : raw || 'No se pudo actualizar el equipo.';
}

export async function POST(request: Request, context: RouteContext) {
  let uploadedAvatarPath: string | null = null;
  try {
    const { teamRef } = await context.params;
    const teamId = numericId(teamRef);
    if (!teamId) return NextResponse.json({ error: 'Equipo inválido.' }, { status: 400 });

    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 });

    const isMultipart = (request.headers.get('content-type') || '').includes('multipart/form-data');
    const formData = isMultipart ? await request.formData() : null;
    const body: any = formData
      ? Object.fromEntries(Array.from(formData.entries()).filter(([, value]) => typeof value === 'string'))
      : await request.json().catch(() => ({}));
    const action = String(body?.action || '').trim();
    let result: { data: unknown; error: { message?: string } | null };

    if (action === 'update') {
      let avatarUrl = String(body?.avatarUrl || '').trim() || null;
      const avatar = formData?.get('avatar');
      if (avatar instanceof File && avatar.size > 0) {
        const upload = await uploadTeamAvatar(avatar, user.id);
        if (upload.error) return NextResponse.json({ error: upload.error }, { status: 400 });
        avatarUrl = upload.publicUrl;
        uploadedAvatarPath = upload.path;
      } else if (formData) {
        const { data: currentTeam, error: currentTeamError } = await getAdminSupabase()
          .from('team')
          .select('avatar_url')
          .eq('id', teamId)
          .maybeSingle();
        if (currentTeamError) throw new Error(currentTeamError.message);
        avatarUrl = currentTeam?.avatar_url ?? null;
      }
      result = await supabase.rpc('update_team_as_captain', {
        p_team_id: teamId,
        p_name: String(body?.name || '').trim(),
        p_avatar_url: avatarUrl,
        p_instagram_username: String(body?.instagramUsername || '').trim() || null,
        p_tiktok_username: String(body?.tiktokUsername || '').trim() || null,
        p_max_members: numericId(body?.maxMembers),
      });
    } else if (action === 'remove-member') {
      const memberId = numericId(body?.memberId);
      if (!memberId) return NextResponse.json({ error: 'Integrante inválida.' }, { status: 400 });
      result = await supabase.rpc('remove_team_member', {
        p_team_id: teamId,
        p_member_id: memberId,
      });
    } else if (action === 'transfer-captain') {
      const memberId = numericId(body?.memberId);
      if (!memberId) return NextResponse.json({ error: 'Integrante inválida.' }, { status: 400 });
      result = await supabase.rpc('transfer_team_captain', {
        p_team_id: teamId,
        p_new_captain_member_id: memberId,
      });
    } else if (action === 'leave') {
      result = await supabase.rpc('leave_team', { p_team_id: teamId });
    } else if (action === 'delete') {
      result = await supabase.rpc('delete_team_as_captain', { p_team_id: teamId });
    } else if (action === 'feature' || action === 'clear-feature') {
      result = await supabase.rpc('set_featured_team', {
        p_team_id: action === 'feature' ? teamId : null,
      });
    } else {
      return NextResponse.json({ error: 'Acción inválida.' }, { status: 400 });
    }

    if (result.error) throw new Error(result.error.message || 'TEAM_MANAGEMENT_FAILED');
    return NextResponse.json({ data: result.data });
  } catch (error) {
    await removeUploadedTeamAvatar(uploadedAvatarPath);
    return NextResponse.json({ error: managementError(error) }, { status: 400 });
  }
}
