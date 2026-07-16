-- TEAM-103: RLS policies for team profiles and memberships.
-- Creation is intentionally exposed through a controlled RPC instead of direct
-- inserts from client sessions.

ALTER TABLE public.team ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_member ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.team TO anon, authenticated;
GRANT SELECT ON public.team_member TO authenticated;
GRANT ALL ON public.team TO service_role;
GRANT ALL ON public.team_member TO service_role;

REVOKE INSERT, UPDATE, DELETE ON public.team FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.team_member FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.normalize_team_slug(value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    NULLIF(
      btrim(
        regexp_replace(
          regexp_replace(
            translate(
              lower(btrim(COALESCE(value, ''))),
              'áàäâãåéèëêíìïîóòöôõúùüûñç',
              'aaaaaaeeeeiiiiooooouuuunc'
            ),
            '[^a-z0-9]+',
            '-',
            'g'
          ),
          '-+',
          '-',
          'g'
        ),
        '-'
      ),
      ''
    ),
    'equipo'
  );
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
  v_base_slug TEXT;
  v_candidate_slug TEXT;
  v_suffix INTEGER := 0;
  v_team public.team%ROWTYPE;
  v_member_ids UUID[];
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
    created_by_user_id
  )
  VALUES (
    v_name,
    v_candidate_slug,
    NULLIF(btrim(p_avatar_url), ''),
    v_user_id
  )
  RETURNING * INTO v_team;

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

REVOKE ALL ON FUNCTION public.normalize_team_slug(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_team_with_members(TEXT, TEXT, UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_team_with_members(TEXT, TEXT, UUID[]) TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'team'
      AND policyname = 'team_active_select'
  ) THEN
    CREATE POLICY team_active_select
      ON public.team
      AS PERMISSIVE
      FOR SELECT
      TO anon, authenticated
      USING (is_active = true AND deleted_at IS NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'team'
      AND policyname = 'team_service_role_all'
  ) THEN
    CREATE POLICY team_service_role_all
      ON public.team
      AS PERMISSIVE
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'team_member'
      AND policyname = 'team_member_own_select'
  ) THEN
    CREATE POLICY team_member_own_select
      ON public.team_member
      AS PERMISSIVE
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'team_member'
      AND policyname = 'team_member_active_team_select'
  ) THEN
    CREATE POLICY team_member_active_team_select
      ON public.team_member
      AS PERMISSIVE
      FOR SELECT
      TO authenticated
      USING (
        status = 'active'
        AND EXISTS (
          SELECT 1
          FROM public.team active_team
          WHERE active_team.id = team_member.team_id
            AND active_team.is_active = true
            AND active_team.deleted_at IS NULL
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'team_member'
      AND policyname = 'team_member_service_role_all'
  ) THEN
    CREATE POLICY team_member_service_role_all
      ON public.team_member
      AS PERMISSIVE
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
