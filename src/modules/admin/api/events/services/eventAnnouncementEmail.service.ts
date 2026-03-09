import 'server-only';

import { log } from '@core/lib/logger';

type SendEventAnnouncementEmailInput = {
  subject: string;
  body: string;
  recipients: string[];
};

const DEFAULT_SITE_URL = 'https://peloteras.com';
const DEFAULT_INSTAGRAM_URL = 'https://www.instagram.com/peloteraspe/';
const DEFAULT_TIKTOK_URL = 'https://www.tiktok.com/@peloteras.com';
const DEFAULT_SUPPORT_EMAIL = 'contacto@peloteras.com';
const SEND_CHUNK_SIZE = 10;

const DEFAULT_SUBJECT = '⚽💜 Actualización sobre el lanzamiento de Peloteras';
const DEFAULT_BODY = `Hola,

Queríamos contarles una pequeña actualización sobre el evento de lanzamiento de Peloteras.

El evento de pichanga que estábamos organizando cambiará de fecha y de lugar. Estamos ajustando algunos detalles porque queremos preparar algo realmente lindo para celebrar el inicio de esta comunidad y que sea una experiencia especial para todas.

Por eso, muy pronto estaremos anunciando la nueva convocatoria oficial con todos los detalles del evento.

⚽ Publicaremos la convocatoria en nuestras redes
⚽ Compartiremos la nueva fecha y el nuevo lugar
⚽ Invitaremos a todas a sumarse para formar equipos y disfrutar una gran tarde de fútbol

Si ya te habías inscrito o estabas pensando en participar, ¡gracias por el entusiasmo! Nos emociona mucho ver que esta comunidad ya está empezando a crecer.

Te recomendamos estar atenta a nuestras redes para enterarte primero cuando abramos la convocatoria.

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

function getBodyBlocks(body: string) {
  return body
    .split(/\n{2,}/)
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

async function sendEmailRequest(input: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: input.from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
      reply_to: DEFAULT_SUPPORT_EMAIL,
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(details || `Resend respondió con ${response.status}.`);
  }
}

export function getDefaultEventAnnouncementEmail() {
  return {
    subject: DEFAULT_SUBJECT,
    body: DEFAULT_BODY,
  };
}

export function isEventAnnouncementEmailConfigured() {
  return Boolean(String(process.env.RESEND_API_KEY || '').trim() && String(process.env.EMAIL_FROM || '').trim());
}

export async function sendEventAnnouncementEmail(input: SendEventAnnouncementEmailInput) {
  const resendApiKey = String(process.env.RESEND_API_KEY || '').trim();
  const from = String(process.env.EMAIL_FROM || '').trim();

  if (!resendApiKey || !from) {
    throw new Error('Faltan RESEND_API_KEY o EMAIL_FROM para enviar correos.');
  }

  const recipients = Array.from(
    new Set(
      input.recipients
        .map((email) => String(email || '').trim().toLowerCase())
        .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    )
  );

  if (!recipients.length) {
    return { sentCount: 0, failedCount: 0 };
  }

  const homeUrl = resolveBaseUrl();
  const instagramUrl = normalizeUrl(process.env.NEXT_PUBLIC_INSTAGRAM_URL, DEFAULT_INSTAGRAM_URL);
  const tiktokUrl = normalizeUrl(process.env.NEXT_PUBLIC_TIKTOK_URL, DEFAULT_TIKTOK_URL);
  const html = buildEmailHtml({
    subject: input.subject,
    body: input.body,
    homeUrl,
    instagramUrl,
    tiktokUrl,
  });

  let sentCount = 0;
  let failedCount = 0;

  for (let index = 0; index < recipients.length; index += SEND_CHUNK_SIZE) {
    const chunk = recipients.slice(index, index + SEND_CHUNK_SIZE);
    const results = await Promise.allSettled(
      chunk.map((email) =>
        sendEmailRequest({
          apiKey: resendApiKey,
          from,
          to: email,
          subject: input.subject,
          html,
          text: input.body,
        })
      )
    );

    results.forEach((result, resultIndex) => {
      const recipient = chunk[resultIndex];
      if (result.status === 'fulfilled') {
        sentCount += 1;
        return;
      }

      failedCount += 1;
      log.warn('Event announcement email failed for recipient', 'EMAIL', {
        recipient,
        reason: result.reason instanceof Error ? result.reason.message : String(result.reason || ''),
      });
    });
  }

  log.info('Event announcement email completed', 'EMAIL', {
    subject: input.subject,
    recipientCount: recipients.length,
    sentCount,
    failedCount,
  });

  return { sentCount, failedCount };
}
