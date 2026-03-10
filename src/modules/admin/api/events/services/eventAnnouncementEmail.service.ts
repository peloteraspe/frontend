import 'server-only';

import { randomUUID } from 'node:crypto';

import { log } from '@core/lib/logger';

type SendEventAnnouncementEmailInput = {
  subject: string;
  body: string;
  recipients: string[];
};

export type EventAnnouncementRecipientResult = {
  email: string;
  status: 'queued' | 'failed';
  providerMessageId: string | null;
  errorMessage: string | null;
};

export type SendEventAnnouncementEmailResult = {
  sentCount: number;
  failedCount: number;
  recipientResults: EventAnnouncementRecipientResult[];
};

const DEFAULT_SITE_URL = 'https://peloteras.com';
const DEFAULT_INSTAGRAM_URL = 'https://www.instagram.com/peloteraspe/';
const DEFAULT_TIKTOK_URL = 'https://www.tiktok.com/@peloteras.com';
const DEFAULT_SUPPORT_EMAIL = 'contacto@peloteras.com';
const DEFAULT_FROM_EMAIL = 'Peloteras <contacto@peloteras.com>';
const SEND_BATCH_SIZE = 100;
const INTER_BATCH_DELAY_MS = 150;
const MAX_BATCH_ATTEMPTS = 4;
const INITIAL_BACKOFF_MS = 400;
const MAX_BACKOFF_MS = 5000;

const DEFAULT_SUBJECT = '⚽ Actualización de tu evento en Peloteras';
const DEFAULT_BODY = `Hola,

Queremos contarte una actualización sobre el evento en el que te inscribiste.

[Escribe aquí el mensaje principal para las inscritas.]

⚽ Fecha y hora: [completa aquí]
⚽ Lugar: [completa aquí]
⚽ Detalles importantes: [completa aquí]

Nos vemos pronto en la cancha 💜⚽

Equipo Peloteras
Conectando mujeres y disidencias a través del fútbol`;

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeUrl(value: string | undefined | null, fallback: string) {
  const candidate = String(value || '').trim();
  if (!candidate) return fallback;

  try {
    const parsed = new URL(candidate);
    if (!/^https?:$/i.test(parsed.protocol)) return fallback;
    return parsed.toString();
  } catch {
    return fallback;
  }
}

function resolveBaseUrl() {
  return normalizeUrl(process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL, DEFAULT_SITE_URL);
}

function normalizeBodyText(body: string) {
  return String(body || '')
    .replace(/\r\n?/g, '\n')
    .replace(/\u2028|\u2029/g, '\n');
}

function getBodyBlocks(body: string) {
  const normalizedBody = normalizeBodyText(body);

  return normalizedBody
    .split(/\n\s*\n+/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      const isList = lines.length > 0 && lines.every((line) => /^(⚽|•|-)\s+/.test(line));
      if (isList) {
        return {
          type: 'list' as const,
          items: lines.map((line) => line.replace(/^(⚽|•|-)\s+/, '').trim()).filter(Boolean),
        };
      }

      return {
        type: 'paragraph' as const,
        html: lines.map((line) => escapeHtml(line)).join('<br />'),
      };
    });
}

function renderBodyHtml(body: string) {
  return getBodyBlocks(body)
    .map((block) => {
      if (block.type === 'list') {
        const items = block.items
          .map(
            (item) =>
              `<li style="margin:0 0 10px 0;padding-left:2px;color:#1f2937;font-size:16px;line-height:1.6;">⚽ ${escapeHtml(
                item
              )}</li>`
          )
          .join('');

        return `<ul style="margin:0 0 22px 0;padding-left:0;list-style:none;">${items}</ul>`;
      }

      return `<p style="margin:0 0 18px 0;color:#1f2937;font-size:16px;line-height:1.7;">${block.html}</p>`;
    })
    .join('');
}

function buildEmailHtml(input: {
  subject: string;
  body: string;
  homeUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
}) {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(input.subject)}</title>
</head>
<body style="margin:0;background:#f4edf7;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:680px;background:#ffffff;border-radius:24px;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#54086f 0%,#8d42ab 100%);padding:36px 28px 30px 28px;text-align:center;">
              <img
                src="https://res.cloudinary.com/dtisme9jg/image/upload/v1772667120/peloteras_bdvyxk.png"
                alt="Peloteras"
                width="180"
                style="display:block;margin:0 auto 18px auto;border:0;max-width:100%;height:auto;"
              />
              <div style="display:inline-block;border-radius:999px;background:rgba(255,255,255,.14);padding:8px 14px;color:#ffffff;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;">
                Actualización de evento
              </div>
              <h1 style="margin:18px 0 0 0;color:#ffffff;font-size:34px;line-height:1.1;font-weight:800;">
                ${escapeHtml(input.subject)}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 28px 18px 28px;">
              ${renderBodyHtml(input.body)}
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid #eadcf0;padding-top:22px;">
                <tr>
                  <td style="padding-top:22px;color:#6b7280;font-size:13px;line-height:1.6;">
                    Sigue nuestras novedades en
                    <a href="${escapeHtml(input.instagramUrl)}" target="_blank" rel="noreferrer" style="color:#54086f;font-weight:700;text-decoration:none;">Instagram</a>
                    y
                    <a href="${escapeHtml(input.tiktokUrl)}" target="_blank" rel="noreferrer" style="color:#54086f;font-weight:700;text-decoration:none;">TikTok</a>.
                    <br />
                    Peloteras · Conectando mujeres y disidencias a través del fútbol
                    <br />
                    <a href="${escapeHtml(input.homeUrl)}" target="_blank" rel="noreferrer" style="color:#54086f;text-decoration:none;">${escapeHtml(
                      input.homeUrl
                    )}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

type ResendBatchEmail = {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
  reply_to: string;
};

type ResendBatchResponse = {
  data?: Array<{ id?: string }>;
  errors?: Array<{
    index?: number;
    message?: string;
  }>;
};

type SendBatchEmailRequestResult = {
  queuedResults: Array<{
    email: string;
    providerMessageId: string | null;
  }>;
  failedResults: Array<{
    email: string;
    errorMessage: string;
  }>;
};

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
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

async function sendBatchEmailRequest(input: {
  apiKey: string;
  emails: ResendBatchEmail[];
  batchNumber: number;
}): Promise<SendBatchEmailRequestResult> {
  const idempotencyKey = `event-announcement-${randomUUID()}`;

  for (let attempt = 1; attempt <= MAX_BATCH_ATTEMPTS; attempt += 1) {
    let response: Response;

    try {
      response = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(input.emails),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error || 'Unknown error');
      if (attempt >= MAX_BATCH_ATTEMPTS) {
        throw new Error(reason);
      }

      const delayMs = getRetryDelayMs(attempt, null);
      log.warn('Retrying event announcement batch after network error', 'EMAIL', {
        batchNumber: input.batchNumber,
        batchSize: input.emails.length,
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
      if (isRetryableStatus(response.status) && attempt < MAX_BATCH_ATTEMPTS) {
        const delayMs = getRetryDelayMs(attempt, response.headers.get('Retry-After'));
        log.warn('Retrying event announcement batch after provider response', 'EMAIL', {
          batchNumber: input.batchNumber,
          batchSize: input.emails.length,
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

    const parsed = safeJsonParse<ResendBatchResponse>(details) ?? {};
    const errors = Array.isArray(parsed.errors) ? parsed.errors : [];
    const failedIndexes = new Set<number>();
    const failedResults = errors.map((error, resultIndex) => {
      const recipientIndex = Number(error?.index);
      const fallbackIndex = Number.isInteger(recipientIndex) ? recipientIndex : resultIndex;
      failedIndexes.add(fallbackIndex);
      return {
        email: input.emails[fallbackIndex]?.to[0] || '',
        errorMessage: String(error?.message || 'Unknown batch error'),
      };
    });

    const queuedEmails = input.emails.filter((_, index) => !failedIndexes.has(index));
    const providerIds = Array.isArray(parsed.data) ? parsed.data : [];
    const queuedResults = queuedEmails.map((email, index) => ({
      email: email.to[0] || '',
      providerMessageId: String(providerIds[index]?.id || '').trim() || null,
    }));

    return {
      queuedResults,
      failedResults,
    };
  }

  throw new Error('No se pudo enviar el lote de correos.');
}

export function getDefaultEventAnnouncementEmail() {
  return {
    subject: DEFAULT_SUBJECT,
    body: DEFAULT_BODY,
  };
}

export async function sendEventAnnouncementEmail(
  input: SendEventAnnouncementEmailInput
): Promise<SendEventAnnouncementEmailResult> {
  const resendApiKey = String(process.env.RESEND_API_KEY || '').trim();

  if (!resendApiKey) {
    throw new Error('No se pudo enviar el correo en este momento. Inténtalo nuevamente.');
  }

  const normalizedBody = normalizeBodyText(input.body).trim();
  if (!normalizedBody) {
    return { sentCount: 0, failedCount: 0, recipientResults: [] };
  }

  const recipients = Array.from(
    new Set(
      input.recipients
        .map((email) => String(email || '').trim().toLowerCase())
        .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    )
  );

  if (!recipients.length) {
    return { sentCount: 0, failedCount: 0, recipientResults: [] };
  }

  const homeUrl = resolveBaseUrl();
  const instagramUrl = normalizeUrl(process.env.NEXT_PUBLIC_INSTAGRAM_URL, DEFAULT_INSTAGRAM_URL);
  const tiktokUrl = normalizeUrl(process.env.NEXT_PUBLIC_TIKTOK_URL, DEFAULT_TIKTOK_URL);
  const html = buildEmailHtml({
    subject: input.subject,
    body: normalizedBody,
    homeUrl,
    instagramUrl,
    tiktokUrl,
  });

  let sentCount = 0;
  let failedCount = 0;
  const recipientResults: EventAnnouncementRecipientResult[] = [];

  for (let index = 0; index < recipients.length; index += SEND_BATCH_SIZE) {
    const chunk = recipients.slice(index, index + SEND_BATCH_SIZE);
    const batchNumber = Math.floor(index / SEND_BATCH_SIZE) + 1;

    try {
      const result = await sendBatchEmailRequest({
        apiKey: resendApiKey,
        batchNumber,
        emails: chunk.map((email) => ({
          from: DEFAULT_FROM_EMAIL,
          to: [email],
          subject: input.subject,
          html,
          text: normalizedBody,
          reply_to: DEFAULT_SUPPORT_EMAIL,
        })),
      });

      sentCount += result.queuedResults.length;
      failedCount += result.failedResults.length;

      result.queuedResults.forEach((queued) => {
        recipientResults.push({
          email: queued.email,
          status: 'queued',
          providerMessageId: queued.providerMessageId,
          errorMessage: null,
        });
      });

      result.failedResults.forEach((failed) => {
        recipientResults.push({
          email: failed.email,
          status: 'failed',
          providerMessageId: null,
          errorMessage: failed.errorMessage,
        });

        log.warn('Event announcement email failed for recipient in batch', 'EMAIL', {
          batchNumber,
          recipient: failed.email || 'Desconocido',
          reason: failed.errorMessage,
        });
      });

      const accountedCount = result.queuedResults.length + result.failedResults.length;
      if (accountedCount < chunk.length) {
        const accountedEmails = new Set(
          [...result.queuedResults.map((item) => item.email), ...result.failedResults.map((item) => item.email)].filter(
            Boolean
          )
        );

        chunk
          .filter((email) => !accountedEmails.has(email))
          .forEach((email) => {
            failedCount += 1;
            recipientResults.push({
              email,
              status: 'failed',
              providerMessageId: null,
              errorMessage: 'Resend no devolvió resultado para esta destinataria.',
            });
          });

        log.warn('Event announcement batch completed with unaccounted recipients', 'EMAIL', {
          batchNumber,
          batchSize: chunk.length,
          queuedCount: result.queuedResults.length,
          errorCount: result.failedResults.length,
          missingCount: chunk.length - accountedCount,
        });
      }
    } catch (error) {
      failedCount += chunk.length;
      chunk.forEach((email) => {
        recipientResults.push({
          email,
          status: 'failed',
          providerMessageId: null,
          errorMessage: error instanceof Error ? error.message : String(error || 'Unknown error'),
        });
      });
      log.warn('Event announcement batch failed', 'EMAIL', {
        batchNumber,
        batchSize: chunk.length,
        reason: error instanceof Error ? error.message : String(error || ''),
      });
    }

    if (index + SEND_BATCH_SIZE < recipients.length) {
      await wait(INTER_BATCH_DELAY_MS);
    }
  }

  log.info('Event announcement email completed', 'EMAIL', {
    subject: input.subject,
    recipientCount: recipients.length,
    sentCount,
    failedCount,
  });

  return { sentCount, failedCount, recipientResults };
}
