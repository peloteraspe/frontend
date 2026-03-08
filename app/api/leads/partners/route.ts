import { NextResponse } from 'next/server';
import { getServerSupabase } from '@core/api/supabase.server';
import { rateLimitByRequest } from '@core/api/rateLimit';

type LeadType = 'admin' | 'sponsor';

type LeadPayload = {
  leadType?: string;
  source?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  organizationName?: string;
  district?: string;
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

function isValidPhone(phone: string) {
  return /^[+\d()\-\s]{7,24}$/.test(phone);
}

function validationError(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function compactObject(input: Record<string, string | null | undefined>) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => Boolean(value)));
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
    const contactPhone = sanitizeText(body.contactPhone, 32);
    const district = sanitizeText(body.district, 100);
    const organizationName = sanitizeText(body.organizationName, 140);

    if (contactName.length < 3) {
      return validationError('Ingresa tu nombre completo.');
    }

    if (leadTypeRaw === 'admin') {
      if (!contactPhone || !isValidPhone(contactPhone)) {
        return validationError('Ingresa un WhatsApp válido.');
      }
      if (contactEmail && !isValidEmail(contactEmail)) {
        return validationError('El correo ingresado no es válido.');
      }
      if (!district) {
        return validationError('Ingresa tu distrito base.');
      }
    }

    if (leadTypeRaw === 'sponsor') {
      if (!organizationName) {
        return validationError('Ingresa el nombre de tu marca o empresa.');
      }
      if (!contactEmail || !isValidEmail(contactEmail)) {
        return validationError('Ingresa un correo válido.');
      }
      if (contactPhone && !isValidPhone(contactPhone)) {
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
      contact_phone: contactPhone || null,
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

    return NextResponse.json(
      {
        ok: true,
        message:
          leadTypeRaw === 'admin'
            ? 'Gracias. Te contactaremos para activar tu comunidad en Peloteras.'
            : 'Gracias. Te contactaremos para diseñar una propuesta de patrocinio.',
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 });
  }
}
