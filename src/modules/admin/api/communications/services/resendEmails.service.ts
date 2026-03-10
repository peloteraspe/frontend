import 'server-only';

import { log } from '@core/lib/logger';

const DEFAULT_RESEND_EMAILS_LIMIT = 100;
const MAX_RESEND_EMAILS_LIMIT = 100;

type ResendListEmailResponseItem = {
  id?: string;
  from?: string;
  to?: string[] | string | null;
  cc?: string[] | string | null;
  bcc?: string[] | string | null;
  reply_to?: string[] | string | null;
  subject?: string;
  created_at?: string;
  last_event?: string | null;
};

type ResendListEmailsResponse = {
  data?: ResendListEmailResponseItem[];
  has_more?: boolean;
  message?: string;
  error?: string;
};

export type ResendEmailListItem = {
  id: string;
  from: string;
  to: string[];
  cc: string[];
  bcc: string[];
  replyTo: string[];
  subject: string;
  createdAt: string;
  lastEvent: string | null;
};

export type ResendEmailListResult = {
  emails: ResendEmailListItem[];
  hasMore: boolean;
  limit: number;
  errorMessage: string | null;
};

function parseJson<T>(value: string) {
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function sanitizeLimit(limit?: number) {
  const numericLimit = Number(limit);
  if (!Number.isFinite(numericLimit)) return DEFAULT_RESEND_EMAILS_LIMIT;

  return Math.min(Math.max(Math.floor(numericLimit), 1), MAX_RESEND_EMAILS_LIMIT);
}

function normalizeCursor(value?: string | null) {
  const normalizedValue = String(value || '').trim();
  return normalizedValue || null;
}

function normalizeStringList(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry || '').trim())
      .filter(Boolean);
  }

  const normalizedValue = String(value || '').trim();
  return normalizedValue ? [normalizedValue] : [];
}

function getResendErrorMessage(details: string, fallbackStatus: number) {
  const parsed = parseJson<{ message?: string; error?: string }>(details);
  if (parsed?.message?.trim()) return parsed.message.trim();
  if (parsed?.error?.trim()) return parsed.error.trim();

  const normalizedDetails = String(details || '').trim();
  return normalizedDetails || `Resend respondió con ${fallbackStatus}.`;
}

export async function listResendEmails(params?: {
  after?: string | null;
  limit?: number;
}): Promise<ResendEmailListResult> {
  const limit = sanitizeLimit(params?.limit);
  const after = normalizeCursor(params?.after);
  const resendApiKey = String(process.env.RESEND_API_KEY || '').trim();

  if (!resendApiKey) {
    return {
      emails: [],
      hasMore: false,
      limit,
      errorMessage: 'Falta configurar RESEND_API_KEY para listar correos de Resend.',
    };
  }

  const query = new URLSearchParams();
  query.set('limit', String(limit));
  if (after) query.set('after', after);

  const url = `https://api.resend.com/emails?${query.toString()}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
      },
      cache: 'no-store',
    });
    const responseText = await response.text();

    if (!response.ok) {
      const errorMessage = getResendErrorMessage(responseText, response.status);
      log.error('Failed to list Resend emails', 'ADMIN_COMMUNICATIONS', {
        status: response.status,
        errorMessage,
      });
      return {
        emails: [],
        hasMore: false,
        limit,
        errorMessage: `No se pudo cargar el listado de correos de Resend. ${errorMessage}`,
      };
    }

    const parsed = parseJson<ResendListEmailsResponse>(responseText);
    if (!parsed || !Array.isArray(parsed.data)) {
      return {
        emails: [],
        hasMore: false,
        limit,
        errorMessage: 'Resend devolvió una respuesta inválida al listar correos.',
      };
    }

    return {
      emails: parsed.data.map((email) => ({
        id: String(email.id || '').trim(),
        from: String(email.from || '').trim(),
        to: normalizeStringList(email.to),
        cc: normalizeStringList(email.cc),
        bcc: normalizeStringList(email.bcc),
        replyTo: normalizeStringList(email.reply_to),
        subject: String(email.subject || '').trim(),
        createdAt: String(email.created_at || '').trim(),
        lastEvent: String(email.last_event || '').trim() || null,
      })),
      hasMore: Boolean(parsed.has_more),
      limit,
      errorMessage: null,
    };
  } catch (error) {
    log.error('Unexpected error listing Resend emails', 'ADMIN_COMMUNICATIONS', error, {
      after,
      limit,
    });
    return {
      emails: [],
      hasMore: false,
      limit,
      errorMessage: 'Ocurrió un error inesperado al consultar los correos de Resend.',
    };
  }
}
