-- Consolida formatos duplicados, conserva las referencias de los eventos y
-- garantiza que los formatos base existan una sola vez.

WITH duplicate_event_types AS (
  SELECT
    id,
    min(id) OVER (
      PARTITION BY lower(regexp_replace(btrim(name), '[[:space:]]+', ' ', 'g'))
    ) AS canonical_id
  FROM public."eventType"
  WHERE name IS NOT NULL AND btrim(name) <> ''
)
UPDATE public.event event_row
SET "EventType" = duplicate_event_types.canonical_id
FROM duplicate_event_types
WHERE event_row."EventType" = duplicate_event_types.id
  AND duplicate_event_types.id <> duplicate_event_types.canonical_id;

WITH duplicate_event_types AS (
  SELECT
    id,
    min(id) OVER (
      PARTITION BY lower(regexp_replace(btrim(name), '[[:space:]]+', ' ', 'g'))
    ) AS canonical_id
  FROM public."eventType"
  WHERE name IS NOT NULL AND btrim(name) <> ''
)
DELETE FROM public."eventType" event_type
USING duplicate_event_types
WHERE event_type.id = duplicate_event_types.id
  AND duplicate_event_types.id <> duplicate_event_types.canonical_id;

CREATE UNIQUE INDEX IF NOT EXISTS event_type_normalized_name_key
  ON public."eventType" (
    lower(regexp_replace(btrim(name), '[[:space:]]+', ' ', 'g'))
  )
  WHERE name IS NOT NULL AND btrim(name) <> '';

INSERT INTO public."eventType" (name)
SELECT default_name
FROM unnest(ARRAY['Pichanga libre', 'Versus de equipos']::text[]) AS default_name
WHERE NOT EXISTS (
  SELECT 1
  FROM public."eventType" event_type
  WHERE lower(regexp_replace(btrim(event_type.name), '[[:space:]]+', ' ', 'g')) =
        lower(regexp_replace(btrim(default_name), '[[:space:]]+', ' ', 'g'))
)
ON CONFLICT DO NOTHING;
