-- TEAM-108: Allow backend service-role writes to evaluate team slug helpers.
-- The team_slug_not_reserved check constraint calls these functions during
-- inserts/updates, including server-side service-role operations.

GRANT EXECUTE ON FUNCTION public.normalize_team_slug(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_reserved_team_slug(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_unique_team_slug(TEXT) TO service_role;
