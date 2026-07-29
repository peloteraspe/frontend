-- TEAM-211 / TEAM-212 / TEAM-213: protected general team invitation link.

-- The public team policy is row-level, not column-level. Restrict the general
-- invitation token so it can only be read through captain-validated RPCs.
REVOKE SELECT ON public.team FROM anon, authenticated;
GRANT SELECT (
  id,
  created_at,
  updated_at,
  name,
  slug,
  avatar_url,
  instagram_username,
  tiktok_username,
  is_active,
  deleted_at
) ON public.team TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_team_general_invitation_token(
  p_team_id BIGINT
)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_token UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF NOT public.is_active_team_captain(p_team_id, v_user_id) THEN
    RAISE EXCEPTION 'Team not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT team.invitation_token
  INTO v_token
  FROM public.team team
  WHERE team.id = p_team_id
    AND team.is_active = true
    AND team.deleted_at IS NULL;

  IF v_token IS NULL THEN
    RAISE EXCEPTION 'Team not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.regenerate_team_general_invitation_token(
  p_team_id BIGINT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_token UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF NOT public.is_active_team_captain(p_team_id, v_user_id) THEN
    RAISE EXCEPTION 'Team not found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.team team
  SET invitation_token = extensions.gen_random_uuid()
  WHERE team.id = p_team_id
    AND team.is_active = true
    AND team.deleted_at IS NULL
  RETURNING team.invitation_token INTO v_token;

  IF v_token IS NULL THEN
    RAISE EXCEPTION 'Team not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_team_invitation_link_preview(
  p_token UUID
)
RETURNS TABLE (
  team_id BIGINT,
  team_name TEXT,
  team_slug TEXT,
  team_avatar_url TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    team.id,
    team.name,
    team.slug,
    team.avatar_url
  FROM public.team team
  WHERE team.invitation_token = p_token
    AND team.is_active = true
    AND team.deleted_at IS NULL
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.resolve_team_link_invitation(
  p_token UUID
)
RETURNS SETOF public.team_invitation
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_team public.team%ROWTYPE;
  v_captain_id UUID;
  v_email TEXT;
  v_username TEXT;
  v_invitation public.team_invitation%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  SELECT team.*
  INTO v_team
  FROM public.team team
  WHERE team.invitation_token = p_token
    AND team.is_active = true
    AND team.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation link not found' USING ERRCODE = 'P0002';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.team_member member
    WHERE member.team_id = v_team.id
      AND member.user_id = v_user_id
      AND member.status = 'active'
  ) THEN
    RAISE EXCEPTION 'User is already an active team member'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT invitation.*
  INTO v_invitation
  FROM public.team_invitation invitation
  WHERE invitation.team_id = v_team.id
    AND invitation.invitee_user_id = v_user_id
    AND invitation.source = 'team_link'
    AND invitation.metadata ->> 'team_link_token' = p_token::TEXT
  ORDER BY invitation.created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    IF v_invitation.status = 'pending' AND v_invitation.expires_at <= now() THEN
      UPDATE public.team_invitation invitation
      SET status = 'expired'
      WHERE invitation.id = v_invitation.id
      RETURNING invitation.* INTO v_invitation;
    END IF;

    RETURN QUERY SELECT v_invitation.*;
    RETURN;
  END IF;

  SELECT member.user_id
  INTO v_captain_id
  FROM public.team_member member
  WHERE member.team_id = v_team.id
    AND member.role = 'captain'
    AND member.status = 'active'
  LIMIT 1;

  SELECT
    lower(NULLIF(btrim(auth_user.email), '')),
    lower(NULLIF(btrim(profile.username), ''))
  INTO v_email, v_username
  FROM auth.users auth_user
  JOIN public.profile profile
    ON profile.user = auth_user.id
  WHERE auth_user.id = v_user_id
  ORDER BY profile.id DESC
  LIMIT 1;

  IF v_captain_id IS NULL OR v_username IS NULL THEN
    RAISE EXCEPTION 'Player profile is required' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.team_invitation (
    team_id,
    invited_by_user_id,
    invitee_user_id,
    invitee_email,
    invitee_username,
    delivery_method,
    source,
    expires_at,
    email_delivery_status,
    metadata
  )
  VALUES (
    v_team.id,
    v_captain_id,
    v_user_id,
    v_email,
    v_username,
    'link',
    'team_link',
    now() + interval '14 days',
    'not_applicable',
    jsonb_build_object('team_link_token', p_token::TEXT)
  )
  RETURNING * INTO v_invitation;

  RETURN QUERY SELECT v_invitation.*;
END;
$$;

REVOKE ALL ON FUNCTION public.get_team_general_invitation_token(BIGINT)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.regenerate_team_general_invitation_token(BIGINT)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_team_invitation_link_preview(UUID)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_team_link_invitation(UUID)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_team_general_invitation_token(BIGINT)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.regenerate_team_general_invitation_token(BIGINT)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_invitation_link_preview(UUID)
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_team_link_invitation(UUID)
  TO authenticated;

COMMENT ON FUNCTION public.get_team_invitation_link_preview(UUID) IS
  'Returns only public team fields for a currently valid general invitation token.';

COMMENT ON FUNCTION public.resolve_team_link_invitation(UUID) IS
  'Idempotently resolves the authenticated viewer invitation for a valid general team link.';
