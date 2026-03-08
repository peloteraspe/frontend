import 'server-only';

import { log } from '@core/lib/logger';

export type PaymentEmailStatus = 'pending' | 'approved' | 'rejected';

type SendPaymentStatusEmailInput = {
  status: PaymentEmailStatus;
  toEmail: string;
  toName?: string | null;
  eventTitle?: string | null;
  eventStartTime?: string | null;
  eventLocation?: string | null;
  ticketsUrl?: string | null;
};

const DEFAULT_TZ = 'America/Lima';
const DEFAULT_SITE_URL = 'https://peloteras.com';
const DEFAULT_INSTAGRAM_URL = 'https://www.instagram.com/peloteraspe/';
const DEFAULT_TIKTOK_URL = 'https://www.tiktok.com/@peloteras.com';
const DEFAULT_SUPPORT_EMAIL = 'contacto@peloteras.com';

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

function formatEventDate(startTime: string | null | undefined) {
  if (!startTime) return 'Por confirmar';
  const date = new Date(startTime);
  if (Number.isNaN(date.getTime())) return 'Por confirmar';
  return date.toLocaleDateString('es-PE', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: DEFAULT_TZ,
  });
}

function formatEventTime(startTime: string | null | undefined) {
  if (!startTime) return 'Por confirmar';
  const date = new Date(startTime);
  if (Number.isNaN(date.getTime())) return 'Por confirmar';
  return date.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: DEFAULT_TZ,
  });
}

function resolveCopy(status: PaymentEmailStatus) {
  if (status === 'approved') {
    return {
      subjectPrefix: 'Pago confirmado',
      title: 'Pago confirmado',
      message: 'Tu entrada ya esta activa y lista para el ingreso.',
      ctaText: 'Ver mi entrada',
    };
  }

  if (status === 'rejected') {
    return {
      subjectPrefix: 'Pago observado',
      title: 'No pudimos validar tu pago',
      message:
        'Tu reserva fue cancelada. Si crees que se trata de un error, responde este correo con tu numero de operacion.',
      ctaText: 'Contactar soporte',
    };
  }

  return {
    subjectPrefix: 'Registro recibido',
    title: 'Ya estas registrada',
    message: 'Recibimos tu pago y estamos validandolo. Cuando se apruebe, tu QR se activara automaticamente.',
    ctaText: 'Ver estado de mi entrada',
  };
}

function buildSubject(status: PaymentEmailStatus, eventTitle: string) {
  const copy = resolveCopy(status);
  return `[Peloteras] ${copy.subjectPrefix} - ${eventTitle}`;
}

function buildEmailHtml(input: {
  name: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  title: string;
  message: string;
  ctaText: string;
  ctaUrl: string;
  homeUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
}) {
  return `
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Peloteras</title>
  </head>
  <body style="margin:0;padding:0;background:#744d7c;font-family:Arial,Helvetica,sans-serif;">
    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#744d7c;padding:20px 0;">
      <tr>
        <td align="center">
          <table width="700" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:700px;max-width:700px;background:#ffffff;">
            <tr>
              <td align="center" style="padding:32px 24px 14px 24px;">
                <a href="${escapeHtml(input.homeUrl)}" target="_blank" rel="noreferrer">
                  <img src="https://res.cloudinary.com/dtisme9jg/image/upload/v1772667120/peloteras_bdvyxk.png" width="190" alt="Peloteras" style="display:block;border:0;height:auto;max-width:190px;" />
                </a>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:6px 24px 0 24px;">
                <h1 style="margin:0;color:#202020;font-size:46px;line-height:1.05;font-weight:800;">${escapeHtml(
                  input.eventTitle
                )}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 30px 6px 30px;text-align:center;color:#111111;font-size:18px;line-height:1.45;">
                <p style="margin:0 0 12px 0;">Hola ${escapeHtml(input.name)},</p>
                <p style="margin:0 0 12px 0;"><strong>${escapeHtml(input.title)}</strong></p>
                <p style="margin:0;">${escapeHtml(input.message)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 30px 8px 30px;">
                <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td width="33.3%" align="center" style="background:#744d7c;color:#ffffff;padding:18px 8px;">
                      <div style="font-size:11px;text-transform:uppercase;letter-spacing:.8px;opacity:.85;">Fecha</div>
                      <div style="font-size:16px;font-weight:700;line-height:1.2;margin-top:6px;">${escapeHtml(
                        input.eventDate
                      )}</div>
                    </td>
                    <td width="33.3%" align="center" style="background:#744d7c;color:#ffffff;padding:18px 8px;border-left:8px solid #ffffff;border-right:8px solid #ffffff;">
                      <div style="font-size:11px;text-transform:uppercase;letter-spacing:.8px;opacity:.85;">Hora</div>
                      <div style="font-size:16px;font-weight:700;line-height:1.2;margin-top:6px;">${escapeHtml(
                        input.eventTime
                      )}</div>
                    </td>
                    <td width="33.3%" align="center" style="background:#744d7c;color:#ffffff;padding:18px 8px;">
                      <div style="font-size:11px;text-transform:uppercase;letter-spacing:.8px;opacity:.85;">Lugar</div>
                      <div style="font-size:16px;font-weight:700;line-height:1.2;margin-top:6px;">${escapeHtml(
                        input.eventLocation
                      )}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:18px 24px 22px 24px;">
                <a href="${escapeHtml(
                  input.ctaUrl
                )}" target="_blank" rel="noreferrer" style="display:inline-block;background:#54086f;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:12px 22px;border-radius:10px;">
                  ${escapeHtml(input.ctaText)}
                </a>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:8px 24px 10px 24px;color:#111111;font-size:18px;font-weight:700;">
                Nos vemos en la cancha
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:6px 24px 30px 24px;">
                <a href="${escapeHtml(input.instagramUrl)}" target="_blank" rel="noreferrer" style="display:inline-block;margin:0 6px;">
                  <img src="https://app-rsrc.getbee.io/public/resources/social-networks-icon-sets/t-only-logo-color/instagram@2x.png" width="30" alt="Instagram" style="border:0;display:block;" />
                </a>
                <a href="${escapeHtml(input.tiktokUrl)}" target="_blank" rel="noreferrer" style="display:inline-block;margin:0 6px;">
                  <img src="https://app-rsrc.getbee.io/public/resources/social-networks-icon-sets/t-only-logo-color/tiktok@2x.png" width="30" alt="TikTok" style="border:0;display:block;" />
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`.trim();
}

export async function sendPaymentStatusEmail(input: SendPaymentStatusEmailInput) {
  const email = String(input.toEmail || '').trim();
  if (!email) {
    log.warn('Skipping payment status email: missing recipient', 'EMAIL', { status: input.status });
    return { sent: false as const, reason: 'missing_recipient' as const };
  }

  const resendApiKey = String(process.env.RESEND_API_KEY || '').trim();
  const from = String(process.env.EMAIL_FROM || process.env.RESEND_FROM || '').trim();

  if (!resendApiKey || !from) {
    log.warn('Skipping payment status email: missing RESEND_API_KEY or EMAIL_FROM', 'EMAIL', {
      status: input.status,
    });
    return { sent: false as const, reason: 'not_configured' as const };
  }

  const baseUrl = resolveBaseUrl();
  const ticketsUrl = normalizeUrl(input.ticketsUrl, `${baseUrl}/tickets`);
  const homeUrl = baseUrl;
  const instagramUrl = normalizeUrl(process.env.NEXT_PUBLIC_INSTAGRAM_URL, DEFAULT_INSTAGRAM_URL);
  const tiktokUrl = normalizeUrl(process.env.NEXT_PUBLIC_TIKTOK_URL, DEFAULT_TIKTOK_URL);
  const supportEmail = String(process.env.NEXT_PUBLIC_SUPPORT_EMAIL || DEFAULT_SUPPORT_EMAIL).trim();

  const eventTitle = String(input.eventTitle || '').trim() || 'Tu pichanga';
  const eventDate = formatEventDate(input.eventStartTime);
  const eventTime = formatEventTime(input.eventStartTime);
  const eventLocation = String(input.eventLocation || '').trim() || 'Por confirmar';
  const name = String(input.toName || '').trim() || 'pelotera';
  const copy = resolveCopy(input.status);
  const ctaUrl = input.status === 'rejected' ? `mailto:${supportEmail}` : ticketsUrl;

  const subject = buildSubject(input.status, eventTitle);
  const html = buildEmailHtml({
    name,
    eventTitle,
    eventDate,
    eventTime,
    eventLocation,
    title: copy.title,
    message: copy.message,
    ctaText: copy.ctaText,
    ctaUrl,
    homeUrl,
    instagramUrl,
    tiktokUrl,
  });

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const responseBody = await response.text().catch(() => '');
      log.warn('Payment status email provider rejected request', 'EMAIL', {
        status: input.status,
        to: email,
        providerStatus: response.status,
        responseBody,
      });
      return { sent: false as const, reason: 'provider_error' as const };
    }

    const payload = await response.json().catch(() => ({}));
    log.info('Payment status email sent', 'EMAIL', {
      status: input.status,
      to: email,
      providerId: (payload as any)?.id || null,
    });

    return { sent: true as const };
  } catch (error) {
    log.error('Payment status email request failed', 'EMAIL', error, {
      status: input.status,
      to: email,
    });
    return { sent: false as const, reason: 'request_failed' as const };
  }
}
