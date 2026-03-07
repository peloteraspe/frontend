import { NextResponse } from 'next/server';
import { getServerSupabase } from '@core/api/supabase.server';
import {
  clientIdentifierFromRequest,
  rateLimitByIdentifier,
  rateLimitByRequest,
} from '@core/api/rateLimit';
import { getEventCatalogs } from '@modules/events/api/queries/getEventCatalogs';
import { getEventsExplorer } from '@modules/events/api/queries/getEventsExplorer';
import { CreateEventPayload, EventEntity } from '@modules/events/model/types';

const EVENTS_TIMEOUT_MS = 4500;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutError: Error) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => {
        if (timer) clearTimeout(timer);
        reject(timeoutError);
      }, timeoutMs);
    }),
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function parseNumber(value: unknown, fallback = 0) {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthKm = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const start = toRad(aLat);
  const end = toRad(bLat);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(start) * Math.cos(end);

  return 2 * earthKm * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function isSameDate(dateIso: string | null, dateFilter: string) {
  if (!dateIso) return false;
  const dt = new Date(dateIso);
  if (Number.isNaN(dt.getTime())) return false;
  return dt.toISOString().slice(0, 10) === dateFilter;
}

function applyFilters(events: EventEntity[], requestUrl: string) {
  const { searchParams } = new URL(requestUrl);

  const q = (searchParams.get('q') || '').trim().toLowerCase();
  const date = (searchParams.get('date') || '').trim();
  const eventTypeId = parseNumber(searchParams.get('eventTypeId'), 0);
  const levelId = parseNumber(searchParams.get('levelId'), 0);
  const distanceKm = parseNumber(searchParams.get('distanceKm'), 0);
  const userLat = parseNumber(searchParams.get('userLat'), 0);
  const userLng = parseNumber(searchParams.get('userLng'), 0);
  const shouldFilterDistance = distanceKm > 0 && userLat !== 0 && userLng !== 0;

  let filtered = [...events];

  if (q) {
    filtered = filtered.filter(
      (event) =>
        event.title.toLowerCase().includes(q) ||
        event.locationText.toLowerCase().includes(q) ||
        event.district.toLowerCase().includes(q)
    );
  }

  if (date) {
    filtered = filtered.filter((event) => isSameDate(event.startTime, date));
  }

  if (eventTypeId > 0) {
    filtered = filtered.filter((event) => event.eventTypeId === eventTypeId);
  }

  if (levelId > 0) {
    filtered = filtered.filter((event) => event.levelId === levelId);
  }

  if (shouldFilterDistance) {
    filtered = filtered
      .map((event) => {
        const km = haversineKm(userLat, userLng, event.location.lat, event.location.lng);
        return {
          ...event,
          distanceKm: Number(km.toFixed(1)),
        };
      })
      .filter((event) => (event.distanceKm ?? 0) <= distanceKm)
      .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  }

  return filtered;
}

function validatePayload(body: any): CreateEventPayload {
  const payload: CreateEventPayload = {
    title: String(body?.title ?? '').trim(),
    description: String(body?.description ?? '').trim(),
    startTime: String(body?.startTime ?? '').trim(),
    endTime: String(body?.endTime ?? '').trim(),
    price: parseNumber(body?.price),
    minUsers: parseNumber(body?.minUsers),
    maxUsers: parseNumber(body?.maxUsers),
    district: String(body?.district ?? '').trim(),
    locationText: String(body?.locationText ?? '').trim(),
    locationReference: String(body?.locationReference ?? '').trim(),
    lat: parseNumber(body?.lat),
    lng: parseNumber(body?.lng),
    eventTypeId: parseNumber(body?.eventTypeId),
    levelId: parseNumber(body?.levelId),
  };

  if (!payload.title) throw new Error('El título es obligatorio.');
  if (!payload.startTime || !payload.endTime) throw new Error('Debes indicar fecha y hora.');

  const startTimestamp = new Date(payload.startTime).getTime();
  const endTimestamp = new Date(payload.endTime).getTime();
  if (!Number.isFinite(startTimestamp) || !Number.isFinite(endTimestamp)) {
    throw new Error('Formato de fecha y hora inválido.');
  }
  if (endTimestamp <= startTimestamp) {
    throw new Error('La fecha y hora de fin debe ser posterior al inicio.');
  }

  if (!payload.locationText) throw new Error('La dirección es obligatoria.');
  if (!payload.district) {
    throw new Error('Selecciona un distrito válido.');
  }
  if (!Number.isFinite(payload.lat) || !Number.isFinite(payload.lng)) {
    throw new Error('Debes seleccionar un punto válido en el mapa.');
  }
  if (payload.lat === 0 && payload.lng === 0) {
    throw new Error('Debes seleccionar un punto válido en el mapa.');
  }
  if (payload.maxUsers <= 0 || payload.minUsers <= 0) {
    throw new Error('La cantidad de jugadoras debe ser mayor a cero.');
  }
  if (payload.minUsers > payload.maxUsers) {
    throw new Error('Mínimo no puede ser mayor que máximo.');
  }
  if (!payload.eventTypeId || !payload.levelId) {
    throw new Error('Selecciona tipo de evento y nivel.');
  }

  return payload;
}

export async function GET(request: Request) {
  const limited = await rateLimitByRequest(request, {
    keyPrefix: 'api_events_get',
    limit: 180,
    windowMs: 60_000,
    message: 'Has realizado demasiadas consultas de eventos. Inténtalo nuevamente en un minuto.',
  });
  if (limited) return limited;

  try {
    const [events, catalogs] = await withTimeout(
      Promise.all([getEventsExplorer(), getEventCatalogs()]),
      EVENTS_TIMEOUT_MS,
      new Error('Events catalog query timeout')
    );
    const data = applyFilters(events, request.url);
    return NextResponse.json({ data, catalogs }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    if (error instanceof Error && error.message === 'Events catalog query timeout') {
      return NextResponse.json(
        {
          data: [],
          catalogs: {
            eventTypes: [],
            levels: [],
          },
          degraded: true,
        },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }
    return NextResponse.json({ error: error.message || 'No se pudo listar eventos.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const clientId = clientIdentifierFromRequest(request);
  const limitedByIp = await rateLimitByIdentifier({
    keyPrefix: 'api_events_post_ip',
    identifier: clientId,
    limit: 12,
    windowMs: 10 * 60_000,
    message:
      'Has realizado demasiados intentos de creación de eventos. Espera unos minutos e intenta nuevamente.',
  });
  if (limitedByIp) return limitedByIp;

  try {
    const supabase = await getServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 });
    }

    const limitedByUser = await rateLimitByIdentifier({
      keyPrefix: 'api_events_post_user',
      identifier: `user:${user.id}`,
      limit: 6,
      windowMs: 10 * 60_000,
      message:
        'Superaste el límite temporal para crear eventos. Espera unos minutos e intenta nuevamente.',
    });
    if (limitedByUser) return limitedByUser;

    const body = await request.json();
    const payload = validatePayload(body);
    const catalogs = await getEventCatalogs();

    const validEventType = catalogs.eventTypes.some((item) => item.id === payload.eventTypeId);
    const validLevel = catalogs.levels.some((item) => item.id === payload.levelId);

    if (!validEventType || !validLevel) {
      return NextResponse.json({ error: 'Tipo de evento o nivel inválido.' }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from('profile')
      .select('username')
      .eq('user', user.id)
      .maybeSingle();

    const createdBy = profile?.username || user.email?.split('@')[0] || 'Peloteras';

    const { data, error } = await supabase
      .from('event')
      .insert({
        title: payload.title,
        description: {
          title: payload.title,
          description: payload.description,
          location_reference: payload.locationReference || null,
        },
        start_time: payload.startTime,
        end_time: payload.endTime,
        location: {
          lat: payload.lat,
          long: payload.lng,
        },
        location_text: payload.locationText,
        district: payload.district,
        min_users: payload.minUsers,
        max_users: payload.maxUsers,
        price: payload.price,
        EventType: payload.eventTypeId,
        level: payload.levelId,
        created_by: createdBy,
        created_by_id: user.id,
      })
      .select('id')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'No se pudo crear el evento.' }, { status: 500 });
  }
}
