import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { getServerSupabase } from '@core/api/supabase.server';
import { getAdminSupabase } from '@core/api/supabase.admin';
import { rateLimitByRequest } from '@core/api/rateLimit';
import { log } from '@core/lib/logger';
import { sendEventAnnouncementEmail } from '@modules/admin/api/events/services/eventAnnouncementEmail.service';
import { activateOrganizerByUserId } from '@modules/admin/api/users/services/adminUsers.service';
import { getSuperAdminEmails } from '@shared/lib/auth/isAdmin';

type OrganizerActivationPayload = {
  phone?: string;
  source?: string;
  commitmentReservedField?: string | boolean;
  commitmentNoCancellation?: string | boolean;
  commitmentReportIncidents?: string | boolean;
};

function sanitizeText(value: unknown, maxLength = 160) {
  return String(value || '').trim().slice(0, maxLength);
}

function parseBoolean(value: unknown) {
  if (value === true) return true;
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'on' || normalized === 'yes';
}

function isValidPhone(phone: string) {
  return /^[+\d()\-\s]{7,24}$/.test(phone);
}

function compactObject(input: Record<string, string | null | undefined>) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => Boolean(value)));
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

async function trackOrganizerActivation(input: {
  userId: string;
  contactName: string;
  contactEmail: string | null;
  phone: string;
  source: string;
  activatedAt: string;
}) {
  const adminSupabase = getAdminSupabase();
  const { data: latestLead, error: latestLeadError } = await adminSupabase
    .from('partner_leads')
    .select('id,location_label')
    .eq('lead_type', 'admin')
    .eq('user_id', input.userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestLeadError) throw new Error(latestLeadError.message);

  const payload = {
    contact_name: input.contactName,
    contact_email: input.contactEmail,
    contact_phone: input.phone,
    source: input.source,
    user_id: input.userId,
    status: 'qualified',
    metadata: compactObject({
      activation_mode: 'self_serve',
      activation_source: input.source,
      activated_at: input.activatedAt,
      commitment_reserved_field: 'true',
      commitment_no_cancellation: 'true',
      commitment_report_incidents: 'true',
    }),
    updated_at: input.activatedAt,
  };

  if (latestLead?.id) {
    const { error: updateError } = await adminSupabase
      .from('partner_leads')
      .update({
        ...payload,
        location_label: latestLead.location_label || null,
      })
      .eq('id', latestLead.id);

    if (updateError) throw new Error(updateError.message);
    return;
  }

  const { error: insertError } = await adminSupabase.from('partner_leads').insert({
    ...payload,
    lead_type: 'admin',
    organization_name: null,
    location_label: null,
    interest_level: null,
    budget_range: null,
    message: null,
  });

  if (insertError) throw new Error(insertError.message);
}

async function notifySuperAdmins(input: {
  contactName: string;
  contactEmail: string | null;
  phone: string;
  source: string;
}) {
  const recipients = getSuperAdminEmails();
  if (!recipients.length) return;

  const baseUrl = resolveBaseUrl();
  const body = [
    'Una pelotera activó su perfil organizadora desde el flujo de crear evento.',
    '',
    `Nombre: ${input.contactName}`,
    `Celular: ${input.phone}`,
    `Correo: ${input.contactEmail || 'Sin correo'}`,
    `Origen: ${input.source}`,
    '',
    'Ya puede crear eventos y guardar borradores desde el panel admin.',
  ].join('\n');

  await sendEventAnnouncementEmail({
    recipients,
    subject: `[Peloteras] Nueva organizadora activada - ${input.contactName}`,
    body,
    ctaLabel: 'Ver usuarias',
    ctaUrl: `${baseUrl}/admin/users`,
    baseUrl,
  });
}

export async function POST(request: Request) {
  const limited = await rateLimitByRequest(request, {
    keyPrefix: 'api_organizer_activate_post',
    limit: 5,
    windowMs: 10 * 60_000,
    message: 'Has intentado activar tu perfil demasiadas veces. Intenta nuevamente en unos minutos.',
  });
  if (limited) return limited;

  try {
    const body = (await request.json().catch(() => ({}))) as OrganizerActivationPayload;
    const phone = sanitizeText(body.phone, 32);
    const source = sanitizeText(body.source, 80) || 'events_explorer';
    const commitmentReservedField = parseBoolean(body.commitmentReservedField);
    const commitmentNoCancellation = parseBoolean(body.commitmentNoCancellation);
    const commitmentReportIncidents = parseBoolean(body.commitmentReportIncidents);

    if (!phone || !isValidPhone(phone)) {
      return NextResponse.json({ error: 'Ingresa un celular válido.' }, { status: 400 });
    }

    if (!commitmentReservedField || !commitmentNoCancellation || !commitmentReportIncidents) {
      return NextResponse.json(
        { error: 'Debes aceptar todos los compromisos para activar tu perfil organizadora.' },
        { status: 400 }
      );
    }

    const supabase = await getServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json({ error: 'Debes iniciar sesión para crear eventos.' }, { status: 401 });
    }

    const activation = await activateOrganizerByUserId(user.id, {
      phone,
      source,
      commitmentReservedField,
      commitmentNoCancellation,
      commitmentReportIncidents,
    });

    try {
      await trackOrganizerActivation({
        userId: user.id,
        contactName: activation.contactName,
        contactEmail: activation.contactEmail,
        phone: activation.phone,
        source: activation.source,
        activatedAt: activation.activatedAt,
      });
      revalidatePath('/admin/requests');
      revalidatePath('/admin/users');
    } catch (error) {
      log.warn('No se pudo registrar el monitoreo de activación organizadora', 'ORGANIZER', {
        userId: user.id,
        error: error instanceof Error ? error.message : String(error || ''),
      });
    }

    try {
      await notifySuperAdmins({
        contactName: activation.contactName,
        contactEmail: activation.contactEmail,
        phone: activation.phone,
        source: activation.source,
      });
    } catch (error) {
      log.warn('No se pudo notificar la activación organizadora por correo', 'ORGANIZER', {
        userId: user.id,
        error: error instanceof Error ? error.message : String(error || ''),
      });
    }

    return NextResponse.json({
      ok: true,
      message: 'Tu perfil organizadora ya está activo.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo activar tu perfil organizadora.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
