import { NextResponse } from 'next/server';
import { getServerSupabase } from '@core/api/supabase.server';
import { rateLimitByRequest } from '@core/api/rateLimit';
import { log } from '@core/lib/logger';
import { sendEventAnnouncementEmail } from '@modules/admin/api/events/services/eventAnnouncementEmail.service';
import { getSuperAdminEmails } from '@shared/lib/auth/isAdmin';
import { validateInternationalPhone } from '@shared/lib/phone';

type LeadType = 'admin' | 'sponsor';

type LeadPayload = {
  leadType?: string;
  source?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  organizationName?: string;
  district?: string;
  commitmentReservedField?: string | boolean;
  commitmentNoCancellation?: string | boolean;
  commitmentReportIncidents?: string | boolean;
};

function isLeadType(value: string): value is LeadType {
  return value === 'admin' || value === 'sponsor';
}

function sanitizeText(value: unknown, maxLength = 160) {
  return String(value || '').trim().slice(0, maxLength);
}

function normalizeSource(value: unknown) {
  const source = sanitizeText(value, 80);
  return source || 'landing_growth_blocks';
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validationError(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function compactObject(input: Record<string, string | null | undefined>) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => Boolean(value)));
}

function parseBoolean(value: unknown) {
  if (value === true) return true;
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'on' || normalized === 'yes';
}

function resolveBaseUrl() {
  const candidate = String(process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || '').trim();
  if (!candidate) return 'https://peloteras.com';

  try {
    const parsed = new URL(candidate);
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return 'https://peloteras.com';
  }
}

async function notifySuperAdmins(input: {
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  district: string;
  source: string;
}) {
  const recipients = getSuperAdminEmails();
  if (!recipients.length) return;

  const body = [
    'Llegó una nueva solicitud para ser admin en Peloteras.',
    '',
    `Nombre: ${input.contactName}`,
    `Celular: ${input.contactPhone}`,
    `Correo: ${input.contactEmail || 'Sin correo'}`,
    `Distrito: ${input.district || 'Sin distrito'}`,
    `Origen: ${input.source}`,
    '',
    'Revisa la solicitud en el módulo de Admin > Solicitudes.',
  ].join('\n');

  await sendEventAnnouncementEmail({
    recipients,
    subject: `[Peloteras] Nueva solicitud admin - ${input.contactName}`,
    body,
    ctaLabel: 'Ver solicitudes',
    ctaUrl: `${resolveBaseUrl()}/admin/requests`,
    baseUrl: resolveBaseUrl(),
  });
}

export async function POST(request: Request) {
  const limited = await rateLimitByRequest(request, {
    keyPrefix: 'api_partner_leads_post',
    limit: 8,
    windowMs: 10 * 60_000,
    message: 'Has enviado demasiadas solicitudes. Intenta nuevamente en unos minutos.',
  });
  if (limited) return limited;

  try {
    const body = (await request.json().catch(() => ({}))) as LeadPayload;

    const leadTypeRaw = sanitizeText(body.leadType, 20).toLowerCase();
    if (!isLeadType(leadTypeRaw)) {
      return validationError('Tipo de formulario inválido.');
    }

    const source = normalizeSource(body.source);
    const contactName = sanitizeText(body.contactName, 120);
    const contactEmail = sanitizeText(body.contactEmail, 160).toLowerCase();
    const contactPhone = sanitizeText(body.contactPhone, 40);
    const district = sanitizeText(body.district, 100);
    const organizationName = sanitizeText(body.organizationName, 140);
    const commitmentReservedField = parseBoolean(body.commitmentReservedField);
    const commitmentNoCancellation = parseBoolean(body.commitmentNoCancellation);
    const commitmentReportIncidents = parseBoolean(body.commitmentReportIncidents);
    const contactPhoneValidation = contactPhone ? validateInternationalPhone(contactPhone) : null;
    const normalizedContactPhone = contactPhoneValidation?.e164 || '';

    if (contactName.length < 3) {
      return validationError('Ingresa tu nombre completo.');
    }

    if (leadTypeRaw === 'admin') {
      if (!contactPhone || !contactPhoneValidation?.isValid) {
        return validationError('Ingresa un WhatsApp válido.');
      }
      if (contactEmail && !isValidEmail(contactEmail)) {
        return validationError('El correo ingresado no es válido.');
      }
      if (!district) {
        return validationError('Ingresa tu distrito base.');
      }
      if (!commitmentReservedField || !commitmentNoCancellation || !commitmentReportIncidents) {
        return validationError('Debes aceptar todos los compromisos para enviar tu solicitud.');
      }
    }

    if (leadTypeRaw === 'sponsor') {
      if (!organizationName) {
        return validationError('Ingresa el nombre de tu marca o empresa.');
      }
      if (!contactEmail || !isValidEmail(contactEmail)) {
        return validationError('Ingresa un correo válido.');
      }
      if (contactPhone && !contactPhoneValidation?.isValid) {
        return validationError('El WhatsApp no tiene un formato válido.');
      }
    }

    const supabase = await getServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from('partner_leads').insert({
      lead_type: leadTypeRaw,
      contact_name: contactName,
      contact_email: contactEmail || null,
      contact_phone: normalizedContactPhone || null,
      organization_name: leadTypeRaw === 'sponsor' ? organizationName || null : null,
      location_label: leadTypeRaw === 'admin' ? district || null : null,
      interest_level: null,
      budget_range: null,
      message: null,
      source,
      user_id: user?.id ?? null,
      metadata: compactObject(
        leadTypeRaw === 'admin'
          ? {
              district,
              commitment_reserved_field: commitmentReservedField ? 'true' : undefined,
              commitment_no_cancellation: commitmentNoCancellation ? 'true' : undefined,
              commitment_report_incidents: commitmentReportIncidents ? 'true' : undefined,
            }
          : {}
      ),
    });

    if (error) {
      const dbMessage = String(error.message || '').toLowerCase();
      if (dbMessage.includes('partner_leads') && dbMessage.includes('does not exist')) {
        return NextResponse.json(
          { error: 'Falta la migración de partner_leads en Supabase.' },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { error: 'No se pudo guardar tu solicitud. Intenta nuevamente.' },
        { status: 500 }
      );
    }

    if (leadTypeRaw === 'admin') {
      try {
        await notifySuperAdmins({
          contactName,
          contactPhone: normalizedContactPhone,
          contactEmail,
          district,
          source,
        });
      } catch (error) {
        log.warn('No se pudo notificar la nueva solicitud admin por correo', 'ADMIN_REQUESTS', {
          contactName,
          source,
          error: error instanceof Error ? error.message : String(error || ''),
        });
      }
    }

    return NextResponse.json(
      {
        ok: true,
        message:
          leadTypeRaw === 'admin'
            ? 'Gracias. Recibimos tu solicitud y la revisaremos pronto.'
            : 'Gracias. Te contactaremos para diseñar una propuesta de patrocinio.',
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 });
  }
}
