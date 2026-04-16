import { getServerSupabase } from '@src/core/api/supabase.server';
import { getAdminSupabase } from '@src/core/api/supabase.admin';
import { log } from '@src/core/lib/logger';
import {
  normalizeCouponReimbursementStatus,
  type CouponReimbursementStatus,
} from '@modules/payments/lib/couponReimbursement';

export type Assistant = {
  id: string;
  operationNumber: string;
  state: 'pending' | 'approved' | 'rejected';
  event: string; // event id
  user: string; // user id
  created_at: string;
};

export type CouponRedemptionInfo = {
  redemptionId: number;
  couponCode: string;
  discountApplied: number;
  reimbursementStatus: CouponReimbursementStatus;
};

export type AssistantDetails = Assistant & {
  eventTitle?: string;
  eventDate?: string;
  eventPrice?: number | string;
  userName?: string;
  coupon?: CouponRedemptionInfo;
};

export type AssistantsQuery = {
  search?: string; // matches operationNumber
  eventId?: string | number;
  limit?: number;
  offset?: number;
};

const DEFAULT_TIMEZONE = 'America/Lima';

function normalizeId(value: unknown) {
  return String(value ?? '').trim();
}

function formatEventDateTime(startTime: unknown, endTime: unknown) {
  if (!startTime) return undefined;
  const start = new Date(String(startTime));
  if (Number.isNaN(start.getTime())) return undefined;

  const end = endTime ? new Date(String(endTime)) : null;
  const timeFormatter = new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: DEFAULT_TIMEZONE,
  });

  if (!end || Number.isNaN(end.getTime())) {
    return timeFormatter.format(start);
  }

  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  if (sameDay) {
    const dayFormatter = new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: DEFAULT_TIMEZONE,
    });
    const hourFormatter = new Intl.DateTimeFormat('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: DEFAULT_TIMEZONE,
    });
    return `${dayFormatter.format(start)} ${hourFormatter.format(start)} - ${hourFormatter.format(end)}`;
  }

  return `${timeFormatter.format(start)} - ${timeFormatter.format(end)}`;
}

export async function getAssistants(eventId: string) {
  // Await cookies() to get the actual cookies object
  const supabase = await getServerSupabase();

  const { data, error } = await supabase.from('assistants').select('*').eq('event', eventId);

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
  const supabaseDetails = await getServerSupabase();
  const normalizedSearch = String(opts.search || '').trim();
  const normalizedEventId = normalizeId(opts.eventId);
  const hasSearch = normalizedSearch.length > 0;
  const numericSearch = normalizedSearch.replace(/\D+/g, '');

  let query = supabaseDetails.from('assistants').select('*');
  if (state) query = query.eq('state', state);
  if (normalizedEventId) query = query.eq('event', normalizedEventId);
  if (!hasSearch && opts.limit) query = query.limit(opts.limit);
  if (!hasSearch && opts.offset) query = query.range(opts.offset, opts.offset + (opts.limit || 10) - 1);
  if (hasSearch) query = query.limit(2000);

  const { data: rawItems, error } = await query;

  if (error) {
    log.database('SELECT assistants with details', 'assistants', error, { state, opts, normalizedEventId });
    return [];
  }

  let items = (rawItems as any[]) || [];

  if (hasSearch) {
    items = items.filter((item) => {
      const operation = String(item?.operationNumber ?? '').trim();
      if (!operation) return false;
      if (numericSearch) return operation.includes(numericSearch);
      return operation.toLowerCase().includes(normalizedSearch.toLowerCase());
    });

    const offset = Math.max(0, Number(opts.offset || 0));
    const limit = Math.max(1, Number(opts.limit || 50));
    items = items.slice(offset, offset + limit);
  }

  if (!items.length) return [];

  const eventIds = Array.from(
    new Set(items.map((i) => normalizeId(i.event)).filter((value) => value.length > 0))
  );
  const userIds = Array.from(
    new Set(items.map((i) => normalizeId(i.user)).filter((value) => value.length > 0))
  );

  let eventsMap = new Map<
    string,
    { id: string; title?: string; formattedDateTime?: string; price?: number | string }
  >();
  if (eventIds.length) {
    const { data: events } = await supabaseDetails
      .from('event')
      .select('id, title, start_time, end_time, price')
      .in('id', eventIds as any);
    (events || []).forEach((e: any) => {
      const eventId = normalizeId(e.id);
      if (!eventId) return;
      eventsMap.set(eventId, {
        id: eventId,
        title: typeof e.title === 'string' ? e.title : undefined,
        formattedDateTime: formatEventDateTime(e.start_time, e.end_time),
        price: e.price,
      });
    });
  }

  let profilesMap = new Map<string, { user: string; username?: string }>();
  if (userIds.length) {
    const { data: profiles } = await supabaseDetails
      .from('profile')
      .select('user, username')
      .in('user', userIds as any);
    (profiles || []).forEach((p: any) => {
      const userId = normalizeId(p.user);
      if (!userId) return;
      profilesMap.set(userId, {
        user: userId,
        username: typeof p.username === 'string' ? p.username : undefined,
      });
    });
  }

  // Fetch coupon redemptions for these assistants (uses admin client to bypass RLS)
  const admin = getAdminSupabase();
  const assistantIds = items.map((i) => Number(i.id)).filter((id) => Number.isFinite(id) && id > 0);
  let couponMap = new Map<number, CouponRedemptionInfo>();
  if (assistantIds.length) {
    const { data: redemptions, error: redemptionsError } = await admin
      .from('coupon_redemption')
      .select('id, assistant_id, discount_applied, reimbursement_status, coupon_id')
      .in('assistant_id', assistantIds);

    if (redemptionsError) {
      log.warn('Could not fetch coupon_redemptions (table may not exist yet)', 'ADMIN_PAYMENTS', {
        errorMessage: redemptionsError.message,
        assistantIds: assistantIds.slice(0, 5),
      });
    }

    if (redemptions && redemptions.length > 0) {
      const couponIds = Array.from(new Set(redemptions.map((r: any) => Number(r.coupon_id)).filter(Boolean)));
      let couponCodesMap = new Map<number, string>();
      if (couponIds.length) {
        const { data: coupons } = await admin
          .from('coupon')
          .select('id, code')
          .in('id', couponIds);
        (coupons || []).forEach((c: any) => {
          couponCodesMap.set(Number(c.id), String(c.code || ''));
        });
      }

      (redemptions as any[]).forEach((r) => {
        const assistantId = Number(r.assistant_id);
        if (!assistantId) return;
        couponMap.set(assistantId, {
          redemptionId: Number(r.id),
          couponCode: couponCodesMap.get(Number(r.coupon_id)) || '',
          discountApplied: Number(r.discount_applied),
          reimbursementStatus: normalizeCouponReimbursementStatus(r.reimbursement_status),
        });
      });
    }
  }

  return items.map((a) => {
    const ev = eventsMap.get(normalizeId(a.event));
    const pr = profilesMap.get(normalizeId(a.user));
    const cp = couponMap.get(Number(a.id));
    return {
      ...a,
      eventTitle: ev?.title,
      eventDate: ev?.formattedDateTime,
      eventPrice: ev?.price,
      userName: pr?.username,
      coupon: cp,
    } as AssistantDetails;
  });
}

export async function getAssistantsCounts(opts: { eventId?: string | number } = {}) {
  const supabaseCounts = await getServerSupabase();
  const normalizedEventId = normalizeId(opts.eventId);

  const countFor = async (state?: Assistant['state']) => {
    let q = supabaseCounts.from('assistants').select('*', { count: 'exact', head: true });
    if (state) q = q.eq('state', state);
    if (normalizedEventId) q = q.eq('event', normalizedEventId);
    const { count, error } = await q;

    if (error) {
      log.database('COUNT assistants', 'assistants', error, { state, normalizedEventId });
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
