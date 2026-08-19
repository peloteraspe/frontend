-- Completa la administración de capitana y el pago grupal con reglas de capacidad,
-- modalidades de precio, método de pago y cancelación con revocación de entradas.

ALTER TABLE public.team
  ADD COLUMN IF NOT EXISTS max_members SMALLINT NOT NULL DEFAULT 20;

ALTER TABLE public.team
  DROP CONSTRAINT IF EXISTS team_max_members_check;
ALTER TABLE public.team
  ADD CONSTRAINT team_max_members_check CHECK (max_members BETWEEN 1 AND 100);

ALTER TABLE public.event
  ADD COLUMN IF NOT EXISTS team_registration_price_mode TEXT NOT NULL DEFAULT 'per_player',
  ADD COLUMN IF NOT EXISTS team_registration_fixed_price NUMERIC;

ALTER TABLE public.event
  DROP CONSTRAINT IF EXISTS event_team_registration_price_check;
ALTER TABLE public.event
  ADD CONSTRAINT event_team_registration_price_check CHECK (
    team_registration_price_mode IN ('per_player', 'fixed_team')
    AND (team_registration_fixed_price IS NULL OR team_registration_fixed_price >= 0)
    AND (
      team_registration_price_mode = 'per_player'
      OR team_registration_fixed_price IS NOT NULL
    )
  );

ALTER TABLE public.team_event_registration
  ADD COLUMN IF NOT EXISTS price_mode TEXT NOT NULL DEFAULT 'per_player',
  ADD COLUMN IF NOT EXISTS payment_method_id BIGINT
    REFERENCES public."paymentMethod"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.team_event_registration
  DROP CONSTRAINT IF EXISTS team_event_registration_price_mode_check;
ALTER TABLE public.team_event_registration
  ADD CONSTRAINT team_event_registration_price_mode_check
    CHECK (price_mode IN ('per_player', 'fixed_team'));

CREATE INDEX IF NOT EXISTS team_event_registration_payment_method_idx
  ON public.team_event_registration(payment_method_id)
  WHERE payment_method_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.enforce_team_active_member_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_members INTEGER;
  v_active_members INTEGER;
BEGIN
  IF NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.status = 'active'
     AND OLD.team_id = NEW.team_id THEN
    RETURN NEW;
  END IF;

  SELECT team.max_members
  INTO v_max_members
  FROM public.team team
  WHERE team.id = NEW.team_id
    AND team.is_active = true
    AND team.deleted_at IS NULL
  FOR UPDATE;

  IF v_max_members IS NULL THEN
    RAISE EXCEPTION 'TEAM_NOT_FOUND';
  END IF;

  SELECT count(*)
  INTO v_active_members
  FROM public.team_member member
  WHERE member.team_id = NEW.team_id
    AND member.status = 'active'
    AND (TG_OP <> 'UPDATE' OR member.id <> NEW.id);

  IF v_active_members >= v_max_members THEN
    RAISE EXCEPTION 'TEAM_MEMBER_LIMIT_REACHED';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_team_active_member_limit ON public.team_member;
CREATE TRIGGER enforce_team_active_member_limit
BEFORE INSERT OR UPDATE OF team_id, status ON public.team_member
FOR EACH ROW EXECUTE FUNCTION public.enforce_team_active_member_limit();

DROP FUNCTION IF EXISTS public.create_team_with_captain(TEXT, TEXT, TEXT, TEXT, TEXT);
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

DROP FUNCTION IF EXISTS public.update_team_as_captain(BIGINT, TEXT, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.update_team_as_captain(
  p_team_id BIGINT,
  p_name TEXT,
  p_avatar_url TEXT DEFAULT NULL,
  p_instagram_username TEXT DEFAULT NULL,
  p_tiktok_username TEXT DEFAULT NULL,
  p_max_members INTEGER DEFAULT 20
)
RETURNS public.team
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_team public.team%ROWTYPE;
  v_name TEXT := btrim(COALESCE(p_name, ''));
  v_active_members INTEGER;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF char_length(v_name) NOT BETWEEN 2 AND 80 THEN RAISE EXCEPTION 'TEAM_NAME_INVALID'; END IF;
  IF p_max_members IS NULL OR p_max_members NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'TEAM_MEMBER_LIMIT_INVALID';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.team_member member
    WHERE member.team_id = p_team_id AND member.user_id = v_user_id
      AND member.role = 'captain' AND member.status = 'active'
  ) THEN RAISE EXCEPTION 'CAPTAIN_REQUIRED'; END IF;

  SELECT count(*) INTO v_active_members
  FROM public.team_member member
  WHERE member.team_id = p_team_id AND member.status = 'active';
  IF p_max_members < v_active_members THEN
    RAISE EXCEPTION 'TEAM_MEMBER_LIMIT_BELOW_ACTIVE';
  END IF;

  UPDATE public.team
  SET name = v_name,
      avatar_url = NULLIF(btrim(COALESCE(p_avatar_url, '')), ''),
      instagram_username = NULLIF(regexp_replace(btrim(COALESCE(p_instagram_username, '')), '^@+', ''), ''),
      tiktok_username = NULLIF(regexp_replace(btrim(COALESCE(p_tiktok_username, '')), '^@+', ''), ''),
      max_members = p_max_members
  WHERE id = p_team_id AND is_active = true AND deleted_at IS NULL
  RETURNING * INTO v_team;
  IF v_team.id IS NULL THEN RAISE EXCEPTION 'TEAM_NOT_FOUND'; END IF;
  RETURN v_team;
END;
$$;

DROP FUNCTION IF EXISTS public.create_team_event_registration(BIGINT, BIGINT, UUID[], TEXT);
CREATE OR REPLACE FUNCTION public.create_team_event_registration(
  p_event_id BIGINT,
  p_team_id BIGINT,
  p_member_user_ids UUID[],
  p_operation_number TEXT,
  p_payment_method_id BIGINT
)
RETURNS public.team_event_registration
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_event public.event%ROWTYPE;
  v_team public.team%ROWTYPE;
  v_registration public.team_event_registration%ROWTYPE;
  v_member public.team_member%ROWTYPE;
  v_member_user_id UUID;
  v_assistant_id BIGINT;
  v_selected_count INTEGER;
  v_active_count INTEGER;
  v_occupied_count INTEGER;
  v_min_players INTEGER;
  v_max_players INTEGER;
  v_price_mode TEXT;
  v_configured_price NUMERIC;
  v_total_amount NUMERIC;
  v_member_unit_price NUMERIC;
  v_operation_number TEXT := btrim(COALESCE(p_operation_number, ''));
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF v_operation_number !~ '^[0-9]{8}$' THEN RAISE EXCEPTION 'OPERATION_NUMBER_INVALID'; END IF;
  IF p_member_user_ids IS NULL OR cardinality(p_member_user_ids) = 0 THEN
    RAISE EXCEPTION 'TEAM_MEMBERS_REQUIRED';
  END IF;

  SELECT count(*), count(DISTINCT member_id)
  INTO v_selected_count, v_active_count
  FROM unnest(p_member_user_ids) AS selected(member_id);
  IF v_selected_count <> v_active_count THEN RAISE EXCEPTION 'DUPLICATE_TEAM_MEMBER'; END IF;

  SELECT * INTO v_event FROM public.event WHERE id = p_event_id FOR UPDATE;
  IF v_event.id IS NULL OR v_event.is_published = false THEN RAISE EXCEPTION 'EVENT_NOT_AVAILABLE'; END IF;
  IF NOT v_event.allows_team_registration THEN RAISE EXCEPTION 'TEAM_REGISTRATION_DISABLED'; END IF;
  IF COALESCE(v_event.end_time, v_event.start_time) <= now() THEN RAISE EXCEPTION 'EVENT_ENDED'; END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public."eventPaymentMethod" link
    JOIN public."paymentMethod" method ON method.id = link."paymentMethod"
    WHERE link.event = p_event_id
      AND link."paymentMethod" = p_payment_method_id
      AND method.is_active = true
  ) THEN RAISE EXCEPTION 'PAYMENT_METHOD_NOT_AVAILABLE'; END IF;

  SELECT * INTO v_team FROM public.team
  WHERE id = p_team_id AND is_active = true AND deleted_at IS NULL FOR UPDATE;
  IF v_team.id IS NULL THEN RAISE EXCEPTION 'TEAM_NOT_FOUND'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.team_member captain
    WHERE captain.team_id = p_team_id AND captain.user_id = v_user_id
      AND captain.role = 'captain' AND captain.status = 'active'
  ) THEN RAISE EXCEPTION 'CAPTAIN_REQUIRED'; END IF;

  SELECT count(*) INTO v_active_count
  FROM public.team_member member
  WHERE member.team_id = p_team_id AND member.status = 'active'
    AND member.user_id = ANY(p_member_user_ids);
  IF v_active_count <> v_selected_count THEN RAISE EXCEPTION 'ACTIVE_TEAM_MEMBERS_REQUIRED'; END IF;

  v_min_players := COALESCE(v_event.team_registration_min_players, 2);
  v_max_players := COALESCE(v_event.team_registration_max_players, v_event.max_users, 1000);
  IF v_selected_count < v_min_players OR v_selected_count > v_max_players THEN
    RAISE EXCEPTION 'TEAM_SIZE_OUT_OF_RANGE';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.team_event_registration registration
    WHERE registration.event_id = p_event_id AND registration.team_id = p_team_id
      AND registration.state IN ('pending', 'approved')
  ) THEN RAISE EXCEPTION 'TEAM_ALREADY_REGISTERED'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.assistants assistant
    WHERE assistant.event = p_event_id
      AND assistant.user = ANY(p_member_user_ids)
      AND lower(COALESCE(assistant.state, '')) IN ('pending', 'approved')
  ) THEN RAISE EXCEPTION 'MEMBER_ALREADY_REGISTERED'; END IF;

  SELECT count(*) INTO v_occupied_count
  FROM public.assistants assistant
  WHERE assistant.event = p_event_id
    AND lower(COALESCE(assistant.state, '')) IN ('pending', 'approved');
  IF COALESCE(v_event.max_users, 0) > 0
     AND v_occupied_count + v_selected_count > v_event.max_users THEN
    RAISE EXCEPTION 'EVENT_SOLD_OUT';
  END IF;

  v_price_mode := COALESCE(v_event.team_registration_price_mode, 'per_player');
  IF v_price_mode = 'fixed_team' THEN
    v_configured_price := v_event.team_registration_fixed_price;
    IF v_configured_price IS NULL OR v_configured_price < 0 THEN
      RAISE EXCEPTION 'TEAM_FIXED_PRICE_INVALID';
    END IF;
    v_total_amount := v_configured_price;
    v_member_unit_price := 0;
  ELSE
    v_configured_price := COALESCE(v_event.price, 0);
    v_total_amount := v_configured_price * v_selected_count;
    v_member_unit_price := v_configured_price;
  END IF;

  INSERT INTO public.team_event_registration(
    event_id, team_id, registered_by_user_id, operation_number,
    unit_price, participant_count, total_amount, state, price_mode, payment_method_id
  ) VALUES (
    p_event_id, p_team_id, v_user_id, v_operation_number,
    v_configured_price, v_selected_count, v_total_amount, 'pending', v_price_mode, p_payment_method_id
  ) RETURNING * INTO v_registration;

  FOREACH v_member_user_id IN ARRAY p_member_user_ids LOOP
    SELECT * INTO v_member FROM public.team_member
    WHERE team_id = p_team_id AND user_id = v_member_user_id AND status = 'active';

    INSERT INTO public.assistants(event, "user", "operationNumber", state, team_event_registration_id, team_id)
    VALUES (p_event_id, v_member_user_id, v_operation_number::BIGINT, 'pending', v_registration.id, p_team_id)
    RETURNING id INTO v_assistant_id;

    INSERT INTO public.team_event_registration_member(
      registration_id, team_member_id, user_id, assistant_id, unit_price
    ) VALUES (
      v_registration.id, v_member.id, v_member_user_id, v_assistant_id, v_member_unit_price
    );
  END LOOP;

  RETURN v_registration;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_team_event_registration(
  p_registration_id BIGINT,
  p_decision TEXT,
  p_reviewer_user_id UUID,
  p_reject_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_registration public.team_event_registration%ROWTYPE;
  v_event public.event%ROWTYPE;
  v_decision TEXT := lower(btrim(COALESCE(p_decision, '')));
  v_reason TEXT := NULLIF(btrim(COALESCE(p_reject_reason, '')), '');
  v_approved_count INTEGER;
  v_assistant_ids BIGINT[];
BEGIN
  IF v_decision NOT IN ('approve', 'reject') THEN RAISE EXCEPTION 'REVIEW_DECISION_INVALID'; END IF;
  IF v_decision = 'reject' AND v_reason IS NULL THEN RAISE EXCEPTION 'REJECT_REASON_REQUIRED'; END IF;

  SELECT * INTO v_registration FROM public.team_event_registration
  WHERE id = p_registration_id FOR UPDATE;
  IF v_registration.id IS NULL THEN RAISE EXCEPTION 'TEAM_REGISTRATION_NOT_FOUND'; END IF;
  IF v_registration.state NOT IN ('pending', CASE WHEN v_decision = 'approve' THEN 'approved' ELSE 'rejected' END) THEN
    RAISE EXCEPTION 'TEAM_REGISTRATION_ALREADY_REVIEWED';
  END IF;

  SELECT array_agg(member.assistant_id ORDER BY member.assistant_id)
  INTO v_assistant_ids
  FROM public.team_event_registration_member member
  WHERE member.registration_id = v_registration.id;

  IF v_decision = 'approve' THEN
    SELECT * INTO v_event FROM public.event WHERE id = v_registration.event_id FOR UPDATE;
    SELECT count(*) INTO v_approved_count FROM public.assistants assistant
    WHERE assistant.event = v_registration.event_id
      AND lower(COALESCE(assistant.state, '')) = 'approved'
      AND assistant.team_event_registration_id IS DISTINCT FROM v_registration.id;
    IF COALESCE(v_event.max_users, 0) > 0
       AND v_approved_count + v_registration.participant_count > v_event.max_users THEN
      RAISE EXCEPTION 'EVENT_SOLD_OUT';
    END IF;

    UPDATE public.assistants SET state = 'approved'
    WHERE team_event_registration_id = v_registration.id;
    UPDATE public.team_event_registration
    SET state = 'approved', reviewed_at = COALESCE(reviewed_at, now()),
        reviewed_by_user_id = COALESCE(reviewed_by_user_id, p_reviewer_user_id), reject_reason = NULL
    WHERE id = v_registration.id;

    INSERT INTO public.ticket(assistant_id, event_id, user_id, status, qr_token)
    SELECT assistant.id, assistant.event, assistant.user, 'active',
           encode(extensions.gen_random_bytes(24), 'hex')
    FROM public.assistants assistant
    WHERE assistant.team_event_registration_id = v_registration.id
    ON CONFLICT (event_id, user_id) DO UPDATE
    SET assistant_id = EXCLUDED.assistant_id,
        status = CASE WHEN public.ticket.status = 'used' THEN 'used' ELSE 'active' END,
        updated_at = now();
  ELSE
    UPDATE public.assistants SET state = 'rejected'
    WHERE team_event_registration_id = v_registration.id;
    UPDATE public.team_event_registration
    SET state = 'rejected', reviewed_at = COALESCE(reviewed_at, now()),
        reviewed_by_user_id = COALESCE(reviewed_by_user_id, p_reviewer_user_id),
        reject_reason = v_reason
    WHERE id = v_registration.id;
    UPDATE public.ticket SET status = 'revoked', updated_at = now()
    WHERE assistant_id = ANY(COALESCE(v_assistant_ids, ARRAY[]::BIGINT[])) AND status <> 'used';
  END IF;

  RETURN jsonb_build_object(
    'registrationId', v_registration.id,
    'state', CASE WHEN v_decision = 'approve' THEN 'approved' ELSE 'rejected' END,
    'assistantIds', COALESCE(to_jsonb(v_assistant_ids), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_team_event_registration(p_registration_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_registration public.team_event_registration%ROWTYPE;
  v_event public.event%ROWTYPE;
  v_assistant_ids BIGINT[];
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;

  SELECT * INTO v_registration
  FROM public.team_event_registration
  WHERE id = p_registration_id
  FOR UPDATE;
  IF v_registration.id IS NULL THEN RAISE EXCEPTION 'TEAM_REGISTRATION_NOT_FOUND'; END IF;
  IF v_registration.state NOT IN ('pending', 'approved') THEN
    RAISE EXCEPTION 'TEAM_REGISTRATION_NOT_CANCELLABLE';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.team_member captain
    WHERE captain.team_id = v_registration.team_id
      AND captain.user_id = v_user_id
      AND captain.role = 'captain'
      AND captain.status = 'active'
  ) THEN RAISE EXCEPTION 'CAPTAIN_REQUIRED'; END IF;

  SELECT * INTO v_event FROM public.event WHERE id = v_registration.event_id FOR UPDATE;
  IF v_event.id IS NULL THEN RAISE EXCEPTION 'EVENT_NOT_AVAILABLE'; END IF;
  IF v_event.start_time <= now() THEN RAISE EXCEPTION 'EVENT_ALREADY_STARTED'; END IF;

  SELECT array_agg(member.assistant_id ORDER BY member.assistant_id)
  INTO v_assistant_ids
  FROM public.team_event_registration_member member
  WHERE member.registration_id = v_registration.id;

  UPDATE public.team_event_registration
  SET state = 'cancelled'
  WHERE id = v_registration.id;
  UPDATE public.assistants
  SET state = 'rejected'
  WHERE team_event_registration_id = v_registration.id;
  UPDATE public.ticket
  SET status = 'revoked', updated_at = now()
  WHERE assistant_id = ANY(COALESCE(v_assistant_ids, ARRAY[]::BIGINT[]))
    AND status <> 'used';

  RETURN jsonb_build_object(
    'registrationId', v_registration.id,
    'state', 'cancelled',
    'assistantIds', COALESCE(to_jsonb(v_assistant_ids), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_team_with_captain(TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_team_as_captain(BIGINT, TEXT, TEXT, TEXT, TEXT, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_team_event_registration(BIGINT, BIGINT, UUID[], TEXT, BIGINT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_team_event_registration(BIGINT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_team_with_captain(TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_team_as_captain(BIGINT, TEXT, TEXT, TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_team_event_registration(BIGINT, BIGINT, UUID[], TEXT, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_team_event_registration(BIGINT) TO authenticated;

COMMENT ON COLUMN public.team.max_members IS
  'Límite de integrantes activas definido por la capitana.';
COMMENT ON COLUMN public.event.team_registration_price_mode IS
  'Modalidad del pago grupal: per_player o fixed_team.';
COMMENT ON COLUMN public.event.team_registration_fixed_price IS
  'Monto total cuando la modalidad grupal es fixed_team.';
COMMENT ON FUNCTION public.cancel_team_event_registration(BIGINT) IS
  'Cancela toda la inscripción antes del inicio y revoca sus tickets sin eliminar trazabilidad.';
