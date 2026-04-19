import { getAdminSupabase } from '@core/api/supabase.admin';
import { log } from '@core/lib/logger';
import { buildCheckinPublicUrl, buildCheckinQrImageUrl, isValidCheckinSlug, sanitizeCheckinSlug } from '@modules/checkins/lib/checkins';
import type {
  CheckinDetail,
  CheckinEventOption,
  CheckinEventSummary,
  CheckinListItem,
  CheckinPublicView,
  CheckinRegistration,
} from '@modules/checkins/model/types';

const DEFAULT_TIMEZONE = 'America/Lima';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class CheckinServiceError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'CheckinServiceError';
    this.status = status;
  }
}

type EventRow = {
  id: number | string;
  title?: string | null;
  start_time?: string | null;
  location_text?: string | null;
};

type CheckinRow = {
  id: number | string;
  name?: string | null;
  slug?: string | null;
  created_at?: string | null;
  is_active?: boolean | null;
  event_id?: number | string | null;
};

type CheckinRegistrationRow = {
  id: number | string;
  checkin_id?: number | string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  created_at?: string | null;
};

function normalizeText(value: unknown) {
  return String(value || '').trim();
}

function normalizeEmail(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function getErrorMessage(error: unknown, fallback = '') {
  if (error instanceof Error) {
    const message = error.message.trim();
    return message || fallback;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: unknown }).message || '').trim();
    return message || fallback;
  }

  if (typeof error === 'string') {
    const message = error.trim();
    return message || fallback;
  }

  return fallback;
}

function checkinsTableHint(error: any) {
  const message = getErrorMessage(error, '').toLowerCase();
  const details =
    error && typeof error === 'object' && 'details' in error
      ? String((error as { details?: unknown }).details || '').toLowerCase()
      : '';
  const combined = `${message} ${details}`.trim();

  if (
    combined.includes('event_checkin') ||
    combined.includes('event_checkin_registration') ||
    (/(schema cache|relation|table|could not find|does not exist)/i.test(combined) &&
      /event_checkin|event_checkin_registration/i.test(combined))
  ) {
    return 'La tabla de check-ins no existe todavía. Ejecuta la migración nueva de Supabase.';
  }

  return null;
}

function formatEventTitle(event: Partial<EventRow> | null | undefined, fallbackId?: string) {
  const title = normalizeText(event?.title);
  if (title) return title;
  return fallbackId ? `Evento #${fallbackId}` : 'Evento sin título';
}

function formatEventSummary(event: Partial<EventRow> | null | undefined, fallbackId?: string): CheckinEventSummary {
  return {
    id: normalizeText(event?.id ?? fallbackId),
    title: formatEventTitle(event, fallbackId),
    startTime: event?.start_time ? String(event.start_time) : null,
    locationText: normalizeText(event?.location_text) || null,
  };
}

function formatEventOptionLabel(event: Partial<EventRow>) {
  const title = formatEventTitle(event, normalizeText(event?.id));
  if (!event?.start_time) return title;

  const parsed = new Date(event.start_time);
  if (Number.isNaN(parsed.getTime())) return title;

  const label = new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: DEFAULT_TIMEZONE,
  }).format(parsed);

  return `${title} · ${label}`;
}

function mapCheckinListItem(row: CheckinRow, event: Partial<EventRow> | undefined, registrationCount: number): CheckinListItem {
  const slug = sanitizeCheckinSlug(normalizeText(row.slug));

  return {
    id: normalizeText(row.id),
    name: normalizeText(row.name) || `Check-in ${formatEventTitle(event, normalizeText(row.event_id))}`,
    slug,
    createdAt: row.created_at ? String(row.created_at) : '',
    isActive: row.is_active !== false,
    publicUrl: buildCheckinPublicUrl(slug),
    qrImageUrl: buildCheckinQrImageUrl(slug),
    registrationCount,
    event: formatEventSummary(event, normalizeText(row.event_id)),
  };
}

function mapRegistration(row: CheckinRegistrationRow): CheckinRegistration {
  return {
    id: normalizeText(row.id),
    firstName: normalizeText(row.first_name),
    lastName: normalizeText(row.last_name),
    email: normalizeText(row.email),
    phone: normalizeText(row.phone),
    createdAt: row.created_at ? String(row.created_at) : '',
  };
}

async function getEventMap(eventIds: string[]) {
  if (!eventIds.length) return new Map<string, EventRow>();

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('event')
    .select('id,title,start_time,location_text')
    .in('id', eventIds);

  if (error) {
    log.database('SELECT check-in events', 'event', error, { eventIds });
    throw new CheckinServiceError('No se pudieron cargar los eventos de los check-ins.', 500);
  }

  return new Map((data || []).map((event) => [normalizeText((event as EventRow).id), event as EventRow]));
}

async function getRegistrationCounts(checkinIds: string[]) {
  if (!checkinIds.length) return new Map<string, number>();

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('event_checkin_registration')
    .select('checkin_id')
    .in('checkin_id', checkinIds);

  if (error) {
    log.database('SELECT check-in registration counts', 'event_checkin_registration', error, { checkinIds });
    const hint = checkinsTableHint(error);
    if (hint) throw new CheckinServiceError(hint, 500);
    throw new CheckinServiceError('No se pudieron contar las inscripciones de check-in.', 500);
  }

  const counts = new Map<string, number>();
  (data || []).forEach((row: { checkin_id?: number | string | null }) => {
    const key = normalizeText(row.checkin_id);
    if (!key) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  return counts;
}

export async function getCheckinEventOptions(): Promise<CheckinEventOption[]> {
  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('event')
    .select('id,title,start_time')
    .order('start_time', { ascending: false });

  if (error) {
    log.database('SELECT check-in event options', 'event', error);
    throw new CheckinServiceError('No se pudieron cargar los eventos disponibles para check-in.', 500);
  }

  return (data || []).map((event) => {
    const row = event as EventRow;
    return {
      id: normalizeText(row.id),
      title: formatEventTitle(row, normalizeText(row.id)),
      label: formatEventOptionLabel(row),
      startTime: row.start_time ? String(row.start_time) : null,
    };
  });
}

export async function listAdminCheckins(): Promise<CheckinListItem[]> {
  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('event_checkin')
    .select('id,name,slug,created_at,is_active,event_id')
    .order('created_at', { ascending: false });

  if (error) {
    log.database('SELECT admin check-ins', 'event_checkin', error);
    const hint = checkinsTableHint(error);
    if (hint) throw new CheckinServiceError(hint, 500);
    throw new CheckinServiceError('No se pudieron cargar los check-ins.', 500);
  }

  const rows = (data || []) as CheckinRow[];
  const eventIds = Array.from(new Set(rows.map((row) => normalizeText(row.event_id)).filter(Boolean)));
  const checkinIds = rows.map((row) => normalizeText(row.id)).filter(Boolean);
  const [eventMap, registrationCounts] = await Promise.all([getEventMap(eventIds), getRegistrationCounts(checkinIds)]);

  return rows.map((row) =>
    mapCheckinListItem(
      row,
      eventMap.get(normalizeText(row.event_id)),
      registrationCounts.get(normalizeText(row.id)) || 0
    )
  );
}

export async function getAdminCheckinDetail(id: string): Promise<CheckinDetail | null> {
  const checkinId = normalizeText(id);
  if (!checkinId) return null;

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('event_checkin')
    .select('id,name,slug,created_at,is_active,event_id')
    .eq('id', checkinId)
    .maybeSingle();

  if (error) {
    log.database('SELECT admin check-in detail', 'event_checkin', error, { checkinId });
    const hint = checkinsTableHint(error);
    if (hint) throw new CheckinServiceError(hint, 500);
    throw new CheckinServiceError('No se pudo cargar el check-in solicitado.', 500);
  }

  if (!data) return null;

  const row = data as CheckinRow;
  const [eventMap, registrationsResponse] = await Promise.all([
    getEventMap([normalizeText(row.event_id)]),
    admin
      .from('event_checkin_registration')
      .select('id,checkin_id,first_name,last_name,email,phone,created_at')
      .eq('checkin_id', checkinId)
      .order('created_at', { ascending: false }),
  ]);

  if (registrationsResponse.error) {
    log.database(
      'SELECT admin check-in registrations',
      'event_checkin_registration',
      registrationsResponse.error,
      { checkinId }
    );
    const hint = checkinsTableHint(registrationsResponse.error);
    if (hint) throw new CheckinServiceError(hint, 500);
    throw new CheckinServiceError('No se pudieron cargar las personas registradas en este check-in.', 500);
  }

  const registrations = ((registrationsResponse.data || []) as CheckinRegistrationRow[]).map(mapRegistration);
  const item = mapCheckinListItem(row, eventMap.get(normalizeText(row.event_id)), registrations.length);

  return {
    ...item,
    registrations,
  };
}

export async function getPublicCheckinBySlug(slug: string): Promise<CheckinPublicView | null> {
  const normalizedSlug = sanitizeCheckinSlug(slug);
  if (!normalizedSlug || !isValidCheckinSlug(normalizedSlug)) return null;

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('event_checkin')
    .select('id,name,slug,is_active,event_id')
    .eq('slug', normalizedSlug)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    log.database('SELECT public check-in by slug', 'event_checkin', error, { normalizedSlug });
    const hint = checkinsTableHint(error);
    if (hint) throw new CheckinServiceError(hint, 500);
    throw new CheckinServiceError('No se pudo cargar el formulario de check-in.', 500);
  }

  if (!data) return null;

  const row = data as CheckinRow;
  const eventMap = await getEventMap([normalizeText(row.event_id)]);
  const event = eventMap.get(normalizeText(row.event_id));

  return {
    id: normalizeText(row.id),
    name: normalizeText(row.name) || `Check-in ${formatEventTitle(event, normalizeText(row.event_id))}`,
    slug: normalizedSlug,
    publicUrl: buildCheckinPublicUrl(normalizedSlug),
    qrImageUrl: buildCheckinQrImageUrl(normalizedSlug),
    event: formatEventSummary(event, normalizeText(row.event_id)),
  };
}

export async function createCheckin(input: {
  eventId: string;
  name: string;
  slug: string;
  createdBy: string;
}) {
  const eventId = normalizeText(input.eventId);
  const name = normalizeText(input.name);
  const slug = sanitizeCheckinSlug(input.slug);
  const createdBy = normalizeText(input.createdBy);

  if (!eventId) {
    throw new CheckinServiceError('Selecciona un evento para este check-in.');
  }

  if (!name) {
    throw new CheckinServiceError('Ingresa un nombre interno para identificar este check-in.');
  }

  if (!slug) {
    throw new CheckinServiceError('Ingresa un slug para generar el link personalizado.');
  }

  if (!isValidCheckinSlug(slug)) {
    throw new CheckinServiceError('El slug solo puede usar letras minúsculas, números y guiones.');
  }

  const admin = getAdminSupabase();
  const { data: event, error: eventError } = await admin
    .from('event')
    .select('id,title,start_time,location_text')
    .eq('id', eventId)
    .maybeSingle();

  if (eventError) {
    log.database('SELECT create check-in event', 'event', eventError, { eventId });
    throw new CheckinServiceError('No se pudo validar el evento seleccionado.', 500);
  }

  if (!event) {
    throw new CheckinServiceError('El evento seleccionado no existe.');
  }

  const { data, error } = await admin
    .from('event_checkin')
    .insert({
      event_id: eventId,
      name,
      slug,
      created_by: createdBy || null,
    })
    .select('id,name,slug,created_at,is_active,event_id')
    .single();

  if (error) {
    log.database('INSERT check-in', 'event_checkin', error, {
      eventId,
      slug,
      createdBy,
    });

    const hint = checkinsTableHint(error);
    if (hint) throw new CheckinServiceError(hint, 500);
    if (String(error.code || '').trim() === '23505') {
      throw new CheckinServiceError('Ya existe un check-in con ese link personalizado.', 409);
    }

    throw new CheckinServiceError('No se pudo crear el check-in.', 500);
  }

  return mapCheckinListItem(data as CheckinRow, event as EventRow, 0);
}

export async function createCheckinRegistration(input: {
  checkinId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}) {
  const checkinId = normalizeText(input.checkinId);
  const firstName = normalizeText(input.firstName);
  const lastName = normalizeText(input.lastName);
  const email = normalizeText(input.email);
  const normalizedEmail = normalizeEmail(input.email);
  const phone = normalizeText(input.phone);

  if (!checkinId) {
    throw new CheckinServiceError('No encontramos el check-in solicitado.');
  }

  if (!firstName) {
    throw new CheckinServiceError('Ingresa tu nombre.');
  }

  if (!lastName) {
    throw new CheckinServiceError('Ingresa tu apellido.');
  }

  if (!normalizedEmail || !EMAIL_PATTERN.test(normalizedEmail)) {
    throw new CheckinServiceError('Ingresa un correo válido.');
  }

  if (!phone) {
    throw new CheckinServiceError('Ingresa tu celular.');
  }

  const admin = getAdminSupabase();
  const { data: checkin, error: checkinError } = await admin
    .from('event_checkin')
    .select('id,is_active')
    .eq('id', checkinId)
    .eq('is_active', true)
    .maybeSingle();

  if (checkinError) {
    log.database('SELECT check-in before registration', 'event_checkin', checkinError, { checkinId });
    const hint = checkinsTableHint(checkinError);
    if (hint) throw new CheckinServiceError(hint, 500);
    throw new CheckinServiceError('No se pudo validar el check-in.', 500);
  }

  if (!checkin) {
    throw new CheckinServiceError('Este check-in ya no está disponible.', 404);
  }

  const { data, error } = await admin
    .from('event_checkin_registration')
    .insert({
      checkin_id: checkinId,
      first_name: firstName,
      last_name: lastName,
      email,
      email_normalized: normalizedEmail,
      phone,
    })
    .select('id,checkin_id,first_name,last_name,email,phone,created_at')
    .single();

  if (error) {
    log.database('INSERT check-in registration', 'event_checkin_registration', error, {
      checkinId,
      normalizedEmail,
    });

    const hint = checkinsTableHint(error);
    if (hint) throw new CheckinServiceError(hint, 500);
    if (String(error.code || '').trim() === '23505') {
      throw new CheckinServiceError('Este correo ya quedó registrado en este check-in.', 409);
    }

    throw new CheckinServiceError('No se pudo registrar la inscripción.', 500);
  }

  return mapRegistration(data as CheckinRegistrationRow);
}
