-- TEAM-104: Transactional team creation with automatic captain membership.
-- The team row and the creator's captain membership are created in one
-- database function call, so either both persist or neither does.

CREATE OR REPLACE FUNCTION public.create_team_with_captain(
  p_name TEXT,
  p_avatar_url TEXT DEFAULT NULL,
  p_instagram_username TEXT DEFAULT NULL,
  p_tiktok_username TEXT DEFAULT NULL
)
RETURNS SETOF public.team
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_name TEXT := btrim(COALESCE(p_name, ''));
  v_base_slug TEXT;
  v_candidate_slug TEXT;
  v_suffix INTEGER := 0;
  v_team public.team%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF char_length(v_name) < 2 OR char_length(v_name) > 80 THEN
    RAISE EXCEPTION 'Team name must be between 2 and 80 characters' USING ERRCODE = '23514';
  END IF;

  v_base_slug := public.normalize_team_slug(v_name);

  LOOP
    v_candidate_slug := CASE
      WHEN v_suffix = 0 THEN v_base_slug
      ELSE v_base_slug || '-' || (v_suffix + 1)::TEXT
    END;

    IF v_candidate_slug NOT IN (
      'admin',
      'api',
      'auth',
      'check-in',
      'contactanos',
      'convocatorias',
      'create-event',
      'events',
      'login',
      'payments',
      'profile',
      'registro-jugadoras',
      'signup',
      'support',
      'tickets'
    ) AND NOT EXISTS (
      SELECT 1
      FROM public.team existing_team
      WHERE existing_team.slug = v_candidate_slug
    ) THEN
      EXIT;
    END IF;

    v_suffix := v_suffix + 1;
    IF v_suffix >= 50 THEN
      v_candidate_slug := v_base_slug || '-' || floor(extract(epoch FROM clock_timestamp()))::TEXT;
      EXIT;
    END IF;
  END LOOP;

  INSERT INTO public.team (
    name,
    slug,
    avatar_url,
    instagram_username,
    tiktok_username,
    created_by_user_id
  )
  VALUES (
    v_name,
    v_candidate_slug,
    NULLIF(btrim(p_avatar_url), ''),
    NULLIF(btrim(p_instagram_username), ''),
    NULLIF(btrim(p_tiktok_username), ''),
    v_user_id
  )
  RETURNING * INTO v_team;

  INSERT INTO public.team_member (
    team_id,
    user_id,
    role,
    status,
    joined_at
  )
  VALUES (
    v_team.id,
    v_user_id,
    'captain',
    'active',
    now()
  );

  RETURN QUERY
  SELECT *
  FROM public.team created_team
  WHERE created_team.id = v_team.id;
END;
$$;

COMMENT ON FUNCTION public.create_team_with_captain(TEXT, TEXT, TEXT, TEXT) IS
  'Atomically creates a team and an active captain membership for auth.uid().';

REVOKE ALL ON FUNCTION public.create_team_with_captain(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_team_with_captain(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Deprecated by TEAM-104. Team membership beyond the creator must go through
-- the invitation flow in later stories, not direct creation-time inserts.
REVOKE ALL ON FUNCTION public.create_team_with_members(TEXT, TEXT, UUID[]) FROM PUBLIC, anon, authenticated;
