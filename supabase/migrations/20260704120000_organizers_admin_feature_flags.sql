-- KAN-13: organizers and operational admin feature flags

CREATE TABLE IF NOT EXISTS public.organizers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  profile_id BIGINT REFERENCES public.profile(id) ON UPDATE CASCADE ON DELETE SET NULL,
  partner_lead_id BIGINT REFERENCES public.partner_leads(id) ON UPDATE CASCADE ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pilot',
  source TEXT NOT NULL DEFAULT 'full_chocolate',
  zone TEXT,
  experience_level TEXT,
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT organizers_status_check
    CHECK (status IN ('pilot', 'active', 'paused', 'inactive')),
  CONSTRAINT organizers_source_check
    CHECK (source IN ('full_chocolate', 'peloteras', 'other'))
);

CREATE UNIQUE INDEX IF NOT EXISTS organizers_user_id_unique
  ON public.organizers (user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS organizers_profile_id_unique
  ON public.organizers (profile_id)
  WHERE profile_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS organizers_partner_lead_id_unique
  ON public.organizers (partner_lead_id)
  WHERE partner_lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS organizers_status_idx
  ON public.organizers (status);

CREATE INDEX IF NOT EXISTS organizers_source_idx
  ON public.organizers (source);


CREATE TABLE IF NOT EXISTS public.admin_feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  can_create_events BOOLEAN NOT NULL DEFAULT false,
  can_manage_own_events BOOLEAN NOT NULL DEFAULT false,
  can_view_participants BOOLEAN NOT NULL DEFAULT false,
  can_manage_payments BOOLEAN NOT NULL DEFAULT false,
  can_scan_tickets BOOLEAN NOT NULL DEFAULT false,
  can_manage_finances BOOLEAN NOT NULL DEFAULT false,
  can_view_reports BOOLEAN NOT NULL DEFAULT false,
  can_manage_organizers BOOLEAN NOT NULL DEFAULT false,
  enabled_by UUID REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT admin_feature_flags_user_id_key UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS admin_feature_flags_user_id_idx
  ON public.admin_feature_flags (user_id);

CREATE INDEX IF NOT EXISTS admin_feature_flags_enabled_by_idx
  ON public.admin_feature_flags (enabled_by)
  WHERE enabled_by IS NOT NULL;


ALTER TABLE public.organizers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_feature_flags ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'organizers'
      AND policyname = 'organizers_service_role_all'
  ) THEN
    CREATE POLICY organizers_service_role_all
      ON public.organizers
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
      AND tablename = 'admin_feature_flags'
      AND policyname = 'admin_feature_flags_service_role_all'
  ) THEN
    CREATE POLICY admin_feature_flags_service_role_all
      ON public.admin_feature_flags
      AS PERMISSIVE
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
