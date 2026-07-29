-- Conserva los SQLSTATE públicos del RPC de creación después de añadir max_members.

CREATE OR REPLACE FUNCTION public.create_team_with_captain(
  p_name TEXT,
  p_avatar_url TEXT DEFAULT NULL,
  p_instagram_username TEXT DEFAULT NULL,
  p_tiktok_username TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL,
  p_max_members INTEGER DEFAULT 20
)
RETURNS SETOF public.team
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_name TEXT := btrim(COALESCE(p_name, ''));
  v_idempotency_key TEXT := NULLIF(btrim(COALESCE(p_idempotency_key, '')), '');
  v_request_id BIGINT;
  v_existing_team_id BIGINT;
  v_team public.team%ROWTYPE;
  v_attempt INTEGER := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '28000';
  END IF;
  IF char_length(v_name) NOT BETWEEN 2 AND 80 THEN
    RAISE EXCEPTION 'TEAM_NAME_INVALID' USING ERRCODE = '23514';
  END IF;
  IF p_max_members IS NULL OR p_max_members NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'TEAM_MEMBER_LIMIT_INVALID' USING ERRCODE = '23514';
  END IF;
  IF v_idempotency_key IS NOT NULL
     AND v_idempotency_key !~ '^[A-Za-z0-9._:-]{8,128}$' THEN
    RAISE EXCEPTION 'IDEMPOTENCY_KEY_INVALID' USING ERRCODE = '23514';
  END IF;

  IF v_idempotency_key IS NOT NULL THEN
    INSERT INTO public.team_creation_request(user_id, idempotency_key)
    VALUES (v_user_id, v_idempotency_key)
    ON CONFLICT (user_id, idempotency_key) DO NOTHING
    RETURNING id INTO v_request_id;

    IF v_request_id IS NULL THEN
      SELECT request.id, request.team_id
      INTO v_request_id, v_existing_team_id
      FROM public.team_creation_request request
      WHERE request.user_id = v_user_id
        AND request.idempotency_key = v_idempotency_key
      FOR UPDATE;

      IF v_existing_team_id IS NOT NULL THEN
        RETURN QUERY SELECT * FROM public.team WHERE id = v_existing_team_id;
        RETURN;
      END IF;
    END IF;
  END IF;

  LOOP
    BEGIN
      INSERT INTO public.team(
        name, slug, avatar_url, instagram_username, tiktok_username,
        created_by_user_id, max_members
      ) VALUES (
        v_name,
        public.generate_unique_team_slug(v_name),
        NULLIF(btrim(COALESCE(p_avatar_url, '')), ''),
        NULLIF(btrim(COALESCE(p_instagram_username, '')), ''),
        NULLIF(btrim(COALESCE(p_tiktok_username, '')), ''),
        v_user_id,
        p_max_members
      ) RETURNING * INTO v_team;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      v_attempt := v_attempt + 1;
      IF v_attempt >= 5 THEN RAISE; END IF;
    END;
  END LOOP;

  INSERT INTO public.team_member(team_id, user_id, role, status, joined_at)
  VALUES (v_team.id, v_user_id, 'captain', 'active', now());

  IF v_request_id IS NOT NULL THEN
    UPDATE public.team_creation_request SET team_id = v_team.id WHERE id = v_request_id;
  END IF;

  RETURN QUERY SELECT * FROM public.team WHERE id = v_team.id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_team_with_captain(TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_team_with_captain(TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER)
  TO authenticated;
