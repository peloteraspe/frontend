import 'server-only';

import { randomUUID } from 'node:crypto';

import { log } from '@core/lib/logger';

type SendEventAnnouncementEmailInput = {
  subject: string;
  body: string;
  bodyHtml?: string | null;
  recipients: string[];
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  eventPromotionLayout?: EventPromotionLayout | null;
  baseUrl?: string | null;
};

export type PersonalizedEventAnnouncementRecipientInput = {
  trackingKey: string;
  email: string;
  subject: string;
  body: string;
  bodyHtml?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
};

type EventPromotionDetail = {
  label: string;
  value: string;
};

type EventPromotionLayout = {
  eventTitle: string;
  intro?: string | null;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  registrationCtaLabel?: string | null;
  registrationCtaUrl?: string | null;
  organizerName?: string | null;
  organizerEmail?: string | null;
  details?: EventPromotionDetail[] | null;
  description?: string | null;
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

export type PersonalizedEventAnnouncementRecipientResult = EventAnnouncementRecipientResult & {
  trackingKey: string;
};

export type SendPersonalizedEventAnnouncementEmailResult = {
  sentCount: number;
  failedCount: number;
  recipientResults: PersonalizedEventAnnouncementRecipientResult[];
};

const DEFAULT_SITE_URL = 'https://peloteras.com';
const DEFAULT_INSTAGRAM_URL = 'https://www.instagram.com/peloteraspe/';
const DEFAULT_TIKTOK_URL = 'https://www.tiktok.com/@peloteras.com';
const DEFAULT_SUPPORT_EMAIL = 'contacto@peloteras.com';
const DEFAULT_FROM_EMAIL = 'Peloteras <contacto@peloteras.com>';
const DEFAULT_CTA_LABEL = 'Ir a Peloteras';
const DEFAULT_LOCAL_SITE_URL = 'http://localhost:3000';
const DEFAULT_LOGO_URL = 'https://res.cloudinary.com/dtisme9jg/image/upload/v1772667120/peloteras_bdvyxk.png';
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
Más jugadoras, más fútbol`;

function normalizeAnnouncementSubject(subject: string | undefined | null) {
  const normalized = String(subject || '').trim();
  return normalized || DEFAULT_SUBJECT;
}

function normalizeCtaLabel(value: string | undefined | null) {
  const normalized = String(value || '').trim();
  return normalized || DEFAULT_CTA_LABEL;
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value: unknown) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

function normalizeRichHref(value: string | undefined | null) {
  const candidate = String(value || '').trim();
  if (!candidate) return '';

  const normalizedCandidate = /^www\./i.test(candidate) ? `https://${candidate}` : candidate;

  try {
    const parsed = new URL(normalizedCandidate);
    if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) return '';
    return parsed.toString();
  } catch {
    return '';
  }
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

function resolveCtaUrl(value: string | undefined | null, homeUrl: string) {
  const candidate = String(value || '').trim();
  if (!candidate) return homeUrl;

  try {
    const parsed = new URL(candidate, homeUrl);
    if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) return homeUrl;
    return parsed.toString();
  } catch {
    return homeUrl;
  }
}

function resolveBaseUrl(preferred?: string | null) {
  const configured = String(
    process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || ''
  ).trim();
  const candidate = String(preferred || '').trim();
  if (candidate) {
    return normalizeUrl(
      candidate,
      configured || (process.env.NODE_ENV === 'production' ? DEFAULT_SITE_URL : DEFAULT_LOCAL_SITE_URL)
    );
  }

  if (!configured) {
    return process.env.NODE_ENV === 'production' ? DEFAULT_SITE_URL : DEFAULT_LOCAL_SITE_URL;
  }

  return normalizeUrl(
    configured,
    process.env.NODE_ENV === 'production' ? DEFAULT_SITE_URL : DEFAULT_LOCAL_SITE_URL
  );
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

function getRichTextStyleDefaults(tagName: string) {
  switch (tagName) {
    case 'p':
      return 'margin:0 0 18px 0;color:#1f2937;font-size:16px;line-height:1.7;';
    case 'ul':
    case 'ol':
      return 'margin:0 0 22px 20px;padding:0;color:#1f2937;font-size:16px;line-height:1.6;';
    case 'li':
      return 'margin:0 0 10px 0;';
    case 'a':
      return 'color:#175cd3;font-weight:700;text-decoration:underline;';
    default:
      return '';
  }
}

function getRichTextAttribute(attributes: string, attributeName: string) {
  const escapedAttributeName = attributeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(
    `${escapedAttributeName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>\\x60]+))`,
    'i'
  );
  const match = regex.exec(attributes);
  return String(match?.[1] ?? match?.[2] ?? match?.[3] ?? '').trim();
}

function sanitizeRichTextStyle(rawStyle: string, tagName: string) {
  const allowIndentation = new Set(['p', 'ul', 'ol', 'li']);
  if (!allowIndentation.has(tagName)) return '';

  const rules = String(rawStyle || '')
    .split(';')
    .map((rule) => rule.trim())
    .filter(Boolean);

  const sanitizedRules: string[] = [];

  rules.forEach((rule) => {
    const separatorIndex = rule.indexOf(':');
    if (separatorIndex <= 0) return;

    const property = rule.slice(0, separatorIndex).trim().toLowerCase();
    const value = rule
      .slice(separatorIndex + 1)
      .trim()
      .toLowerCase();

    if (['margin-left', 'padding-left', 'text-indent'].includes(property)) {
      if (/^\d+(\.\d+)?(px|pt|em|rem|%)$/.test(value)) {
        sanitizedRules.push(`${property}:${value}`);
      }
      return;
    }

    if (property === 'text-align' && ['left', 'center', 'right', 'justify'].includes(value)) {
      sanitizedRules.push(`${property}:${value}`);
    }
  });

  return sanitizedRules.join(';');
}

function sanitizeRichTextHtml(bodyHtml: string | undefined | null) {
  const normalized = normalizeBodyText(String(bodyHtml || '')).trim();
  if (!normalized) return '';

  const strippedUnsafeTags = normalized
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\s*(script|style|iframe|object|embed|meta|link)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|meta|link)[^>]*\/?\s*>/gi, '');

  const tagPattern = /<\/?([a-z0-9]+)\b([^>]*)>/gi;
  const tagNameMap: Record<string, string> = {
    a: 'a',
    b: 'strong',
    br: 'br',
    div: 'p',
    em: 'em',
    i: 'em',
    li: 'li',
    ol: 'ol',
    p: 'p',
    strong: 'strong',
    u: 'u',
    ul: 'ul',
  };

  let lastIndex = 0;
  let output = '';
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(strippedUnsafeTags))) {
    output += escapeHtml(strippedUnsafeTags.slice(lastIndex, match.index));
    lastIndex = tagPattern.lastIndex;

    const isClosingTag = match[0].startsWith('</');
    const rawTagName = String(match[1] || '').toLowerCase();
    const tagName = tagNameMap[rawTagName];
    if (!tagName) continue;

    if (isClosingTag) {
      if (tagName === 'br') continue;
      output += `</${tagName}>`;
      continue;
    }

    if (tagName === 'br') {
      output += '<br />';
      continue;
    }

    if (tagName === 'a') {
      const href = normalizeRichHref(getRichTextAttribute(match[2] || '', 'href'));
      const defaultStyle = getRichTextStyleDefaults(tagName);
      output += href
        ? `<a href="${escapeAttribute(href)}" target="_blank" rel="noreferrer" style="${escapeAttribute(defaultStyle)}">`
        : '<a>';
      continue;
    }

    const customStyle = sanitizeRichTextStyle(
      getRichTextAttribute(match[2] || '', 'style'),
      tagName
    );
    const defaultStyle = getRichTextStyleDefaults(tagName);
    const styleValue = [defaultStyle, customStyle].filter(Boolean).join('');
    output += styleValue ? `<${tagName} style="${escapeAttribute(styleValue)}">` : `<${tagName}>`;
  }

  output += escapeHtml(strippedUnsafeTags.slice(lastIndex));
  return output.trim();
}

function renderBodyHtml(body: string, bodyHtml?: string | null) {
  const richTextHtml = sanitizeRichTextHtml(bodyHtml);
  if (richTextHtml) return richTextHtml;

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

function buildPromotionDetailsCardHtml(
  title: string,
  details: EventPromotionDetail[] | null | undefined
) {
  const safeDetails = (details ?? []).filter(
    (detail) => String(detail?.label || '').trim() && String(detail?.value || '').trim()
  );
  if (!safeDetails.length) return '';

  return `
            <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="padding:0 24px 18px 24px;">
                  <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:18px;padding:18px 20px;text-align:left;">
                    <p style="margin:0 0 12px 0;color:#54086f;font-size:12px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">
                      ${escapeHtml(title)}
                    </p>
                    ${safeDetails
                      .map(
                        (detail, index) => `
                      <p style="margin:0${index < safeDetails.length - 1 ? ' 0 10px' : ''};color:#111827;font-size:14px;font-family:Arial,Helvetica,sans-serif;line-height:1.5;">
                        <strong style="color:#54086f;">${escapeHtml(detail.label)}:</strong> ${escapeHtml(detail.value)}
                      </p>
                    `
                      )
                      .join('')}
                  </div>
                </td>
              </tr>
            </table>
  `.trim();
}

function buildEventPromotionEmailHtml(input: {
  subject: string;
  homeUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  layout: EventPromotionLayout;
}) {
  const normalizedSubject = normalizeAnnouncementSubject(input.subject);
  const logoUrl = DEFAULT_LOGO_URL;
  const ctaLabel = normalizeCtaLabel(input.ctaLabel);
  const ctaUrl = resolveCtaUrl(input.ctaUrl, input.homeUrl);
  const registrationCtaLabel =
    String(input.layout.registrationCtaLabel || '').trim() || 'Inscríbete';
  const registrationCtaUrl = resolveCtaUrl(input.layout.registrationCtaUrl, input.homeUrl);
  const organizerDetails = [
    { label: 'Nombre', value: String(input.layout.organizerName || '').trim() },
    { label: 'Correo', value: String(input.layout.organizerEmail || '').trim() },
  ];
  const extraDetails = (input.layout.details ?? []).filter(
    (detail) => String(detail?.label || '').trim() && String(detail?.value || '').trim()
  );
  const description = String(input.layout.description || '').trim();
  const descriptionHtml = description ? renderBodyHtml(description) : '';
  const organizerCardHtml = buildPromotionDetailsCardHtml('Admin del evento', organizerDetails);
  const extraCardHtml = buildPromotionDetailsCardHtml('Más información', extraDetails);

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>${escapeHtml(normalizedSubject)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700;800&display=swap" rel="stylesheet" type="text/css">
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; }
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: inherit !important; }
    #MessageViewBody a { color: inherit; text-decoration: none; }
    .location-value, .location-value a {
      color: #ffffff !important;
      text-decoration: none !important;
      -webkit-text-fill-color: #ffffff !important;
    }
    .metric-value {
      white-space: normal !important;
      word-break: break-word !important;
      overflow-wrap: anywhere !important;
    }
    .metric-copy {
      white-space: normal !important;
      word-break: break-word !important;
      overflow-wrap: anywhere !important;
    }
    p { line-height: inherit; }
    @media (max-width: 720px) {
      .row-content { width: 100% !important; }
      .stack .column { width: 100% !important; display: block !important; }
      .event-title { font-size: 46px !important; }
      .event-intro { font-size: 16px !important; line-height: 1.45 !important; }
      .metric-value { font-size: 24px !important; }
      .location-value { font-size: 22px !important; }
      .promo-row .promo-column { width: 100% !important; display: block !important; border-left: 0 !important; border-right: 0 !important; }
      .promo-row .promo-column-middle,
      .promo-row .promo-column-last { border-top: 8px solid #ffffff !important; }
    }
  </style>
</head>
<body style="margin:0;background-color:#744d7c;padding:0;-webkit-text-size-adjust:none;text-size-adjust:none;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#744d7c;">
    <tr>
      <td>
        <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" width="700" style="background-color:#ffffff;color:#000000;width:700px;margin:0 auto;">
          <tr>
            <td class="column" width="100%" style="text-align:left;vertical-align:top;">
              <div style="height:40px;line-height:40px;font-size:1px;">&#8202;</div>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="width:100%;padding:0;">
                    <div align="center">
                      <div style="max-width:210px;">
                        <a href="${escapeAttribute(input.homeUrl)}" target="_blank" rel="noreferrer">
                          <img src="${escapeAttribute(logoUrl)}" style="display:block;height:auto;border:0;width:100%;" width="210" alt="Peloteras" />
                        </a>
                      </div>
                    </div>
                  </td>
                </tr>
              </table>
              <div style="height:26px;line-height:26px;font-size:1px;">&#8202;</div>
              <table width="100%" border="0" cellpadding="10" cellspacing="0" role="presentation">
                <tr>
                  <td>
                    <div align="center" style="margin-bottom:14px;">
                      <span style="display:inline-block;background:#efe6f4;color:#54086f;font-weight:800;font-size:12px;letter-spacing:.6px;text-transform:uppercase;border-radius:999px;padding:7px 12px;font-family:Arial,Helvetica,sans-serif;">
                        Nuevo evento
                      </span>
                    </div>
                    <p class="event-intro" style="margin:0 auto 18px auto;max-width:560px;color:#374151;font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:1.45;text-align:center;">
                      ${escapeHtml(String(input.layout.intro || '').trim() || 'Hay un nuevo evento en Peloteras y queríamos compartirlo contigo. Mira los detalles y súmate a la cancha.')}
                    </p>
                    <h1 class="event-title" style="margin:0;color:#202020;direction:ltr;font-family:'Oswald',Arial,'Helvetica Neue',Helvetica,sans-serif;font-size:62px;font-weight:700;letter-spacing:-2px;line-height:1;text-align:center;word-break:break-word;padding:0 16px;">
                      ${escapeHtml(input.layout.eventTitle)}
                    </h1>
                  </td>
                </tr>
              </table>
              <div style="height:20px;line-height:20px;font-size:1px;">&#8202;</div>
            </td>
          </tr>
        </table>

        <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" width="700" style="background-color:#ffffff;color:#000000;padding:0 20px 20px 20px;width:700px;margin:0 auto;">
          <tr>
            <td>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                <tr class="promo-row">
                  <td class="column promo-column promo-column-first" width="33.33%" valign="top" style="background-color:#744d7c;text-align:center;padding:0;">
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td style="padding:34px 18px 32px 18px;text-align:center;">
                          <img src="https://d1oco4z2z1fhwp.cloudfront.net/templates/default/11021/03_Icon_calendar.png" width="39" alt="Fecha" style="display:block;height:auto;border:0;margin:0 auto 14px auto;">
                          <p style="margin:0 0 26px 0;color:#d8bfdc;font-size:11px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">Fecha</p>
                          <h3 class="metric-value" style="margin:0;color:#ffffff;font-family:'Oswald',Arial,'Helvetica Neue',Helvetica,sans-serif;font-size:27px;font-weight:600;letter-spacing:-1px;line-height:1.12;text-align:center;">
                            ${escapeHtml(input.layout.eventDate)}
                          </h3>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td class="column promo-column promo-column-middle" width="33.33%" valign="top" style="background-color:#744d7c;text-align:center;padding:0;border-left:8px solid #ffffff;border-right:8px solid #ffffff;">
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td style="padding:34px 18px 32px 18px;text-align:center;">
                          <img src="https://d1oco4z2z1fhwp.cloudfront.net/templates/default/11021/03_Icon_Clock.png" width="39" alt="Hora" style="display:block;height:auto;border:0;margin:0 auto 14px auto;">
                          <p style="margin:0 0 26px 0;color:#d8bfdc;font-size:11px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">Hora</p>
                          <h3 class="metric-value" style="margin:0;color:#ffffff;font-family:'Oswald',Arial,'Helvetica Neue',Helvetica,sans-serif;font-size:27px;font-weight:600;letter-spacing:-1px;line-height:1.12;text-align:center;">
                            ${escapeHtml(input.layout.eventTime)}
                          </h3>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td class="column promo-column promo-column-last" width="33.33%" valign="top" style="background-color:#744d7c;text-align:center;padding:0;">
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td style="padding:34px 18px 32px 18px;text-align:center;">
                          <img src="https://d1oco4z2z1fhwp.cloudfront.net/templates/default/11021/03_Icon_map-pin.png" width="39" alt="Lugar" style="display:block;height:auto;border:0;margin:0 auto 14px auto;">
                          <p style="margin:0 0 26px 0;color:#d8bfdc;font-size:11px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">Lugar</p>
                          <h3 class="metric-value location-value" style="margin:0;color:#ffffff;font-family:'Oswald',Arial,'Helvetica Neue',Helvetica,sans-serif;font-size:22px;font-weight:600;letter-spacing:-0.6px;line-height:1.16;text-align:center;">
                            <span class="metric-copy location-value" style="display:block;color:#ffffff;text-decoration:none;-webkit-text-fill-color:#ffffff;white-space:normal;word-break:break-word;overflow-wrap:anywhere;">
                              ${escapeHtml(input.layout.eventLocation)}
                            </span>
                          </h3>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:20px 0 0 0;">
              <a href="${escapeAttribute(registrationCtaUrl)}" target="_blank" rel="noreferrer" style="display:inline-block;background:#54086f;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 26px;border-radius:12px;font-family:Arial,Helvetica,sans-serif;box-shadow:0 6px 18px rgba(84,8,111,.24);">
                ${escapeHtml(registrationCtaLabel)}
              </a>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:12px 16px 0 16px;color:#6b7280;font-size:12px;font-family:Arial,Helvetica,sans-serif;word-break:break-all;">
              Si el botón no abre, copia este enlace: ${escapeHtml(registrationCtaUrl)}
            </td>
          </tr>
        </table>

        <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" width="700" style="background-color:#ffffff;color:#000000;width:700px;margin:0 auto;">
          <tr>
            <td class="column" width="100%" style="text-align:left;vertical-align:top;">
              ${organizerCardHtml}
              ${extraCardHtml}
              ${
                descriptionHtml
                  ? `
              <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="padding:0 24px 18px 24px;">
                    <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:18px;padding:18px 20px;text-align:left;">
                      <p style="margin:0 0 12px 0;color:#54086f;font-size:12px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">
                        Descripción del evento
                      </p>
                      ${descriptionHtml}
                    </div>
                  </td>
                </tr>
              </table>
              `
                  : ''
              }
              <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td align="center" style="padding:8px 24px 20px 24px;">
                    <a href="${escapeAttribute(ctaUrl)}" target="_blank" rel="noreferrer" style="display:inline-block;background:#54086f;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 24px;border-radius:10px;font-family:Arial,Helvetica,sans-serif;box-shadow:0 6px 18px rgba(84,8,111,.24);">
                      ${escapeHtml(ctaLabel)}
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:0 24px 22px 24px;color:#6b7280;font-size:12px;font-family:Arial,Helvetica,sans-serif;word-break:break-all;">
                    Si el botón no abre, copia este enlace: ${escapeHtml(ctaUrl)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" width="700" style="background-color:#ffffff;color:#000000;width:700px;margin:0 auto;">
          <tr>
            <td class="column" width="100%" style="text-align:left;vertical-align:top;padding:0 24px 28px 24px;">
              <hr style="border:0;border-top:1px solid #e5e7eb;margin:0 0 14px;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;font-family:Arial,Helvetica,sans-serif;">
                Sigue nuestras novedades en
                <a href="${escapeAttribute(input.instagramUrl)}" target="_blank" rel="noreferrer" style="color:#54086f;text-decoration:underline;">Instagram</a>
                y
                <a href="${escapeAttribute(input.tiktokUrl)}" target="_blank" rel="noreferrer" style="color:#54086f;text-decoration:underline;">TikTok</a>.
              </p>
              <p style="margin:6px 0 0 0;font-size:12px;line-height:1.6;color:#94a3b8;font-family:Arial,Helvetica,sans-serif;">
                Equipo Peloteras
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildEmailHtml(input: {
  subject: string;
  body: string;
  bodyHtml?: string | null;
  homeUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
}) {
  const normalizedSubject = normalizeAnnouncementSubject(input.subject);
  const logoUrl = DEFAULT_LOGO_URL;
  const bodyContent = renderBodyHtml(input.body, input.bodyHtml);
  const ctaLabel = normalizeCtaLabel(input.ctaLabel);
  const ctaUrl = resolveCtaUrl(input.ctaUrl, input.homeUrl);

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>${escapeHtml(normalizedSubject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f3f5;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f1f3f5;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background-color:#ffffff;border-radius:24px;border:1px solid #e5e7eb;">
          <tr>
            <td style="padding:30px 32px 10px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td valign="middle">
                    <span style="display:inline-block;background-color:#ece5f0;color:#54086f;font-size:12px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;padding:7px 12px;border-radius:999px;">
                      Comunidad Peloteras
                    </span>
                  </td>
                  <td align="right" valign="middle">
                    <img
                      src="${escapeAttribute(logoUrl)}"
                      alt="Peloteras"
                      width="132"
                      style="display:block;border:0;outline:none;text-decoration:none;height:auto;"
                    />
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 6px;">
              <h1 style="margin:0 0 12px 0;font-size:36px;line-height:1.2;color:#111827;font-weight:800;">
                ${escapeHtml(normalizedSubject)}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 32px 8px;">
              ${bodyContent}
            </td>
          </tr>
          <tr>
            <td style="padding:4px 32px 8px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" bgcolor="#54086F" style="border-radius:14px;">
                    <a
                      href="${escapeAttribute(ctaUrl)}"
                      target="_blank"
                      rel="noreferrer"
                      style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;"
                    >
                      ${escapeHtml(ctaLabel)}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 30px;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">
                También puedes abrir este enlace:
              </p>
              <p style="margin:6px 0 16px 0;font-size:13px;line-height:1.5;word-break:break-all;">
                <a href="${escapeAttribute(ctaUrl)}" target="_blank" rel="noreferrer" style="color:#54086f;text-decoration:underline;">
                  ${escapeHtml(ctaUrl)}
                </a>
              </p>

              <hr style="border:0;border-top:1px solid #e8e8ee;margin:0 0 14px;">

              <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">
                Sigue nuestras novedades en
                <a href="${escapeAttribute(input.instagramUrl)}" target="_blank" rel="noreferrer" style="color:#54086f;text-decoration:underline;">Instagram</a>
                y
                <a href="${escapeAttribute(input.tiktokUrl)}" target="_blank" rel="noreferrer" style="color:#54086f;text-decoration:underline;">TikTok</a>.
              </p>
              <p style="margin:6px 0 0 0;font-size:12px;line-height:1.6;color:#94a3b8;">
                Equipo Peloteras
              </p>
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
  trackingKey: string;
  from: string;
  to: string[];
  subject: string;
  html: string;
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
    trackingKey: string;
    email: string;
    providerMessageId: string | null;
  }>;
  failedResults: Array<{
    trackingKey: string;
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
  const requestEmails = input.emails.map(({ trackingKey: _trackingKey, ...email }) => email);

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
        body: JSON.stringify(requestEmails),
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
        trackingKey: input.emails[fallbackIndex]?.trackingKey || '',
        email: input.emails[fallbackIndex]?.to[0] || '',
        errorMessage: String(error?.message || 'Unknown batch error'),
      };
    });

    const queuedEmails = input.emails.filter((_, index) => !failedIndexes.has(index));
    const providerIds = Array.isArray(parsed.data) ? parsed.data : [];
    const queuedResults = queuedEmails.map((email, index) => ({
      trackingKey: email.trackingKey,
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
  const normalizedBodyHtml = String(input.bodyHtml || '').trim();
  if (!normalizedBody && !normalizedBodyHtml && !input.eventPromotionLayout) {
    return { sentCount: 0, failedCount: 0, recipientResults: [] };
  }

  const recipients = Array.from(
    new Set(
      input.recipients
        .map((email) =>
          String(email || '')
            .trim()
            .toLowerCase()
        )
        .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    )
  );

  if (!recipients.length) {
    return { sentCount: 0, failedCount: 0, recipientResults: [] };
  }

  const homeUrl = resolveBaseUrl(input.baseUrl);
  const instagramUrl = normalizeUrl(process.env.NEXT_PUBLIC_INSTAGRAM_URL, DEFAULT_INSTAGRAM_URL);
  const tiktokUrl = normalizeUrl(process.env.NEXT_PUBLIC_TIKTOK_URL, DEFAULT_TIKTOK_URL);
  const normalizedSubject = normalizeAnnouncementSubject(input.subject);
  const html = input.eventPromotionLayout
    ? buildEventPromotionEmailHtml({
        subject: normalizedSubject,
        homeUrl,
        instagramUrl,
        tiktokUrl,
        ctaLabel: input.ctaLabel,
        ctaUrl: input.ctaUrl,
        layout: input.eventPromotionLayout,
      })
    : buildEmailHtml({
        subject: normalizedSubject,
        body: normalizedBody,
        bodyHtml: normalizedBodyHtml,
        homeUrl,
        instagramUrl,
        tiktokUrl,
        ctaLabel: input.ctaLabel,
        ctaUrl: input.ctaUrl,
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
          trackingKey: email,
          from: DEFAULT_FROM_EMAIL,
          to: [email],
          subject: normalizedSubject,
          html,
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
          [
            ...result.queuedResults.map((item) => item.email),
            ...result.failedResults.map((item) => item.email),
          ].filter(Boolean)
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
    subject: normalizedSubject,
    recipientCount: recipients.length,
    sentCount,
    failedCount,
  });

  return { sentCount, failedCount, recipientResults };
}

export async function sendPersonalizedEventAnnouncementEmails(
  input: {
    recipients: PersonalizedEventAnnouncementRecipientInput[];
    baseUrl?: string | null;
  }
): Promise<SendPersonalizedEventAnnouncementEmailResult> {
  const resendApiKey = String(process.env.RESEND_API_KEY || '').trim();

  if (!resendApiKey) {
    throw new Error('No se pudo enviar el correo en este momento. Inténtalo nuevamente.');
  }

  const homeUrl = resolveBaseUrl(input.baseUrl);
  const instagramUrl = normalizeUrl(process.env.NEXT_PUBLIC_INSTAGRAM_URL, DEFAULT_INSTAGRAM_URL);
  const tiktokUrl = normalizeUrl(process.env.NEXT_PUBLIC_TIKTOK_URL, DEFAULT_TIKTOK_URL);

  const recipients = input.recipients
    .map((recipient) => {
      const email = String(recipient.email || '')
        .trim()
        .toLowerCase();
      const trackingKey = String(recipient.trackingKey || '').trim();
      const normalizedBody = normalizeBodyText(recipient.body).trim();
      const normalizedBodyHtml = String(recipient.bodyHtml || '').trim();
      if (!trackingKey || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return null;
      }

      if (!normalizedBody && !normalizedBodyHtml) {
        return null;
      }

      const subject = normalizeAnnouncementSubject(recipient.subject);
      const html = buildEmailHtml({
        subject,
        body: normalizedBody,
        bodyHtml: normalizedBodyHtml,
        homeUrl,
        instagramUrl,
        tiktokUrl,
        ctaLabel: recipient.ctaLabel,
        ctaUrl: recipient.ctaUrl,
      });

      return {
        trackingKey,
        email,
        subject,
        html,
      };
    })
    .filter(Boolean) as Array<{
    trackingKey: string;
    email: string;
    subject: string;
    html: string;
  }>;

  if (!recipients.length) {
    return { sentCount: 0, failedCount: 0, recipientResults: [] };
  }

  let sentCount = 0;
  let failedCount = 0;
  const recipientResults: PersonalizedEventAnnouncementRecipientResult[] = [];

  for (let index = 0; index < recipients.length; index += SEND_BATCH_SIZE) {
    const chunk = recipients.slice(index, index + SEND_BATCH_SIZE);
    const batchNumber = Math.floor(index / SEND_BATCH_SIZE) + 1;

    try {
      const result = await sendBatchEmailRequest({
        apiKey: resendApiKey,
        batchNumber,
        emails: chunk.map((recipient) => ({
          trackingKey: recipient.trackingKey,
          from: DEFAULT_FROM_EMAIL,
          to: [recipient.email],
          subject: recipient.subject,
          html: recipient.html,
          reply_to: DEFAULT_SUPPORT_EMAIL,
        })),
      });

      sentCount += result.queuedResults.length;
      failedCount += result.failedResults.length;

      result.queuedResults.forEach((queued) => {
        recipientResults.push({
          trackingKey: queued.trackingKey,
          email: queued.email,
          status: 'queued',
          providerMessageId: queued.providerMessageId,
          errorMessage: null,
        });
      });

      result.failedResults.forEach((failed) => {
        recipientResults.push({
          trackingKey: failed.trackingKey,
          email: failed.email,
          status: 'failed',
          providerMessageId: null,
          errorMessage: failed.errorMessage,
        });

        log.warn('Personalized event announcement email failed for recipient in batch', 'EMAIL', {
          batchNumber,
          trackingKey: failed.trackingKey,
          recipient: failed.email || 'Desconocido',
          reason: failed.errorMessage,
        });
      });

      const accountedKeys = new Set(
        [
          ...result.queuedResults.map((item) => item.trackingKey),
          ...result.failedResults.map((item) => item.trackingKey),
        ].filter(Boolean)
      );

      if (accountedKeys.size < chunk.length) {
        chunk
          .filter((recipient) => !accountedKeys.has(recipient.trackingKey))
          .forEach((recipient) => {
            failedCount += 1;
            recipientResults.push({
              trackingKey: recipient.trackingKey,
              email: recipient.email,
              status: 'failed',
              providerMessageId: null,
              errorMessage: 'Resend no devolvió resultado para esta destinataria.',
            });
          });

        log.warn('Personalized event announcement batch completed with unaccounted recipients', 'EMAIL', {
          batchNumber,
          batchSize: chunk.length,
          queuedCount: result.queuedResults.length,
          errorCount: result.failedResults.length,
          missingCount: chunk.length - accountedKeys.size,
        });
      }
    } catch (error) {
      failedCount += chunk.length;
      chunk.forEach((recipient) => {
        recipientResults.push({
          trackingKey: recipient.trackingKey,
          email: recipient.email,
          status: 'failed',
          providerMessageId: null,
          errorMessage: error instanceof Error ? error.message : String(error || 'Unknown error'),
        });
      });
      log.warn('Personalized event announcement batch failed', 'EMAIL', {
        batchNumber,
        batchSize: chunk.length,
        reason: error instanceof Error ? error.message : String(error || ''),
      });
    }

    if (index + SEND_BATCH_SIZE < recipients.length) {
      await wait(INTER_BATCH_DELAY_MS);
    }
  }

  log.info('Personalized event announcement email completed', 'EMAIL', {
    recipientCount: recipients.length,
    sentCount,
    failedCount,
  });

  return { sentCount, failedCount, recipientResults };
}
