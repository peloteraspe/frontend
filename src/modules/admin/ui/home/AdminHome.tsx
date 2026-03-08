import { getServerSupabase } from '@core/api/supabase.server';
import { isSuperAdmin } from '@shared/lib/auth/isAdmin';
import { getIsoDateInTimeZone } from '@shared/lib/dateTime';
import AdminSummaryCharts, { type AdminSummaryChartsData } from './AdminSummaryCharts';

type EventRow = {
  id: number | string;
  created_at?: string | null;
  start_time?: string | null;
  level?: number | null;
  created_by_id?: string | null;
};

type AssistantRow = {
  created_at?: string | null;
  state?: string | null;
  event?: number | null;
};

type PaymentMethodRow = {
  created_at?: string | null;
  type?: string | null;
  is_active?: boolean | null;
};

type ProfileRow = {
  created_at?: string | null;
  is_profile_complete?: boolean | null;
  onboarding_step?: number | null;
};

type LevelRow = {
  id: number;
  name: string;
};

const DEFAULT_TIMEZONE = 'America/Lima';
const WEEKS_WINDOW = 8;
const MONTHS_WINDOW = 6;

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function parseFiniteNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function subtractDays(isoDate: string, days: number) {
  const base = new Date(`${isoDate}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() - days);
  return base.toISOString().slice(0, 10);
}

function weekStartFromIsoDate(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  const day = date.getUTCDay();
  const daysFromMonday = (day + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysFromMonday);
  return date.toISOString().slice(0, 10);
}

function buildRecentWeekStarts(count: number) {
  const todayIso = getIsoDateInTimeZone(new Date(), DEFAULT_TIMEZONE) || new Date().toISOString().slice(0, 10);
  const currentWeekStart = weekStartFromIsoDate(todayIso);
  return Array.from({ length: count }, (_, index) =>
    subtractDays(currentWeekStart, (count - index - 1) * 7)
  );
}

function formatWeekLabel(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  })
    .format(date)
    .replace('.', '');
}

function monthKeyFromDate(value: string | Date | null | undefined) {
  const iso = getIsoDateInTimeZone(value, DEFAULT_TIMEZONE);
  return iso ? iso.slice(0, 7) : null;
}

function buildRecentMonthKeys(count: number) {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (count - index - 1), 1));
    const key = `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`;
    const label = new Intl.DateTimeFormat('es-PE', { month: 'short', timeZone: 'UTC' })
      .format(d)
      .replace('.', '');
    return { key, label };
  });
}

function toBreakdownEntries(counts: Map<string, number>) {
  const entries = Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  return entries.length > 0 ? entries : [{ name: 'Sin datos', value: 0 }];
}

function normalizePaymentMethodType(value: string | null | undefined) {
  const raw = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace('/', '_');

  if (raw.includes('yape') && raw.includes('plin')) return 'Yape / Plin';
  if (raw.includes('plin')) return 'Plin';
  if (raw.includes('yape')) return 'Yape';
  return 'Otro';
}

function normalizeAssistantState(value: string | null | undefined) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'approved') return 'Aprobados';
  if (raw === 'rejected') return 'Rechazados';
  return 'Pendientes';
}

function buildWeeklyTrend(
  rows: Array<{ created_at?: string | null }>,
  count = WEEKS_WINDOW
) {
  const weekStarts = buildRecentWeekStarts(count);
  const counts = new Map<string, number>();
  weekStarts.forEach((start) => counts.set(start, 0));

  rows.forEach((row) => {
    const iso = getIsoDateInTimeZone(row.created_at, DEFAULT_TIMEZONE);
    if (!iso) return;
    const weekStart = weekStartFromIsoDate(iso);
    if (!counts.has(weekStart)) return;
    counts.set(weekStart, (counts.get(weekStart) || 0) + 1);
  });

  return weekStarts.map((start) => ({
    label: formatWeekLabel(start),
    value: counts.get(start) || 0,
  }));
}

function buildMonthlyTrend(
  rows: Array<{ created_at?: string | null }>,
  count = MONTHS_WINDOW
) {
  const months = buildRecentMonthKeys(count);
  const monthSet = new Set(months.map((month) => month.key));
  const counts = new Map<string, number>();
  months.forEach((month) => counts.set(month.key, 0));

  rows.forEach((row) => {
    const monthKey = monthKeyFromDate(row.created_at);
    if (!monthKey || !monthSet.has(monthKey)) return;
    counts.set(monthKey, (counts.get(monthKey) || 0) + 1);
  });

  return months.map((month) => ({
    label: month.label,
    value: counts.get(month.key) || 0,
  }));
}

export default async function AdminHome() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const canViewUsersModule = isSuperAdmin(user as any);
  const userId = String(user?.id || '');

  const [eventsResult, levelsResult, paymentMethodsResult, profilesResult] = await Promise.all([
    (async () => {
      let query = supabase.from('event').select('id,created_at,start_time,level,created_by_id');
      if (!canViewUsersModule && userId) {
        query = query.eq('created_by_id', userId);
      }
      const { data } = await query;
      return (data ?? []) as EventRow[];
    })(),
    (async () => {
      const { data } = await supabase.from('level').select('id,name');
      return (data ?? []) as LevelRow[];
    })(),
    (async () => {
      if (!userId) return [] as PaymentMethodRow[];
      const { data } = await supabase
        .from('paymentMethod')
        .select('created_at,type,is_active')
        .eq('created_by', userId);
      return (data ?? []) as PaymentMethodRow[];
    })(),
    (async () => {
      if (!canViewUsersModule) return [] as ProfileRow[];
      const { data } = await supabase
        .from('profile')
        .select('created_at,is_profile_complete,onboarding_step');
      return (data ?? []) as ProfileRow[];
    })(),
  ]);

  const eventIds = eventsResult
    .map((row) => parseFiniteNumber(row.id))
    .filter((id): id is number => Number.isInteger(id) && id > 0);

  const assistantsResult = canViewUsersModule
    ? (((await supabase.from('assistants').select('created_at,state,event')).data ?? []) as AssistantRow[])
    : eventIds.length > 0
    ? (((await supabase
        .from('assistants')
        .select('created_at,state,event')
        .in('event', eventIds)).data ?? []) as AssistantRow[])
    : [];

  const levelById = new Map<number, string>();
  levelsResult.forEach((level) => {
    const id = parseFiniteNumber(level.id);
    const name = String(level.name || '').trim();
    if (id && name) levelById.set(id, name);
  });

  const nowTs = Date.now();
  const upcomingEvents = eventsResult.filter((event) => {
    const startTs = new Date(String(event.start_time || '')).getTime();
    return Number.isFinite(startTs) && startTs >= nowTs;
  }).length;

  const finishedEvents = eventsResult.filter((event) => {
    const startTs = new Date(String(event.start_time || '')).getTime();
    return Number.isFinite(startTs) && startTs < nowTs;
  }).length;

  const eventLevelCounts = new Map<string, number>();
  eventsResult.forEach((event) => {
    const levelId = parseFiniteNumber(event.level);
    const levelName = levelId ? levelById.get(levelId) || 'Sin nivel' : 'Sin nivel';
    eventLevelCounts.set(levelName, (eventLevelCounts.get(levelName) || 0) + 1);
  });

  const paymentStateCounts = new Map<string, number>([
    ['Pendientes', 0],
    ['Aprobados', 0],
    ['Rechazados', 0],
  ]);
  assistantsResult.forEach((assistant) => {
    const state = normalizeAssistantState(assistant.state);
    paymentStateCounts.set(state, (paymentStateCounts.get(state) || 0) + 1);
  });

  const paymentMethodTypeCounts = new Map<string, number>();
  paymentMethodsResult.forEach((method) => {
    const type = normalizePaymentMethodType(method.type);
    paymentMethodTypeCounts.set(type, (paymentMethodTypeCounts.get(type) || 0) + 1);
  });

  const activeMethods = paymentMethodsResult.filter((method) => method.is_active !== false).length;
  const inactiveMethods = Math.max(0, paymentMethodsResult.length - activeMethods);

  const completeProfiles = profilesResult.filter((profile) => {
    const onboardingStep = parseFiniteNumber(profile.onboarding_step) || 0;
    return profile.is_profile_complete === true || onboardingStep >= 2;
  }).length;
  const incompleteProfiles = Math.max(0, profilesResult.length - completeProfiles);

  const summaryData: AdminSummaryChartsData = {
    events: {
      total: eventsResult.length,
      upcoming: upcomingEvents,
      finished: finishedEvents,
      trend: buildWeeklyTrend(eventsResult.map((row) => ({ created_at: row.created_at }))),
      levelDistribution: toBreakdownEntries(eventLevelCounts),
    },
    payments: {
      total: assistantsResult.length,
      pending: paymentStateCounts.get('Pendientes') || 0,
      approved: paymentStateCounts.get('Aprobados') || 0,
      rejected: paymentStateCounts.get('Rechazados') || 0,
      trend: buildWeeklyTrend(assistantsResult.map((row) => ({ created_at: row.created_at }))),
      stateDistribution: toBreakdownEntries(paymentStateCounts),
    },
    paymentMethods: {
      total: paymentMethodsResult.length,
      active: activeMethods,
      inactive: inactiveMethods,
      typeDistribution: toBreakdownEntries(paymentMethodTypeCounts),
      statusDistribution: [
        { name: 'Activos', value: activeMethods },
        { name: 'Inactivos', value: inactiveMethods },
      ],
    },
    ...(canViewUsersModule
      ? {
          users: {
            total: profilesResult.length,
            complete: completeProfiles,
            incomplete: incompleteProfiles,
            trend: buildMonthlyTrend(profilesResult.map((row) => ({ created_at: row.created_at }))),
            completionDistribution: [
              { name: 'Completos', value: completeProfiles },
              { name: 'Incompletos', value: incompleteProfiles },
            ],
          },
        }
      : {}),
  };

  return (
    <AdminSummaryCharts data={summaryData} />
  );
}
