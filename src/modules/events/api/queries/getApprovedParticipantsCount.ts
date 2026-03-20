import { getServerSupabase } from '@core/api/supabase.server';
import { log } from '@core/lib/logger';

function normalizeEventId(value: unknown) {
  return String(value ?? '').trim();
}

export async function getApprovedParticipantsCountByEventIds(
  eventIds: Array<string | number>,
  supabaseClient?: any
) {
  const normalizedEventIds = Array.from(
    new Set(eventIds.map((eventId) => normalizeEventId(eventId)).filter((eventId) => eventId.length > 0))
  );
  const countByEventId = new Map<string, number>();

  if (!normalizedEventIds.length) return countByEventId;

  const supabase = supabaseClient ?? (await getServerSupabase());
  const { data, error } = await supabase
    .from('assistants')
    .select('event')
    .eq('state', 'approved')
    .in('event', normalizedEventIds as any);

  if (error) {
    log.database('SELECT approved participants by events', 'assistants', error, {
      eventIds: normalizedEventIds,
    });
    return countByEventId;
  }

  (data ?? []).forEach((assistant: any) => {
    const eventId = normalizeEventId(assistant?.event);
    if (!eventId) return;
    countByEventId.set(eventId, (countByEventId.get(eventId) ?? 0) + 1);
  });

  return countByEventId;
}

export async function getApprovedParticipantsCountByEventId(eventId: string | number, supabaseClient?: any) {
  const countByEventId = await getApprovedParticipantsCountByEventIds([eventId], supabaseClient);
  return countByEventId.get(normalizeEventId(eventId)) ?? 0;
}
