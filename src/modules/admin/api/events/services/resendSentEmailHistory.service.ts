import 'server-only';

import { getAdminSupabase } from '@core/api/supabase.admin';
import { log } from '@core/lib/logger';

export type ResendSentEmailHistoryItem = {
  id: string;
  createdAt: string;
  from: string;
  to: string[];
  subject: string;
  lastEvent: string;
};

type ResendListEmailsResponse = {
  object?: string;
  has_more?: boolean;
  data?: Array<{
    id?: string;
    to?: string[];
    from?: string;
    created_at?: string;
    subject?: string;
    last_event?: string;
  }>;
};

async function getKnownProviderIds() {
  try {
    const adminSupabase = getAdminSupabase();
    const { data, error } = await adminSupabase
      .from('event_announcement_recipient')
      .select('provider_message_id')
      .not('provider_message_id', 'is', null)
      .limit(1000);

    if (error) {
      log.database('SELECT known provider ids', 'event_announcement_recipient', error);
      return new Set<string>();
    }

    return new Set(
      ((data ?? []) as Array<{ provider_message_id: string | null }>)
        .map((row) => String(row.provider_message_id || '').trim())
        .filter(Boolean)
    );
  } catch (error) {
    log.error('Failed to load known provider ids for Resend history', 'EMAIL', error);
    return new Set<string>();
  }
}

function normalizeSender(value: string) {
  return String(value || '').trim().toLowerCase();
}

function isPeloterasSender(from: string) {
  const configuredFrom = normalizeSender(process.env.EMAIL_FROM || process.env.RESEND_FROM || 'Peloteras <contacto@peloteras.com>');
  const sender = normalizeSender(from);
  return sender === configuredFrom || sender.includes('contacto@peloteras.com');
}

async function fetchResendEmailsPage(input: { apiKey: string; limit: number; after?: string }) {
  const params = new URLSearchParams();
  params.set('limit', String(input.limit));
  if (input.after) params.set('after', input.after);

  const response = await fetch(`https://api.resend.com/emails?${params.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(String(details || `Resend respondió con ${response.status}.`).trim());
  }

  const payload = (await response.json().catch(() => ({}))) as ResendListEmailsResponse;
  return {
    hasMore: Boolean(payload.has_more),
    data: Array.isArray(payload.data) ? payload.data : [],
  };
}

export async function getResendSentEmailHistory(limit = 150): Promise<ResendSentEmailHistoryItem[]> {
  const resendApiKey = String(process.env.RESEND_API_KEY || '').trim();
  if (!resendApiKey) return [];

  const knownProviderIds = await getKnownProviderIds();
  const results: ResendSentEmailHistoryItem[] = [];
  let after: string | undefined;

  try {
    while (results.length < limit) {
      const remaining = Math.min(limit - results.length, 100);
      const page = await fetchResendEmailsPage({
        apiKey: resendApiKey,
        limit: remaining,
        after,
      });

      if (!page.data.length) break;

      page.data.forEach((email) => {
        const id = String(email.id || '').trim();
        const from = String(email.from || '').trim();
        if (!id || knownProviderIds.has(id) || !isPeloterasSender(from)) return;

        results.push({
          id,
          createdAt: String(email.created_at || ''),
          from,
          to: Array.isArray(email.to) ? email.to.map((item) => String(item || '').trim()).filter(Boolean) : [],
          subject: String(email.subject || '').trim(),
          lastEvent: String(email.last_event || '').trim() || 'unknown',
        });
      });

      after = String(page.data[page.data.length - 1]?.id || '').trim() || undefined;
      if (!page.hasMore || !after) break;
    }
  } catch (error) {
    log.error('Failed to fetch historical emails from Resend', 'EMAIL', error);
    return [];
  }

  return results.slice(0, limit);
}
