-- KAN-15: optional business organizer link for events

ALTER TABLE public.event
  ADD COLUMN IF NOT EXISTS organizer_id UUID REFERENCES public.organizers(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS event_organizer_id_idx
  ON public.event (organizer_id)
  WHERE organizer_id IS NOT NULL;
