import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { log } from "@/lib/logger";

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

export async function getAssistants(eventId: string) {
  // Await cookies() to get the actual cookies object
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase
    .from('assistants')
    .select('*')
    .eq('event', eventId);

  if (error) {
    log.database('SELECT assistants', 'assistants', error, { eventId });
    return [];
  }

  return (data as any) || [];
}

export async function getAssistantsWithDetails(
  state?: Assistant['state'],
  opts: AssistantsQuery = {}
): Promise<AssistantDetails[]> {
  // Note: This function needs to be updated to use proper getAssistants call
  const cookieStoreDetails = await cookies();
  const supabaseDetails = createClient(cookieStoreDetails);
  
  let query = supabaseDetails.from('assistants').select('*');
  if (state) query = query.eq('state', state);
  if (opts.search) query = query.ilike('operationNumber', `%${opts.search}%`);
  if (opts.limit) query = query.limit(opts.limit);
  if (opts.offset) query = query.range(opts.offset, opts.offset + (opts.limit || 10) - 1);
  
  const { data: items, error } = await query;
  
  if (error) {
    log.database('SELECT assistants with details', 'assistants', error, { state, opts });
    return [];
  }
  
  if (!items || !items.length) return [];

  const eventIds = Array.from(new Set(items.map((i) => i.event).filter(Boolean)));
  const userIds = Array.from(new Set(items.map((i) => i.user).filter(Boolean)));

  let eventsMap = new Map<string, { id: string; title?: string; formattedDateTime?: string; price?: number | string }>();
  if (eventIds.length) {
    const { data: events } = await supabaseDetails
      .from('event')
      .select('id, title, formattedDateTime, price')
      .in('id', eventIds as any);
    (events || []).forEach((e: any) => {
      eventsMap.set(e.id, e);
    });
  }

  let profilesMap = new Map<string, { user: string; username?: string }>();
  if (userIds.length) {
    const { data: profiles } = await supabaseDetails
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
  const cookieStoreCounts = await cookies();
  const supabaseCounts = createClient(cookieStoreCounts);

  const countFor = async (state?: Assistant['state']) => {
    let q = supabaseCounts.from('assistants').select('*', { count: 'exact', head: true });
    if (state) q = q.eq('state', state);
    const { count, error } = await q;
    
    if (error) {
      log.database('COUNT assistants', 'assistants', error, { state });
      return 0;
    }
    
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
