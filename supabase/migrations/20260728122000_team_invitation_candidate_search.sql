-- TEAM-202: privacy-preserving invitation candidate search.

CREATE OR REPLACE FUNCTION public.search_team_invitation_candidates(
  p_team_id BIGINT,
  p_query TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  team_status TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_viewer_id UUID := auth.uid();
  v_query TEXT := lower(btrim(COALESCE(p_query, '')));
  v_username_query TEXT;
  v_is_email BOOLEAN;
  v_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 10), 1), 10);
BEGIN
  IF v_viewer_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF NOT public.is_active_team_captain(p_team_id, v_viewer_id) THEN
    RAISE EXCEPTION 'Only an active team captain can search invitation candidates'
      USING ERRCODE = '42501';
  END IF;

  v_is_email := v_query ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$';
  v_username_query := regexp_replace(v_query, '^@+', '');

  IF (v_is_email AND char_length(v_query) < 5)
    OR (NOT v_is_email AND char_length(v_username_query) < 2) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT
      profile.user AS candidate_user_id,
      profile.username AS candidate_username,
      auth_user.raw_user_meta_data AS candidate_metadata
    FROM public.profile profile
    JOIN auth.users auth_user
      ON auth_user.id = profile.user
    WHERE profile.user IS NOT NULL
      AND NULLIF(btrim(profile.username), '') IS NOT NULL
      AND (
        (v_is_email AND lower(btrim(auth_user.email)) = v_query)
        OR (
          NOT v_is_email
          AND position(v_username_query IN lower(btrim(profile.username))) > 0
        )
      )
    ORDER BY
      CASE
        WHEN lower(btrim(profile.username)) = v_username_query THEN 0
        ELSE 1
      END,
      lower(btrim(profile.username))
    LIMIT v_limit
  )
  SELECT
    candidate.candidate_user_id,
    candidate.candidate_username,
    COALESCE(
      NULLIF(btrim(candidate.candidate_metadata ->> 'full_name'), ''),
      NULLIF(btrim(candidate.candidate_metadata ->> 'name'), '')
    ) AS display_name,
    COALESCE(
      NULLIF(btrim(candidate.candidate_metadata ->> 'avatar_url'), ''),
      NULLIF(btrim(candidate.candidate_metadata ->> 'avatar'), ''),
      NULLIF(btrim(candidate.candidate_metadata ->> 'picture'), '')
    ) AS avatar_url,
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM public.team_member member
        WHERE member.team_id = p_team_id
          AND member.user_id = candidate.candidate_user_id
          AND member.status = 'active'
      ) THEN 'member'
      WHEN EXISTS (
        SELECT 1
        FROM public.team_invitation invitation
        WHERE invitation.team_id = p_team_id
          AND invitation.invitee_user_id = candidate.candidate_user_id
          AND invitation.status = 'pending'
          AND invitation.expires_at > now()
      ) THEN 'pending'
      ELSE 'available'
    END AS team_status
  FROM candidates candidate;
END;
$$;

REVOKE ALL ON FUNCTION public.search_team_invitation_candidates(BIGINT, TEXT, INTEGER)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_team_invitation_candidates(BIGINT, TEXT, INTEGER)
  TO authenticated;

COMMENT ON FUNCTION public.search_team_invitation_candidates(BIGINT, TEXT, INTEGER) IS
  'Returns at most ten public candidate fields after validating the authenticated active team captain; email matching is exact.';
