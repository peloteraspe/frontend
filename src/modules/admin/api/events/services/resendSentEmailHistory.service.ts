import 'server-only';

import { randomUUID } from 'node:crypto';

import { log } from '@core/lib/logger';

export type ResendSentEmailHistoryItem = {
  id: string;
  createdAt: string;
  from: string;
  to: string[];
  subject: string;
  lastEvent: string;
  canRetryBounced: boolean;
  retryDisabledReason: string | null;
};

export type ResendSentEmailHistoryResult = {
  items: ResendSentEmailHistoryItem[];
  hasMore: boolean;
  limit: number;
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

type ResendRetrieveEmailResponse = {
  id?: string;
  to?: string[] | string | null;
  from?: string | null;
  created_at?: string;
  subject?: string | null;
  html?: string | null;
  text?: string | null;
  bcc?: string[] | string | null;
  cc?: string[] | string | null;
  reply_to?: string[] | string | null;
  last_event?: string | null;
};

type ResendSendEmailResponse = {
  id?: string;
};

const DEFAULT_HISTORY_LIMIT = 100;
const MAX_HISTORY_LIMIT = 100;
const MAX_SEND_ATTEMPTS = 4;
const INITIAL_BACKOFF_MS = 400;
const MAX_BACKOFF_MS = 5000;

function normalizeSender(value: string) {
  return String(value || '').trim().toLowerCase();
}

function isPeloterasSender(from: string) {
  const configuredFrom = normalizeSender(process.env.EMAIL_FROM || process.env.RESEND_FROM || 'Peloteras <contacto@peloteras.com>');
  const sender = normalizeSender(from);
  return sender === configuredFrom || sender.includes('contacto@peloteras.com');
}

function normalizeEvent(value: string | null | undefined) {
  return String(value || '').trim().toLowerCase();
}

function normalizeEmailList(value: string[] | string | null | undefined) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }

  const normalized = String(value || '').trim();
  return normalized ? [normalized] : [];
}

function getRetryDisabledReason(lastEvent: string, recipients: string[]) {
  const normalizedEvent = normalizeEvent(lastEvent);
  if (normalizedEvent === 'complained' || normalizedEvent === 'complaint') {
    return 'No se puede reenviar porque la destinataria reportó ese correo.';
  }

  if (normalizedEvent === 'suppressed') {
    return 'Resend lo suprimió por un rebote o spam previo. Revisa la suppression list antes de reenviar.';
  }

  if (normalizedEvent === 'delivery_delayed') {
    return 'Resend todavía lo tiene en cola o con entrega demorada. Espera antes de reenviarlo.';
  }

  if (normalizedEvent === 'failed') {
    return 'Resend marcó este envío como fallido. Desde este histórico no hay detalle por destinataria para reintentar de forma segura.';
  }

  if (normalizedEvent === 'canceled') {
    return 'Ese correo fue cancelado y no aplica reenvío desde este historial.';
  }

  if (normalizedEvent !== 'bounced') {
    return 'Solo se puede reenviar cuando Resend lo marcó como rebotado.';
  }

  if (recipients.length !== 1) {
    return 'Solo se puede reenviar cuando el correo tuvo una sola destinataria.';
  }

  return null;
}

function getResendApiKey() {
  return String(process.env.RESEND_API_KEY || '').trim();
}

function sanitizeHistoryLimit(limit?: number) {
  const numericLimit = Number(limit);
  if (!Number.isFinite(numericLimit)) return DEFAULT_HISTORY_LIMIT;

  return Math.min(Math.max(Math.floor(numericLimit), 1), MAX_HISTORY_LIMIT);
}

function resolveRetryFrom(originalFrom: string) {
  const configuredFrom = String(process.env.EMAIL_FROM || process.env.RESEND_FROM || '').trim();
  return configuredFrom || String(originalFrom || '').trim();
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

async function fetchResendEmailDetails(input: { apiKey: string; emailId: string }) {
  const response = await fetch(`https://api.resend.com/emails/${input.emailId}`, {
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

  return (await response.json().catch(() => ({}))) as ResendRetrieveEmailResponse;
}

function safeJsonParse<T>(value: string) {
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function getErrorMessage(details: string, status: number) {
  const parsed = safeJsonParse<{ message?: string; error?: string }>(details);
  if (parsed?.message?.trim()) return parsed.message.trim();
  if (parsed?.error?.trim()) return parsed.error.trim();

  const message = String(details || '').trim();
  return message || `Resend respondió con ${status}.`;
}

function parseRetryAfterMs(value: string | null) {
  if (!value) return null;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.max(Math.ceil(seconds * 1000), 1000);
  }

  const timestamp = Date.parse(value);
  if (Number.isFinite(timestamp)) {
    return Math.max(timestamp - Date.now(), 1000);
  }

  return null;
}

function getRetryDelayMs(attempt: number, retryAfterHeader: string | null) {
  const retryAfterMs = parseRetryAfterMs(retryAfterHeader);
  if (retryAfterMs !== null) return retryAfterMs;

  const exponentialDelay = Math.min(INITIAL_BACKOFF_MS * 2 ** (attempt - 1), MAX_BACKOFF_MS);
  const jitterMs = Math.floor(Math.random() * 250);
  return exponentialDelay + jitterMs;
}

function isRetryableStatus(status: number) {
  return status === 429 || status >= 500;
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendResendEmail(input: {
  apiKey: string;
  emailId: string;
  payload: {
    from: string;
    to: string[];
    subject: string;
    html?: string;
    text?: string;
    cc?: string[];
    bcc?: string[];
    reply_to?: string;
  };
}) {
  const idempotencyKey = `resend-history-${input.emailId}-${randomUUID()}`;

  for (let attempt = 1; attempt <= MAX_SEND_ATTEMPTS; attempt += 1) {
    let response: Response;

    try {
      response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(input.payload),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error || 'Unknown error');
      if (attempt >= MAX_SEND_ATTEMPTS) {
        throw new Error(reason);
      }

      const delayMs = getRetryDelayMs(attempt, null);
      log.warn('Retrying bounced Resend email after network error', 'EMAIL', {
        emailId: input.emailId,
        attempt,
        delayMs,
        reason,
      });
      await wait(delayMs);
      continue;
    }

    const details = await response.text().catch(() => '');
    if (!response.ok) {
      const reason = getErrorMessage(details, response.status);
      if (isRetryableStatus(response.status) && attempt < MAX_SEND_ATTEMPTS) {
        const delayMs = getRetryDelayMs(attempt, response.headers.get('Retry-After'));
        log.warn('Retrying bounced Resend email after provider response', 'EMAIL', {
          emailId: input.emailId,
          attempt,
          delayMs,
          status: response.status,
          reason,
        });
        await wait(delayMs);
        continue;
      }

      throw new Error(reason);
    }

    const parsed = safeJsonParse<ResendSendEmailResponse>(details) ?? {};
    return {
      providerMessageId: String(parsed.id || '').trim() || null,
    };
  }

  throw new Error('No se pudo reenviar el correo rebotado.');
}

export async function getResendSentEmailHistory(input?: {
  limit?: number;
  after?: string | null;
}): Promise<ResendSentEmailHistoryResult> {
  const limit = sanitizeHistoryLimit(input?.limit);
  const initialAfter = String(input?.after || '').trim() || undefined;
  const resendApiKey = getResendApiKey();
  if (!resendApiKey) {
    return {
      items: [],
      hasMore: false,
      limit,
    };
  }

  const results: ResendSentEmailHistoryItem[] = [];
  let after = initialAfter;
  let hasMore = false;

  try {
    while (results.length <= limit) {
      const page = await fetchResendEmailsPage({
        apiKey: resendApiKey,
        limit: 100,
        after,
      });

      if (!page.data.length) break;

      page.data.forEach((email) => {
        const id = String(email.id || '').trim();
        const from = String(email.from || '').trim();
        const recipients = Array.isArray(email.to)
          ? email.to.map((item) => String(item || '').trim()).filter(Boolean)
          : [];
        if (!id || !isPeloterasSender(from)) return;

        const retryDisabledReason = getRetryDisabledReason(String(email.last_event || ''), recipients);

        results.push({
          id,
          createdAt: String(email.created_at || ''),
          from,
          to: recipients,
          subject: String(email.subject || '').trim(),
          lastEvent: String(email.last_event || '').trim() || 'unknown',
          canRetryBounced: retryDisabledReason === null,
          retryDisabledReason,
        });
      });

      if (results.length > limit) {
        hasMore = true;
        break;
      }

      after = String(page.data[page.data.length - 1]?.id || '').trim() || undefined;
      if (!page.hasMore || !after) break;
    }
  } catch (error) {
    log.error('Failed to fetch historical emails from Resend', 'EMAIL', error);
    return {
      items: [],
      hasMore: false,
      limit,
    };
  }

  return {
    items: results.slice(0, limit),
    hasMore,
    limit,
  };
}

export async function retryResendHistoricalEmail(emailId: string) {
  const normalizedEmailId = String(emailId || '').trim();
  if (!normalizedEmailId) {
    throw new Error('No se pudo identificar el correo histórico a reenviar.');
  }

  const resendApiKey = getResendApiKey();
  if (!resendApiKey) {
    throw new Error('No se pudo conectar con Resend en este entorno.');
  }

  const details = await fetchResendEmailDetails({
    apiKey: resendApiKey,
    emailId: normalizedEmailId,
  });

  const recipients = normalizeEmailList(details.to);
  const retryDisabledReason = getRetryDisabledReason(String(details.last_event || ''), recipients);
  if (retryDisabledReason) {
    throw new Error(retryDisabledReason);
  }

  const originalFrom = String(details.from || '').trim();
  if (!isPeloterasSender(originalFrom)) {
    throw new Error('Ese correo no pertenece al remitente configurado para Peloteras.');
  }

  const subject = String(details.subject || '').trim();
  if (!subject) {
    throw new Error('Ese correo histórico no tiene asunto para reenviar.');
  }

  const html = typeof details.html === 'string' ? details.html : '';
  const text = typeof details.text === 'string' ? details.text : '';
  if (!html && !text) {
    throw new Error('Ese correo histórico no tiene contenido para reenviar.');
  }

  const cc = normalizeEmailList(details.cc);
  const bcc = normalizeEmailList(details.bcc);
  const replyTo = normalizeEmailList(details.reply_to)[0];

  const result = await sendResendEmail({
    apiKey: resendApiKey,
    emailId: normalizedEmailId,
    payload: {
      from: resolveRetryFrom(originalFrom),
      to: recipients,
      subject,
      ...(html ? { html } : {}),
      ...(text ? { text } : {}),
      ...(cc.length > 0 ? { cc } : {}),
      ...(bcc.length > 0 ? { bcc } : {}),
      ...(replyTo ? { reply_to: replyTo } : {}),
    },
  });

  return {
    sentCount: 1,
    failedCount: 0,
    providerMessageId: result.providerMessageId,
  };
}
