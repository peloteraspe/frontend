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
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Peloteras</title>
  <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700;800&display=swap" rel="stylesheet" type="text/css">
  <link href="https://fonts.googleapis.com/css2?family=Permanent+Marker&display=swap" rel="stylesheet" type="text/css">
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; }
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: inherit !important; }
    #MessageViewBody a { color: inherit; text-decoration: none; }
    p { line-height: inherit; }
    @media (max-width: 720px) {
      .row-content { width: 100% !important; }
      .stack .column { width: 100% !important; display: block !important; }
      .hero-text { font-size: 56px !important; line-height: 0.95 !important; }
      .event-title { font-size: 46px !important; }
    }
  </style>
</head>
<body style="margin:0;background-color:#744d7c;padding:0;-webkit-text-size-adjust:none;text-size-adjust:none;">
  <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0;">
    ${escapeHtml(input.title)} - ${escapeHtml(input.eventTitle)}
  </div>
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
                        <a href="${escapeHtml(input.homeUrl)}" target="_blank" rel="noreferrer">
                          <img src="https://res.cloudinary.com/dtisme9jg/image/upload/v1772667120/peloteras_bdvyxk.png" style="display:block;height:auto;border:0;width:100%;" width="210" alt="Peloteras" />
                        </a>
                      </div>
                    </div>
                  </td>
                </tr>
              </table>
              <div style="height:32px;line-height:32px;font-size:1px;">&#8202;</div>
              <table width="100%" border="0" cellpadding="10" cellspacing="0" role="presentation">
                <tr>
                  <td>
                    <h1 class="event-title" style="margin:0;color:#202020;direction:ltr;font-family:'Oswald',Arial,'Helvetica Neue',Helvetica,sans-serif;font-size:62px;font-weight:700;letter-spacing:-2px;line-height:1;text-align:center;word-break:break-word;padding:0 16px;">
                      ${escapeHtml(input.eventTitle)}
                    </h1>
                  </td>
                </tr>
              </table>
              <div style="height:10px;line-height:10px;font-size:1px;">&#8202;</div>
            </td>
          </tr>
        </table>

        <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" width="700" style="background-color:#ffffff;color:#000000;width:700px;margin:0 auto;">
          <tr>
            <td class="column" width="100%" style="text-align:left;vertical-align:top;">
              <div style="height:16px;line-height:16px;font-size:1px;">&#8202;</div>
              <table width="100%" border="0" cellpadding="10" cellspacing="0" role="presentation">
                <tr>
                  <td>
                    <div style="color:#101112;direction:ltr;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:18px;font-weight:400;letter-spacing:0;line-height:1.25;text-align:center;">
                      <p style="margin:0;margin-bottom:16px;">Hola ${escapeHtml(input.name)},</p>
                      <p style="margin:0;margin-bottom:14px;">
                        <span style="display:inline-block;background:#efe6f4;color:#54086f;font-weight:700;font-size:12px;letter-spacing:.5px;text-transform:uppercase;border-radius:999px;padding:7px 12px;">
                          ${escapeHtml(input.title)}
                        </span>
                      </p>
                      <p style="margin:0;margin-bottom:16px;">${escapeHtml(input.message)}</p>
                    </div>
                  </td>
                </tr>
              </table>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td align="center" style="padding:8px 24px 20px 24px;">
                    <a href="${escapeHtml(input.ctaUrl)}" target="_blank" rel="noreferrer" style="display:inline-block;background:#54086f;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 24px;border-radius:10px;font-family:Arial,Helvetica,sans-serif;box-shadow:0 6px 18px rgba(84,8,111,.24);">
                      ${escapeHtml(input.ctaText)}
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:0 24px 18px 24px;color:#6b7280;font-size:12px;font-family:Arial,Helvetica,sans-serif;word-break:break-all;">
                    Si el boton no abre, copia este enlace: ${escapeHtml(input.ctaUrl)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" width="700" style="background-color:#ffffff;color:#000000;padding:20px;width:700px;margin:0 auto;">
          <tr>
            <td>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td class="column" width="33.33%" style="background-color:#744d7c;text-align:center;padding:20px 12px;">
                    <img src="https://d1oco4z2z1fhwp.cloudfront.net/templates/default/11021/03_Icon_calendar.png" width="39" alt="Fecha" style="display:block;height:auto;border:0;margin:0 auto;">
                    <h3 style="margin:12px 0 0 0;color:#ffffff;font-family:'Oswald',Arial,'Helvetica Neue',Helvetica,sans-serif;font-size:28px;font-weight:600;letter-spacing:-1px;line-height:1.1;text-align:center;">
                      ${escapeHtml(input.eventDate)}
                    </h3>
                  </td>
                  <td class="column" width="33.33%" style="background-color:#744d7c;text-align:center;padding:20px 12px;border-left:8px solid #ffffff;border-right:8px solid #ffffff;">
                    <img src="https://d1oco4z2z1fhwp.cloudfront.net/templates/default/11021/03_Icon_Clock.png" width="39" alt="Hora" style="display:block;height:auto;border:0;margin:0 auto;">
                    <h3 style="margin:12px 0 0 0;color:#ffffff;font-family:'Oswald',Arial,'Helvetica Neue',Helvetica,sans-serif;font-size:28px;font-weight:600;letter-spacing:-1px;line-height:1.1;text-align:center;">
                      ${escapeHtml(input.eventTime)}
                    </h3>
                  </td>
                  <td class="column" width="33.33%" style="background-color:#744d7c;text-align:center;padding:20px 12px;">
                    <img src="https://d1oco4z2z1fhwp.cloudfront.net/templates/default/11021/03_Icon_map-pin.png" width="39" alt="Lugar" style="display:block;height:auto;border:0;margin:0 auto;">
                    <h3 style="margin:12px 0 0 0;color:#ffffff;font-family:'Oswald',Arial,'Helvetica Neue',Helvetica,sans-serif;font-size:28px;font-weight:600;letter-spacing:-1px;line-height:1.1;text-align:center;">
                      ${escapeHtml(input.eventLocation)}
                    </h3>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" width="700" style="background-color:#ffffff;color:#000000;width:700px;margin:0 auto;">
          <tr>
            <td class="column" width="100%" style="text-align:left;vertical-align:top;">
              <table width="100%" border="0" cellpadding="10" cellspacing="0" role="presentation">
                <tr>
                  <td>
                    <div style="color:#101112;direction:ltr;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:18px;font-weight:700;line-height:1.2;text-align:center;">
                      <p style="margin:0;">Nos vemos en la cancha</p>
                    </div>
                  </td>
                </tr>
              </table>
              <div style="height:14px;line-height:14px;font-size:1px;">&#8202;</div>
            </td>
          </tr>
        </table>

        <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" width="700" style="background-color:#000000;background-image:url('https://res.cloudinary.com/dtisme9jg/image/upload/v1772999503/pomelli_image_1_edbcq6.png');background-repeat:no-repeat;background-size:cover;color:#000000;width:700px;margin:0 auto;">
          <tr>
            <td class="column" width="100%" style="text-align:left;vertical-align:top;">
              <table width="100%" border="0" cellpadding="20" cellspacing="0" role="presentation">
                <tr>
                  <td>
                    <div class="hero-text" style="color:#ffffff;direction:ltr;font-family:'Permanent Marker',Impact,Charcoal,sans-serif;font-size:80px;font-weight:400;line-height:0.9;text-align:center;">
                      <p style="margin:0;">TOMEMOS LA CANCHA</p>
                    </div>
                  </td>
                </tr>
              </table>
              <div style="height:150px;line-height:150px;font-size:1px;">&#8202;</div>
            </td>
          </tr>
        </table>

        <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" width="700" style="background-color:#ffffff;color:#000000;width:700px;margin:0 auto;">
          <tr>
            <td class="column" width="100%" style="text-align:left;vertical-align:top;">
              <div style="height:50px;line-height:50px;font-size:1px;">&#8202;</div>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="width:100%;padding:0;">
                    <div align="center">
                      <div style="max-width:140px;">
                        <a href="${escapeHtml(input.homeUrl)}" target="_blank" rel="noreferrer">
                          <img src="https://res.cloudinary.com/dtisme9jg/image/upload/v1772667120/peloteras_bdvyxk.png" style="display:block;height:auto;border:0;width:100%;" width="140" alt="Peloteras">
                        </a>
                      </div>
                    </div>
                  </td>
                </tr>
              </table>
              <div style="height:10px;line-height:10px;font-size:1px;">&#8202;</div>
              <table width="100%" border="0" cellpadding="10" cellspacing="0" role="presentation">
                <tr>
                  <td>
                    <div style="text-align:center;color:#6b7280;font-size:12px;font-family:Arial,Helvetica,sans-serif;margin-bottom:8px;">
                      Siguenos
                    </div>
                    <div align="center">
                      <table width="68" border="0" cellpadding="0" cellspacing="0" role="presentation" style="display:inline-block;">
                        <tr>
                          <td style="padding:0 2px 0 0;">
                            <a href="${escapeHtml(input.instagramUrl)}" target="_blank" rel="noreferrer">
                              <img src="https://app-rsrc.getbee.io/public/resources/social-networks-icon-sets/t-only-logo-color/instagram@2x.png" width="32" alt="Instagram" style="display:block;height:auto;border:0;">
                            </a>
                          </td>
                          <td style="padding:0 0 0 2px;">
                            <a href="${escapeHtml(input.tiktokUrl)}" target="_blank" rel="noreferrer">
                              <img src="https://app-rsrc.getbee.io/public/resources/social-networks-icon-sets/t-only-logo-color/tiktok@2x.png" width="32" alt="TikTok" style="display:block;height:auto;border:0;">
                            </a>
                          </td>
                        </tr>
                      </table>
                    </div>
                  </td>
                </tr>
              </table>
              <div style="height:50px;line-height:50px;font-size:1px;">&#8202;</div>
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
