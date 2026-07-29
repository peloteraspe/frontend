-- TEAM-204 / TEAM-208 / TEAM-209 / TEAM-214 / TEAM-215:
-- privileged invitation transitions with explicit session validation.

CREATE OR REPLACE FUNCTION public.respond_to_team_invitation(
  p_invitation_id BIGINT,
  p_response TEXT
)
RETURNS SETOF public.team_invitation
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_response TEXT := lower(btrim(COALESCE(p_response, '')));
  v_invitation public.team_invitation%ROWTYPE;
  v_member public.team_member%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF v_response NOT IN ('accepted', 'rejected') THEN
    RAISE EXCEPTION 'Response must be accepted or rejected'
      USING ERRCODE = '23514';
  END IF;

  SELECT invitation.*
  INTO v_invitation
  FROM public.team_invitation invitation
  WHERE invitation.id = p_invitation_id
  FOR UPDATE;

  IF NOT FOUND OR v_invitation.invitee_user_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'Invitation not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_invitation.status = v_response THEN
    RETURN QUERY
    SELECT invitation.*
    FROM public.team_invitation invitation
    WHERE invitation.id = v_invitation.id;
    RETURN;
  END IF;

  IF v_invitation.status <> 'pending' THEN
    RAISE EXCEPTION 'Invitation is no longer pending' USING ERRCODE = '23514';
  END IF;

  IF v_invitation.expires_at <= now() THEN
    UPDATE public.team_invitation invitation
    SET status = 'expired'
    WHERE invitation.id = v_invitation.id
    RETURNING invitation.* INTO v_invitation;

    RETURN QUERY SELECT v_invitation.*;
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.team team
    WHERE team.id = v_invitation.team_id
      AND team.is_active = true
      AND team.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Team is not active' USING ERRCODE = '23514';
  END IF;

  IF v_response = 'accepted' THEN
    SELECT member.*
    INTO v_member
    FROM public.team_member member
    WHERE member.team_id = v_invitation.team_id
      AND member.user_id = v_user_id
    FOR UPDATE;

    IF FOUND AND v_member.status = 'active' THEN
      RAISE EXCEPTION 'User is already an active team member'
        USING ERRCODE = '23514';
    END IF;

    IF FOUND THEN
      UPDATE public.team_member member
      SET
        role = 'player',
        status = 'active',
        joined_at = now(),
        ended_at = NULL
      WHERE member.id = v_member.id
      RETURNING member.* INTO v_member;
    ELSE
      INSERT INTO public.team_member (
        team_id,
        user_id,
        role,
        status,
        joined_at
      )
      VALUES (
        v_invitation.team_id,
        v_user_id,
        'player',
        'active',
        now()
      )
      RETURNING * INTO v_member;
    END IF;

    UPDATE public.team_invitation invitation
    SET
      status = 'accepted',
      responded_at = now(),
      accepted_member_id = v_member.id
    WHERE invitation.id = v_invitation.id
    RETURNING invitation.* INTO v_invitation;
  ELSE
    UPDATE public.team_invitation invitation
    SET
      status = 'rejected',
      responded_at = now()
    WHERE invitation.id = v_invitation.id
    RETURNING invitation.* INTO v_invitation;
  END IF;

  RETURN QUERY SELECT v_invitation.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_team_invitation(
  p_invitation_id BIGINT
)
RETURNS SETOF public.team_invitation
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_invitation public.team_invitation%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  SELECT invitation.*
  INTO v_invitation
  FROM public.team_invitation invitation
  WHERE invitation.id = p_invitation_id
  FOR UPDATE;

  IF NOT FOUND OR NOT public.is_active_team_captain(v_invitation.team_id, v_user_id) THEN
    RAISE EXCEPTION 'Invitation not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_invitation.status = 'cancelled' THEN
    RETURN QUERY SELECT v_invitation.*;
    RETURN;
  END IF;

  IF v_invitation.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending invitations can be cancelled'
      USING ERRCODE = '23514';
  END IF;

  UPDATE public.team_invitation invitation
  SET
    status = 'cancelled',
    cancelled_at = now()
  WHERE invitation.id = v_invitation.id
  RETURNING invitation.* INTO v_invitation;

  RETURN QUERY SELECT v_invitation.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_visible_team_invitations(
  p_team_id BIGINT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_expired_count INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  UPDATE public.team_invitation invitation
  SET status = 'expired'
  WHERE invitation.status = 'pending'
    AND invitation.expires_at <= now()
    AND (p_team_id IS NULL OR invitation.team_id = p_team_id)
    AND (
      invitation.invitee_user_id = v_user_id
      OR public.is_active_team_captain(invitation.team_id, v_user_id)
    );

  GET DIAGNOSTICS v_expired_count = ROW_COUNT;
  RETURN v_expired_count;
END;
$$;

REVOKE ALL ON FUNCTION public.respond_to_team_invitation(BIGINT, TEXT)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_team_invitation(BIGINT)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.expire_visible_team_invitations(BIGINT)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.respond_to_team_invitation(BIGINT, TEXT)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_team_invitation(BIGINT)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.expire_visible_team_invitations(BIGINT)
  TO authenticated;

COMMENT ON FUNCTION public.respond_to_team_invitation(BIGINT, TEXT) IS
  'Accepts or rejects the authenticated invitee invitation; acceptance and membership are one transaction.';

COMMENT ON FUNCTION public.cancel_team_invitation(BIGINT) IS
  'Cancels a pending invitation after validating the authenticated active captain.';

COMMENT ON FUNCTION public.expire_visible_team_invitations(BIGINT) IS
  'Idempotently expires overdue invitations visible to the authenticated invitee or captain.';
