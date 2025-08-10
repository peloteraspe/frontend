import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

export type Assistant = {
  id: string;
  operationNumber: string;
  state: 'pending' | 'approved' | 'rejected';
  event: string; // event id
  user: string; // user id
};

export type AssistantDetails = Assistant & {
  eventTitle?: string;
  eventDate?: string;
  eventPrice?: number | string;
  userName?: string;
};

export type AssistantsQuery = {
  search?: string; // matches operationNumber
  limit?: number;
  offset?: number;
};

export async function getAssistants(
  state?: Assistant['state'],
  opts: AssistantsQuery = {}
): Promise<Assistant[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { search, limit, offset } = opts;
  let query = supabase
    .from('assistants')
    .select('id, operationNumber, state, event, user', { count: 'exact' });
  if (state) query = query.eq('state', state);
  if (search && search.trim()) query = query.ilike('operationNumber', `%${search.trim()}%`);
  if (typeof offset === 'number' && typeof limit === 'number') query = query.range(offset, offset + limit - 1);
  const { data, error } = await query.order('id', { ascending: false });
  if (error) {
    console.error('Error fetching assistants:', error.message);
    return [];
  }
  return (data as any) || [];
}

export async function getAssistantsWithDetails(
  state?: Assistant['state'],
  opts: AssistantsQuery = {}
): Promise<AssistantDetails[]> {
  const items = await getAssistants(state, opts);
  if (!items.length) return [];

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const eventIds = Array.from(new Set(items.map((i) => i.event).filter(Boolean)));
  const userIds = Array.from(new Set(items.map((i) => i.user).filter(Boolean)));

  let eventsMap = new Map<string, { id: string; title?: string; formattedDateTime?: string; price?: number | string }>();
  if (eventIds.length) {
    const { data: events } = await supabase
      .from('event')
      .select('id, title, formattedDateTime, price')
      .in('id', eventIds as any);
    (events || []).forEach((e: any) => {
      eventsMap.set(e.id, e);
    });
  }

  let profilesMap = new Map<string, { user: string; username?: string }>();
  if (userIds.length) {
    const { data: profiles } = await supabase
      .from('profile')
      .select('user, username')
      .in('user', userIds as any);
    (profiles || []).forEach((p: any) => {
      profilesMap.set(p.user, p);
    });
  }

  return items.map((a) => {
    const ev = eventsMap.get(a.event);
    const pr = profilesMap.get(a.user);
    return {
      ...a,
      eventTitle: ev?.title,
      eventDate: ev?.formattedDateTime,
      eventPrice: ev?.price,
      userName: pr?.username,
    } as AssistantDetails;
  });
}

export async function getAssistantsCounts() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const countFor = async (state?: Assistant['state']) => {
    let q = supabase.from('assistants').select('*', { count: 'exact', head: true });
    if (state) q = q.eq('state', state);
    const { count } = await q;
    return count || 0;
  };

  const [pending, approved, rejected, all] = await Promise.all([
    countFor('pending'),
    countFor('approved'),
    countFor('rejected'),
    countFor(undefined),
  ]);

  return { pending, approved, rejected, all };
}
