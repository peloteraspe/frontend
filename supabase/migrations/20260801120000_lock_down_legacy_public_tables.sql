-- Emergency containment for legacy tables exposed through the Data API.
--
-- These tables previously granted broad access to anon/authenticated while
-- row-level security was disabled. Keep service_role access intact, deny all
-- direct client access, and add explicit least-privilege policies before any
-- client-side flow is re-enabled.

BEGIN;

ALTER TABLE public.assistants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemption ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."eventFeatures" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."eventPaymentMethod" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."eventType" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_checkin ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_checkin_registration ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.level ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."otherFeatures" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."paymentMethod" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_position ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_position ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE
  public.assistants,
  public.coupon,
  public.coupon_redemption,
  public.event,
  public."eventFeatures",
  public."eventPaymentMethod",
  public."eventType",
  public.event_checkin,
  public.event_checkin_registration,
  public.features,
  public.level,
  public."otherFeatures",
  public."paymentMethod",
  public.player_position,
  public.profile,
  public.profile_position,
  public.ticket
FROM PUBLIC, anon, authenticated;

-- Remove access to the identity sequences as well. Table privileges alone do
-- not revoke a previously granted ability to call nextval() directly.
DO $$
DECLARE
  sequence_name text;
BEGIN
  FOR sequence_name IN
    SELECT pg_get_serial_sequence(format('%I.%I', 'public', table_name), 'id')
    FROM (
      VALUES
        ('assistants'),
        ('coupon'),
        ('coupon_redemption'),
        ('event'),
        ('eventFeatures'),
        ('eventPaymentMethod'),
        ('eventType'),
        ('event_checkin'),
        ('event_checkin_registration'),
        ('features'),
        ('level'),
        ('otherFeatures'),
        ('paymentMethod'),
        ('player_position'),
        ('profile'),
        ('profile_position'),
        ('ticket')
    ) AS legacy_tables(table_name)
  LOOP
    IF sequence_name IS NOT NULL THEN
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON SEQUENCE %s FROM PUBLIC, anon, authenticated',
        sequence_name
      );
    END IF;
  END LOOP;
END $$;

-- Restore only the direct Data API access required by the product after the
-- legacy-table containment migration. Auth accounts remain untouched: an
-- authenticated user without a profile can still finish onboarding, but gets
-- no direct access to payment, coupon, check-in, or other users' private data.

CREATE OR REPLACE FUNCTION public.is_peloteras_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT
    lower(coalesce(auth.jwt() ->> 'email', '')) IN (
      'fiorellasaro27@gmail.com',
      'peloteras.com@gmail.com',
      'andrealemonroy@gmail.com'
    )
    OR lower(coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')) = 'superadmin'
    OR lower(coalesce(auth.jwt() -> 'app_metadata' ->> 'is_superadmin', 'false')) = 'true';
$$;

CREATE OR REPLACE FUNCTION public.can_manage_legacy_event(p_event_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    public.is_peloteras_superadmin()
    OR EXISTS (
      SELECT 1
      FROM public.event e
      WHERE e.id = p_event_id
        AND e.created_by_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.can_view_legacy_event(p_event_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.event e
    WHERE e.id = p_event_id
      AND (
        e.is_published = true
        OR e.created_by_id = auth.uid()
        OR public.is_peloteras_superadmin()
        OR EXISTS (
          SELECT 1
          FROM public.assistants a
          WHERE a.event = e.id
            AND a."user" = auth.uid()
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_owns_profile(p_profile_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profile p
    WHERE p.id = p_profile_id
      AND p."user" = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_has_complete_profile()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profile p
    WHERE p."user" = auth.uid()
      AND (
        p.is_profile_complete = true
        OR coalesce(p.onboarding_step, 0) >= 2
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_can_use_payment_method(p_payment_method_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    public.current_user_has_complete_profile()
    AND EXISTS (
      SELECT 1
      FROM public."paymentMethod" pm
      JOIN public."eventPaymentMethod" epm
        ON epm."paymentMethod" = pm.id
      JOIN public.event e
        ON e.id = epm.event
      WHERE pm.id = p_payment_method_id
        AND pm.is_active = true
        AND e.is_published = true
    );
$$;

CREATE OR REPLACE FUNCTION public.current_user_can_write_ticket(
  p_assistant_id bigint,
  p_event_id bigint,
  p_user_id uuid,
  p_status text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    (p_user_id = auth.uid() OR public.can_manage_legacy_event(p_event_id))
    AND EXISTS (
      SELECT 1
      FROM public.assistants a
      WHERE a.id = p_assistant_id
        AND a.event = p_event_id
        AND a."user" = p_user_id
        AND (
          (a.state = 'approved' AND p_status IN ('active', 'used'))
          OR (a.state = 'rejected' AND p_status = 'revoked')
          OR (coalesce(a.state, 'pending') NOT IN ('approved', 'rejected') AND p_status = 'pending')
        )
    );
$$;

REVOKE ALL ON FUNCTION public.is_peloteras_superadmin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_manage_legacy_event(bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_view_legacy_event(bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_user_owns_profile(bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_user_has_complete_profile() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_user_can_use_payment_method(bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_user_can_write_ticket(bigint, bigint, uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_peloteras_superadmin() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_manage_legacy_event(bigint) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_view_legacy_event(bigint) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_owns_profile(bigint) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_has_complete_profile() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_can_use_payment_method(bigint) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_can_write_ticket(bigint, bigint, uuid, text) TO authenticated, service_role;

-- Read-only public catalogs.
CREATE POLICY event_type_public_select
  ON public."eventType"
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY features_public_select
  ON public.features
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY level_public_select
  ON public.level
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY player_position_public_select
  ON public.player_position
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON TABLE
  public."eventType",
  public.features,
  public.level,
  public.player_position
TO anon, authenticated;

CREATE POLICY event_catalog_select
  ON public.event
  FOR SELECT
  TO anon, authenticated
  USING (public.can_view_legacy_event(id));

GRANT SELECT ON TABLE public.event TO anon, authenticated;

CREATE POLICY event_features_visible_event_select
  ON public."eventFeatures"
  FOR SELECT
  TO anon, authenticated
  USING (public.can_view_legacy_event(event));

CREATE POLICY other_features_visible_event_select
  ON public."otherFeatures"
  FOR SELECT
  TO anon, authenticated
  USING (public.can_view_legacy_event(event));

GRANT SELECT ON TABLE public."eventFeatures", public."otherFeatures" TO anon, authenticated;

-- A signed-in user can see only her registrations. Event owners can manage
-- the payment state for registrations belonging to their events.
CREATE POLICY assistants_owner_or_event_manager_select
  ON public.assistants
  FOR SELECT
  TO authenticated
  USING (
    "user" = auth.uid()
    OR public.can_manage_legacy_event(event)
  );

CREATE POLICY assistants_event_manager_update
  ON public.assistants
  FOR UPDATE
  TO authenticated
  USING (public.can_manage_legacy_event(event))
  WITH CHECK (public.can_manage_legacy_event(event));

GRANT SELECT ON TABLE public.assistants TO authenticated;
GRANT UPDATE (state) ON TABLE public.assistants TO authenticated;

-- Profiles remain available for public player pages only after onboarding.
-- Every authenticated user can always read and finish only her own profile.
CREATE POLICY profile_public_complete_or_own_select
  ON public.profile
  FOR SELECT
  TO anon, authenticated
  USING (
    is_profile_complete = true
    OR coalesce(onboarding_step, 0) >= 2
    OR "user" = auth.uid()
    OR public.is_peloteras_superadmin()
  );

CREATE POLICY profile_own_insert
  ON public.profile
  FOR INSERT
  TO authenticated
  WITH CHECK ("user" = auth.uid());

CREATE POLICY profile_own_update
  ON public.profile
  FOR UPDATE
  TO authenticated
  USING ("user" = auth.uid())
  WITH CHECK ("user" = auth.uid());

GRANT SELECT ON TABLE public.profile TO anon, authenticated;
GRANT INSERT ("user", username, level_id, onboarding_step, is_profile_complete)
  ON TABLE public.profile TO authenticated;
GRANT UPDATE (username, level_id, onboarding_step, is_profile_complete)
  ON TABLE public.profile TO authenticated;

CREATE POLICY profile_position_public_complete_or_own_select
  ON public.profile_position
  FOR SELECT
  TO anon, authenticated
  USING (
    public.current_user_owns_profile(profile_id)
    OR public.is_peloteras_superadmin()
    OR EXISTS (
      SELECT 1
      FROM public.profile p
      WHERE p.id = profile_position.profile_id
        AND (
          p.is_profile_complete = true
          OR coalesce(p.onboarding_step, 0) >= 2
        )
    )
  );

CREATE POLICY profile_position_own_insert
  ON public.profile_position
  FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_owns_profile(profile_id));

CREATE POLICY profile_position_own_delete
  ON public.profile_position
  FOR DELETE
  TO authenticated
  USING (public.current_user_owns_profile(profile_id));

GRANT SELECT ON TABLE public.profile_position TO anon, authenticated;
GRANT INSERT (profile_id, position_id) ON TABLE public.profile_position TO authenticated;
GRANT DELETE ON TABLE public.profile_position TO authenticated;

-- Payment details are visible only to the owner or to a fully onboarded user
-- when the active method is linked to a published event.
CREATE POLICY event_payment_method_available_select
  ON public."eventPaymentMethod"
  FOR SELECT
  TO authenticated
  USING (
    public.can_manage_legacy_event(event)
    OR (
      public.current_user_has_complete_profile()
      AND EXISTS (
        SELECT 1
        FROM public.event e
        WHERE e.id = "eventPaymentMethod".event
          AND e.is_published = true
      )
    )
  );

CREATE POLICY payment_method_available_or_owned_select
  ON public."paymentMethod"
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_peloteras_superadmin()
    OR public.current_user_can_use_payment_method(id)
  );

GRANT SELECT ON TABLE public."eventPaymentMethod", public."paymentMethod" TO authenticated;

-- QR tokens stay private to the ticket holder and the event owner. A holder
-- may generate/sync only a ticket backed by her own registration and state.
CREATE POLICY ticket_holder_or_event_manager_select
  ON public.ticket
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.can_manage_legacy_event(event_id)
  );

CREATE POLICY ticket_valid_holder_or_event_manager_insert
  ON public.ticket
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_can_write_ticket(assistant_id, event_id, user_id, status)
  );

CREATE POLICY ticket_valid_holder_or_event_manager_update
  ON public.ticket
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.can_manage_legacy_event(event_id)
  )
  WITH CHECK (
    public.current_user_can_write_ticket(assistant_id, event_id, user_id, status)
  );

GRANT SELECT ON TABLE public.ticket TO authenticated;
GRANT INSERT (
  assistant_id,
  event_id,
  user_id,
  status,
  qr_token,
  qr_generated_at,
  apple_wallet_url,
  google_wallet_url,
  updated_at
) ON TABLE public.ticket TO authenticated;
GRANT UPDATE (
  assistant_id,
  status,
  qr_token,
  used_at,
  apple_wallet_url,
  google_wallet_url,
  updated_at
) ON TABLE public.ticket TO authenticated;

-- Client-mediated INSERTs require their identity sequences.
DO $$
DECLARE
  sequence_name text;
BEGIN
  FOREACH sequence_name IN ARRAY ARRAY[
    pg_get_serial_sequence('public.profile', 'id'),
    pg_get_serial_sequence('public.profile_position', 'id'),
    pg_get_serial_sequence('public.ticket', 'id')
  ]
  LOOP
    IF sequence_name IS NOT NULL THEN
      EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %s TO authenticated', sequence_name);
    END IF;
  END LOOP;
END $$;

-- Intentionally no anon/authenticated grants or policies for coupon,
-- coupon_redemption, event_checkin, or event_checkin_registration. Those
-- flows are mediated by authenticated server endpoints using service_role.

COMMIT;
