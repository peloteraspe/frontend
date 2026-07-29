-- TEAM-201 / TEAM-204: Sprint 2 invitation model hardening.
-- Keeps the earlier TEAM-111 migration compatible while aligning the stored
-- invitation lifecycle with the Sprint 2 nominated and team-link flows.

ALTER TABLE public.team_invitation
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_delivery_status TEXT,
  ADD COLUMN IF NOT EXISTS provider_message_id TEXT;

UPDATE public.team_invitation
SET
  source = CASE
    WHEN delivery_method = 'link' THEN 'team_link'
    ELSE 'captain_search'
  END
WHERE source IS NULL;

UPDATE public.team_invitation
SET invitee_email = lower(NULLIF(btrim(invitee_email), ''))
WHERE invitee_email IS DISTINCT FROM lower(NULLIF(btrim(invitee_email), ''));

UPDATE public.team_invitation invitation
SET invitee_user_id = profile.user
FROM public.profile profile
WHERE invitation.invitee_user_id IS NULL
  AND NULLIF(btrim(invitation.invitee_username), '') IS NOT NULL
  AND lower(btrim(profile.username)) = lower(btrim(invitation.invitee_username));

-- Historical placeholder rows created before the link flow had an authenticated
-- invitee cannot be answered safely. Preserve them as cancelled history.
UPDATE public.team_invitation
SET
  status = 'cancelled',
  cancelled_at = COALESCE(cancelled_at, now())
WHERE status = 'pending'
  AND (
    (source = 'captain_search' AND invitee_user_id IS NULL AND invitee_email IS NULL)
    OR (source = 'team_link' AND invitee_user_id IS NULL)
  );

UPDATE public.team_invitation
SET expires_at = created_at + interval '14 days'
WHERE expires_at IS NULL;

UPDATE public.team_invitation
SET email_delivery_status = CASE
  WHEN invitee_email IS NULL THEN 'not_applicable'
  ELSE 'pending'
END
WHERE email_delivery_status IS NULL;

ALTER TABLE public.team_invitation
  ALTER COLUMN source SET DEFAULT 'captain_search',
  ALTER COLUMN source SET NOT NULL,
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '14 days'),
  ALTER COLUMN expires_at SET NOT NULL,
  ALTER COLUMN email_delivery_status SET DEFAULT 'pending',
  ALTER COLUMN email_delivery_status SET NOT NULL;

ALTER TABLE public.team_invitation
  ADD CONSTRAINT team_invitation_source_check
    CHECK (source IN ('captain_search', 'team_link')),
  ADD CONSTRAINT team_invitation_email_delivery_status_check
    CHECK (email_delivery_status IN ('pending', 'sent', 'failed', 'not_applicable')),
  ADD CONSTRAINT team_invitation_email_sent_timestamp_check
    CHECK (email_delivery_status <> 'sent' OR email_sent_at IS NOT NULL),
  ADD CONSTRAINT team_invitation_expiration_after_creation_check
    CHECK (expires_at > created_at),
  ADD CONSTRAINT team_invitation_pending_target_check
    CHECK (
      status <> 'pending'
      OR (
        source = 'captain_search'
        AND (invitee_user_id IS NOT NULL OR invitee_email IS NOT NULL)
      )
      OR (
        source = 'team_link'
        AND invitee_user_id IS NOT NULL
      )
    );

-- Index names are schema-wide. TEAM-101 already used the old name for the
-- team's general token, so rename it before creating the invitation-token index.
ALTER INDEX IF EXISTS public.team_invitation_token_unique_idx
  RENAME TO team_general_invitation_token_unique_idx;

CREATE UNIQUE INDEX IF NOT EXISTS team_invitation_invitation_token_unique_idx
  ON public.team_invitation (invitation_token);

-- A link invitation belongs to the authenticated viewer, not globally to the
-- team. The existing (team_id)-only index prevented two viewers from using it.
DROP INDEX IF EXISTS public.team_invitation_pending_link_unique_idx;

CREATE INDEX IF NOT EXISTS team_invitation_source_status_idx
  ON public.team_invitation (source, status);

CREATE INDEX IF NOT EXISTS team_invitation_expires_at_pending_idx
  ON public.team_invitation (expires_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS team_invitation_email_delivery_status_idx
  ON public.team_invitation (email_delivery_status)
  WHERE email_delivery_status IN ('pending', 'failed');

CREATE OR REPLACE FUNCTION public.prepare_team_invitation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.invitee_email := lower(NULLIF(btrim(COALESCE(NEW.invitee_email, '')), ''));
  NEW.invitee_username := lower(NULLIF(btrim(COALESCE(NEW.invitee_username, '')), ''));

  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := COALESCE(NEW.created_at, now()) + interval '14 days';
  END IF;

  IF NEW.email_delivery_status IS NULL THEN
    NEW.email_delivery_status := CASE
      WHEN NEW.invitee_email IS NULL THEN 'not_applicable'
      ELSE 'pending'
    END;
  ELSIF NEW.invitee_email IS NULL AND NEW.email_delivery_status = 'pending' THEN
    NEW.email_delivery_status := 'not_applicable';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status <> 'pending' AND NEW.status <> OLD.status THEN
    RAISE EXCEPTION 'A terminal invitation cannot change status'
      USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'UPDATE'
    AND OLD.status = 'pending'
    AND NEW.status NOT IN ('pending', 'accepted', 'rejected', 'cancelled', 'expired') THEN
    RAISE EXCEPTION 'Invalid invitation status transition'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.status IN ('accepted', 'rejected') AND NEW.responded_at IS NULL THEN
    NEW.responded_at := now();
  END IF;

  IF NEW.status = 'cancelled' AND NEW.cancelled_at IS NULL THEN
    NEW.cancelled_at := now();
  END IF;

  IF NEW.status = 'pending' AND NEW.invitee_user_id IS NOT NULL THEN
    IF TG_OP = 'INSERT'
      OR (
        TG_OP = 'UPDATE'
        AND (
          OLD.status IS DISTINCT FROM NEW.status
          OR OLD.team_id IS DISTINCT FROM NEW.team_id
          OR OLD.invitee_user_id IS DISTINCT FROM NEW.invitee_user_id
        )
      ) THEN
      IF EXISTS (
        SELECT 1
        FROM public.team_member member
        WHERE member.team_id = NEW.team_id
          AND member.user_id = NEW.invitee_user_id
          AND member.status = 'active'
      ) THEN
        RAISE EXCEPTION 'User is already an active team member'
          USING ERRCODE = '23514';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prepare_team_invitation ON public.team_invitation;

CREATE TRIGGER prepare_team_invitation
BEFORE INSERT OR UPDATE ON public.team_invitation
FOR EACH ROW
EXECUTE FUNCTION public.prepare_team_invitation();

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

  IF v_invitee_user_id IS NULL THEN
    RAISE EXCEPTION 'Player is not available for invitation'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_invitee_user_id = v_user_id THEN
    RAISE EXCEPTION 'Captain cannot invite herself' USING ERRCODE = '23514';
  END IF;

  SELECT lower(NULLIF(btrim(profile.username), ''))
  INTO v_invitee_username
  FROM public.profile profile
  WHERE profile.user = v_invitee_user_id
  ORDER BY profile.id DESC
  LIMIT 1;

  IF v_invitee_username IS NULL THEN
    RAISE EXCEPTION 'Player is not available for invitation'
      USING ERRCODE = 'P0002';
  END IF;

  SELECT lower(NULLIF(btrim(auth_user.email), ''))
  INTO v_invitee_email
  FROM auth.users auth_user
  WHERE auth_user.id = v_invitee_user_id;

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

REVOKE ALL ON FUNCTION public.prepare_team_invitation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_team_invitation(BIGINT, TEXT, UUID, TEXT, TEXT, TIMESTAMPTZ, JSONB)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_team_invitation(BIGINT, TEXT, UUID, TEXT, TEXT, TIMESTAMPTZ, JSONB)
  TO authenticated;

COMMENT ON COLUMN public.team_invitation.source IS
  'Business origin of the invitation: captain_search or team_link.';

COMMENT ON COLUMN public.team_invitation.email_delivery_status IS
  'Transactional email state: pending, sent, failed or not_applicable.';

COMMENT ON COLUMN public.team_invitation.provider_message_id IS
  'Opaque identifier returned by the transactional email provider.';

COMMENT ON FUNCTION public.create_team_invitation(BIGINT, TEXT, UUID, TEXT, TEXT, TIMESTAMPTZ, JSONB) IS
  'Creates a 14-day nominated invitation after validating the authenticated active captain and invitee.';
