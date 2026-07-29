-- TEAM-105: Unique team slug generation and reserved first-level route protection.
-- Team profile URLs live at /:slug, so team slugs must not collide with
-- existing app routes such as /admin, /profile, /events or /api.

CREATE OR REPLACE FUNCTION public.is_reserved_team_slug(value TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT public.normalize_team_slug(value) = ANY (ARRAY[
    'admin',
    'api',
    'auth',
    'check-in',
    'como-inscribir-nuevo-evento',
    'contactanos',
    'convocatorias',
    'create-event',
    'customer-support',
    'events',
    'login',
    'organiza-con-peloteras',
    'payments',
    'patrocinios',
    'profile',
    'register',
    'registro-jugadoras',
    'signup',
    'sobre-peloteras',
    'support',
    'teams',
    'tickets'
  ]);
$$;

CREATE OR REPLACE FUNCTION public.generate_unique_team_slug(value TEXT)
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_base_slug TEXT := public.normalize_team_slug(value);
  v_candidate_slug TEXT;
  v_suffix INTEGER := 0;
BEGIN
  LOOP
    v_candidate_slug := CASE
      WHEN v_suffix = 0 THEN v_base_slug
      ELSE v_base_slug || '-' || (v_suffix + 1)::TEXT
    END;

    IF NOT public.is_reserved_team_slug(v_candidate_slug)
      AND NOT EXISTS (
        SELECT 1
        FROM public.team existing_team
        WHERE existing_team.slug = v_candidate_slug
      )
    THEN
      RETURN v_candidate_slug;
    END IF;

    v_suffix := v_suffix + 1;
    IF v_suffix >= 50 THEN
      v_candidate_slug := v_base_slug || '-' || floor(extract(epoch FROM clock_timestamp()) * 1000)::TEXT;

      IF NOT public.is_reserved_team_slug(v_candidate_slug)
        AND NOT EXISTS (
          SELECT 1
          FROM public.team existing_team
          WHERE existing_team.slug = v_candidate_slug
        )
      THEN
        RETURN v_candidate_slug;
      END IF;
    END IF;
  END LOOP;
END;
$$;

ALTER TABLE public.team
  DROP CONSTRAINT IF EXISTS team_slug_not_reserved;

ALTER TABLE public.team
  ADD CONSTRAINT team_slug_not_reserved
  CHECK (NOT public.is_reserved_team_slug(slug))
  NOT VALID;

ALTER TABLE public.team
  VALIDATE CONSTRAINT team_slug_not_reserved;

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
  v_team public.team%ROWTYPE;
  v_attempt INTEGER := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF char_length(v_name) < 2 OR char_length(v_name) > 80 THEN
    RAISE EXCEPTION 'Team name must be between 2 and 80 characters' USING ERRCODE = '23514';
  END IF;

  LOOP
    BEGIN
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
        public.generate_unique_team_slug(v_name),
        NULLIF(btrim(p_avatar_url), ''),
        NULLIF(btrim(p_instagram_username), ''),
        NULLIF(btrim(p_tiktok_username), ''),
        v_user_id
      )
      RETURNING * INTO v_team;
      EXIT;
    EXCEPTION
      WHEN unique_violation THEN
        v_attempt := v_attempt + 1;
        IF v_attempt >= 5 THEN
          RAISE;
        END IF;
    END;
  END LOOP;

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

CREATE OR REPLACE FUNCTION public.create_team_with_members(
  p_name TEXT,
  p_avatar_url TEXT DEFAULT NULL,
  p_member_ids UUID[] DEFAULT ARRAY[]::UUID[]
)
RETURNS SETOF public.team
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_name TEXT := btrim(COALESCE(p_name, ''));
  v_team public.team%ROWTYPE;
  v_member_ids UUID[];
  v_attempt INTEGER := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF char_length(v_name) < 2 OR char_length(v_name) > 80 THEN
    RAISE EXCEPTION 'Team name must be between 2 and 80 characters' USING ERRCODE = '23514';
  END IF;

  LOOP
    BEGIN
      INSERT INTO public.team (
        name,
        slug,
        avatar_url,
        created_by_user_id
      )
      VALUES (
        v_name,
        public.generate_unique_team_slug(v_name),
        NULLIF(btrim(p_avatar_url), ''),
        v_user_id
      )
      RETURNING * INTO v_team;
      EXIT;
    EXCEPTION
      WHEN unique_violation THEN
        v_attempt := v_attempt + 1;
        IF v_attempt >= 5 THEN
          RAISE;
        END IF;
    END;
  END LOOP;

  SELECT ARRAY(
    SELECT DISTINCT member_id
    FROM unnest(COALESCE(p_member_ids, ARRAY[]::UUID[])) AS member_id
    WHERE member_id IS NOT NULL
  )
  INTO v_member_ids;

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

  INSERT INTO public.team_member (
    team_id,
    user_id,
    role,
    status,
    joined_at
  )
  SELECT
    v_team.id,
    member_id,
    'player',
    'active',
    now()
  FROM unnest(v_member_ids) AS member_id
  WHERE member_id <> v_user_id;

  RETURN QUERY
  SELECT *
  FROM public.team created_team
  WHERE created_team.id = v_team.id;
END;
$$;

COMMENT ON FUNCTION public.is_reserved_team_slug(TEXT) IS
  'Returns true when a normalized team slug collides with a first-level Peloteras route.';

COMMENT ON FUNCTION public.generate_unique_team_slug(TEXT) IS
  'Generates the first available non-reserved team slug from a team name.';

COMMENT ON CONSTRAINT team_slug_not_reserved ON public.team IS
  'Prevents team public URLs from colliding with reserved first-level application routes.';

REVOKE ALL ON FUNCTION public.is_reserved_team_slug(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_unique_team_slug(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_team_with_captain(TEXT, TEXT, TEXT, TEXT) TO authenticated;
