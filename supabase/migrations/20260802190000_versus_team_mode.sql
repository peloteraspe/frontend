-- Modela los Versus como eventos exclusivos para una cantidad configurable de
-- equipos (mínimo dos) y evita inscripciones individuales o equipos excedentes.

ALTER TABLE public.event
  ADD COLUMN IF NOT EXISTS registration_mode TEXT,
  ADD COLUMN IF NOT EXISTS team_registration_max_teams SMALLINT;

UPDATE public.event event_row
SET registration_mode = CASE
  WHEN event_type.id IS NOT NULL AND (
    lower(btrim(event_type.name)) LIKE '%versus%'
    OR lower(btrim(event_type.name)) ~ '(^|[[:space:]])vs([[:space:]]|$)'
    OR lower(btrim(event_type.name)) = 'partido entre equipos'
  ) THEN 'team'
  WHEN event_row.allows_team_registration THEN 'both'
  ELSE 'individual'
END
FROM public."eventType" event_type
WHERE event_type.id = event_row."EventType"
  AND event_row.registration_mode IS NULL;

UPDATE public.event
SET registration_mode = CASE
  WHEN allows_team_registration THEN 'both'
  ELSE 'individual'
END
WHERE registration_mode IS NULL;

UPDATE public.event
SET allows_team_registration = true,
    team_registration_max_teams = COALESCE(team_registration_max_teams, 2)
WHERE registration_mode = 'team';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.event event_row
    WHERE event_row.registration_mode = 'team'
      AND (
        SELECT count(*)
        FROM public.team_event_registration registration
        WHERE registration.event_id = event_row.id
          AND registration.state IN ('pending', 'approved')
      ) > COALESCE(event_row.team_registration_max_teams, 2)
  ) THEN
    RAISE EXCEPTION 'VERSUS_HAS_TOO_MANY_TEAMS';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.event event_row
    JOIN public.assistants assistant ON assistant.event = event_row.id
    WHERE event_row.registration_mode = 'team'
      AND lower(COALESCE(assistant.state, '')) IN ('pending', 'approved')
      AND assistant.team_event_registration_id IS NULL
  ) THEN
    RAISE EXCEPTION 'VERSUS_HAS_INDIVIDUAL_REGISTRATIONS';
  END IF;
END;
$$;

ALTER TABLE public.event
  ALTER COLUMN registration_mode SET DEFAULT 'individual',
  ALTER COLUMN registration_mode SET NOT NULL;

ALTER TABLE public.event
  DROP CONSTRAINT IF EXISTS event_team_registration_max_teams_check;
ALTER TABLE public.event
  ADD CONSTRAINT event_team_registration_max_teams_check
  CHECK (
    team_registration_max_teams IS NULL
    OR team_registration_max_teams BETWEEN 2 AND 64
  );

ALTER TABLE public.event
  DROP CONSTRAINT IF EXISTS event_registration_mode_check;
ALTER TABLE public.event
  ADD CONSTRAINT event_registration_mode_check
  CHECK (registration_mode IN ('individual', 'team', 'both'));

ALTER TABLE public.event
  DROP CONSTRAINT IF EXISTS event_team_mode_requires_team_registration_check;
ALTER TABLE public.event
  ADD CONSTRAINT event_team_mode_requires_team_registration_check
  CHECK (
    registration_mode <> 'team'
    OR (
      allows_team_registration = true
      AND team_registration_max_teams IS NOT NULL
      AND team_registration_max_teams BETWEEN 2 AND 64
    )
  );

CREATE OR REPLACE FUNCTION public.enforce_team_event_conversion_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_active_team_count INTEGER;
  v_active_individual_count INTEGER;
BEGIN
  IF NEW.registration_mode <> 'team' THEN
    RETURN NEW;
  END IF;

  SELECT count(*)
  INTO v_active_team_count
  FROM public.team_event_registration registration
  WHERE registration.event_id = NEW.id
    AND registration.state IN ('pending', 'approved');

  IF v_active_team_count > COALESCE(NEW.team_registration_max_teams, 2) THEN
    RAISE EXCEPTION 'VERSUS_HAS_TOO_MANY_TEAMS';
  END IF;

  SELECT count(*)
  INTO v_active_individual_count
  FROM public.assistants assistant
  WHERE assistant.event = NEW.id
    AND lower(COALESCE(assistant.state, '')) IN ('pending', 'approved')
    AND assistant.team_event_registration_id IS NULL;

  IF v_active_individual_count > 0 THEN
    RAISE EXCEPTION 'VERSUS_HAS_INDIVIDUAL_REGISTRATIONS';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_team_event_conversion_consistency ON public.event;
CREATE TRIGGER enforce_team_event_conversion_consistency
BEFORE INSERT OR UPDATE OF registration_mode, team_registration_max_teams
ON public.event
FOR EACH ROW
EXECUTE FUNCTION public.enforce_team_event_conversion_consistency();

CREATE OR REPLACE FUNCTION public.enforce_versus_team_registration_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_registration_mode TEXT;
  v_max_team_count INTEGER;
  v_active_team_count INTEGER;
BEGIN
  IF NEW.state NOT IN ('pending', 'approved') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.event_id = NEW.event_id
     AND OLD.state IN ('pending', 'approved') THEN
    RETURN NEW;
  END IF;

  SELECT event_row.registration_mode, event_row.team_registration_max_teams
  INTO v_registration_mode, v_max_team_count
  FROM public.event event_row
  WHERE event_row.id = NEW.event_id
  FOR UPDATE;

  IF v_registration_mode <> 'team' THEN
    RETURN NEW;
  END IF;

  SELECT count(*)
  INTO v_active_team_count
  FROM public.team_event_registration registration
  WHERE registration.event_id = NEW.event_id
    AND registration.state IN ('pending', 'approved')
    AND (TG_OP = 'INSERT' OR registration.id <> NEW.id);

  IF v_active_team_count >= COALESCE(v_max_team_count, 2) THEN
    RAISE EXCEPTION 'VERSUS_TEAM_SLOTS_FULL';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_versus_team_registration_limit
  ON public.team_event_registration;
CREATE TRIGGER enforce_versus_team_registration_limit
BEFORE INSERT OR UPDATE OF event_id, state
ON public.team_event_registration
FOR EACH ROW
EXECUTE FUNCTION public.enforce_versus_team_registration_limit();

CREATE OR REPLACE FUNCTION public.enforce_team_only_event_assistant()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_registration_mode TEXT;
BEGIN
  SELECT event_row.registration_mode
  INTO v_registration_mode
  FROM public.event event_row
  WHERE event_row.id = NEW.event;

  IF v_registration_mode = 'team'
     AND lower(COALESCE(NEW.state, '')) IN ('pending', 'approved')
     AND NEW.team_event_registration_id IS NULL THEN
    RAISE EXCEPTION 'TEAM_ONLY_EVENT';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_team_only_event_assistant ON public.assistants;
CREATE TRIGGER enforce_team_only_event_assistant
BEFORE INSERT OR UPDATE OF event, team_event_registration_id, state
ON public.assistants
FOR EACH ROW
EXECUTE FUNCTION public.enforce_team_only_event_assistant();

COMMENT ON COLUMN public.event.registration_mode IS
  'Modo de inscripción: individual, team (Versus de equipos) o both.';
COMMENT ON COLUMN public.event.team_registration_max_teams IS
  'Cantidad máxima de equipos que pueden reservar un lugar en un evento por equipos.';
COMMENT ON FUNCTION public.enforce_versus_team_registration_limit() IS
  'Limita las inscripciones activas al número de equipos configurado en el evento.';
COMMENT ON FUNCTION public.enforce_team_event_conversion_consistency() IS
  'Impide configurar un Versus con inscripciones individuales o más equipos activos que lugares disponibles.';
