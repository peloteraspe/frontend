-- Allow captains to invite a player by email before she has a Peloteras account.
-- The invitation is attached to the matching account only after the recipient
-- follows its private token while authenticated with that email address.

CREATE OR REPLACE FUNCTION public.create_team_invitation(
  p_team_id BIGINT,
  p_delivery_method TEXT DEFAULT 'username',
  p_invitee_user_id UUID DEFAULT NULL,
  p_invitee_email TEXT DEFAULT NULL,
  p_invitee_username TEXT DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS SETOF public.team_invitation
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_delivery_method TEXT := lower(btrim(COALESCE(p_delivery_method, 'username')));
  v_invitee_email TEXT := lower(NULLIF(btrim(COALESCE(p_invitee_email, '')), ''));
  v_invitee_username TEXT := lower(NULLIF(btrim(COALESCE(p_invitee_username, '')), ''));
  v_invitee_user_id UUID := p_invitee_user_id;
  v_source TEXT;
  v_invitation public.team_invitation%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF NOT public.is_active_team_captain(p_team_id, v_user_id) THEN
    RAISE EXCEPTION 'Only an active team captain can create invitations'
      USING ERRCODE = '42501';
  END IF;

  IF v_delivery_method NOT IN ('username', 'email', 'link') THEN
    RAISE EXCEPTION 'Invalid invitation delivery method' USING ERRCODE = '23514';
  END IF;

  v_source := CASE
    WHEN v_delivery_method = 'link' THEN 'team_link'
    ELSE 'captain_search'
  END;

  IF v_delivery_method = 'username'
    AND v_invitee_username IS NULL
    AND v_invitee_user_id IS NULL THEN
    RAISE EXCEPTION 'Username invitation requires a username'
      USING ERRCODE = '23514';
  END IF;

  IF v_delivery_method = 'email' AND v_invitee_email IS NULL THEN
    RAISE EXCEPTION 'Email invitation requires an email'
      USING ERRCODE = '23514';
  END IF;

  IF v_delivery_method = 'username' AND v_invitee_user_id IS NULL THEN
    SELECT profile.user
    INTO v_invitee_user_id
    FROM public.profile profile
    WHERE lower(btrim(profile.username)) = v_invitee_username
    LIMIT 1;
  END IF;

  IF v_delivery_method = 'email' AND v_invitee_user_id IS NULL THEN
    SELECT auth_user.id
    INTO v_invitee_user_id
    FROM auth.users auth_user
    WHERE lower(btrim(auth_user.email)) = v_invitee_email
    LIMIT 1;
  END IF;

  -- Username and legacy link invitations still require a known account. Email
  -- invitations intentionally keep a null user id until the recipient signs up.
  IF v_delivery_method <> 'email' AND v_invitee_user_id IS NULL THEN
    RAISE EXCEPTION 'Player is not available for invitation'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_invitee_user_id = v_user_id THEN
    RAISE EXCEPTION 'Captain cannot invite herself' USING ERRCODE = '23514';
  END IF;

  IF v_invitee_user_id IS NOT NULL THEN
    SELECT lower(NULLIF(btrim(profile.username), ''))
    INTO v_invitee_username
    FROM public.profile profile
    WHERE profile.user = v_invitee_user_id
    ORDER BY profile.id DESC
    LIMIT 1;

    IF v_delivery_method = 'username' AND v_invitee_username IS NULL THEN
      RAISE EXCEPTION 'Player is not available for invitation'
        USING ERRCODE = 'P0002';
    END IF;

    SELECT lower(NULLIF(btrim(auth_user.email), ''))
    INTO v_invitee_email
    FROM auth.users auth_user
    WHERE auth_user.id = v_invitee_user_id;
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
    p_team_id,
    v_user_id,
    v_invitee_user_id,
    v_invitee_email,
    v_invitee_username,
    v_delivery_method,
    v_source,
    COALESCE(p_expires_at, now() + interval '14 days'),
    CASE WHEN v_invitee_email IS NULL THEN 'not_applicable' ELSE 'pending' END,
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING * INTO v_invitation;

  RETURN QUERY
  SELECT created_invitation.*
  FROM public.team_invitation created_invitation
  WHERE created_invitation.id = v_invitation.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_team_invitation_by_token(
  p_token UUID
)
RETURNS SETOF public.team_invitation
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_email TEXT;
  v_username TEXT;
  v_invitation public.team_invitation%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  SELECT lower(NULLIF(btrim(auth_user.email), ''))
  INTO v_user_email
  FROM auth.users auth_user
  WHERE auth_user.id = v_user_id;

  SELECT invitation.*
  INTO v_invitation
  FROM public.team_invitation invitation
  WHERE invitation.invitation_token = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_invitation.invitee_user_id IS NOT NULL THEN
    IF v_invitation.invitee_user_id IS DISTINCT FROM v_user_id THEN
      RAISE EXCEPTION 'Invitation not found' USING ERRCODE = 'P0002';
    END IF;

    RETURN QUERY
    SELECT invitation.*
    FROM public.team_invitation invitation
    WHERE invitation.id = v_invitation.id;
    RETURN;
  END IF;

  IF v_invitation.delivery_method <> 'email'
    OR v_user_email IS NULL
    OR v_invitation.invitee_email IS NULL
    OR v_user_email IS DISTINCT FROM lower(btrim(v_invitation.invitee_email)) THEN
    RAISE EXCEPTION 'Invitation not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT lower(NULLIF(btrim(profile.username), ''))
  INTO v_username
  FROM public.profile profile
  WHERE profile.user = v_user_id
  ORDER BY profile.id DESC
  LIMIT 1;

  UPDATE public.team_invitation invitation
  SET
    invitee_user_id = v_user_id,
    invitee_username = COALESCE(invitation.invitee_username, v_username)
  WHERE invitation.id = v_invitation.id
  RETURNING invitation.* INTO v_invitation;

  RETURN QUERY SELECT v_invitation.*;
END;
$$;

REVOKE ALL ON FUNCTION public.create_team_invitation(BIGINT, TEXT, UUID, TEXT, TEXT, TIMESTAMPTZ, JSONB)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_team_invitation(BIGINT, TEXT, UUID, TEXT, TEXT, TIMESTAMPTZ, JSONB)
  TO authenticated;

REVOKE ALL ON FUNCTION public.claim_team_invitation_by_token(UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_team_invitation_by_token(UUID)
  TO authenticated;

COMMENT ON FUNCTION public.create_team_invitation(BIGINT, TEXT, UUID, TEXT, TEXT, TIMESTAMPTZ, JSONB) IS
  'Creates nominated invitations; an email target may be claimed later if no matching account exists yet.';

COMMENT ON FUNCTION public.claim_team_invitation_by_token(UUID) IS
  'Claims an email invitation only when its private token and the authenticated account email both match.';
