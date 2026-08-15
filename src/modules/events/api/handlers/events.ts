import { NextResponse } from 'next/server';
import { getServerSupabase } from '@core/api/supabase.server';
import { getAdminSupabase } from '@core/api/supabase.admin';
import { log } from '@core/lib/logger';
import {
  clientIdentifierFromRequest,
  rateLimitByIdentifier,
  rateLimitByRequest,
} from '@core/api/rateLimit';
import { isAdmin } from '@shared/lib/auth/isAdmin';
import { getEventCatalogs } from '@modules/events/api/queries/getEventCatalogs';
import { getEventsExplorer } from '@modules/events/api/queries/getEventsExplorer';
import { CreateEventPayload, EventEntity } from '@modules/events/model/types';
import { getIsoDateInTimeZone, normalizeDateTimeLocalToLima } from '@shared/lib/dateTime';
import {
  hasCompleteEventProfile,
  REQUIRED_EVENT_PROFILE_MESSAGE,
} from '@modules/users/lib/eventProfileRequirements';
import { isVersusEventTypeName } from '@modules/events/lib/eventTypeRules';

const EVENTS_TIMEOUT_MS = 4500;

function isMissingPlaceTextColumnError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : error && typeof error === 'object' && 'message' in error
        ? String((error as { message?: unknown }).message || '')
        : String(error || '');
  return /place_text/i.test(message) && /(schema cache|column|could not find|does not exist)/i.test(message);
}

function isMissingTeamModeColumnError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : error && typeof error === 'object' && 'message' in error
        ? String((error as { message?: unknown }).message || '')
        : String(error || '');
  return (
    /(registration_mode|team_registration_max_teams)/i.test(message) &&
    /(schema cache|column|could not find|does not exist)/i.test(message)
  );
}

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

function normalizeDistrict(value: unknown) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const [district] = raw.split(',');
  return String(district || '').trim();
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
  const eventDate = getIsoDateInTimeZone(dateIso);
  if (!eventDate) return false;
  return eventDate === dateFilter;
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
        event.placeText.toLowerCase().includes(q) ||
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
  const startTime = normalizeDateTimeLocalToLima(body?.startTime);
  const endTime = normalizeDateTimeLocalToLima(body?.endTime);

  const payload: CreateEventPayload = {
    title: String(body?.title ?? '').trim(),
    description: String(body?.description ?? '').trim(),
    startTime: startTime ?? '',
    endTime: endTime ?? '',
    price: parseNumber(body?.price),
    minUsers: parseNumber(body?.minUsers),
    maxUsers: parseNumber(body?.maxUsers),
    district: normalizeDistrict(body?.district),
    placeText: String(body?.placeText ?? '').trim(),
    locationText: String(body?.locationText ?? '').trim(),
    locationReference: String(body?.locationReference ?? '').trim(),
    lat: parseNumber(body?.lat),
    lng: parseNumber(body?.lng),
    eventTypeId: parseNumber(body?.eventTypeId),
    levelId: parseNumber(body?.levelId),
    teamCount: Math.max(2, parseNumber(body?.teamCount, 2)),
    teamPlayers: Math.max(1, parseNumber(body?.teamPlayers, 7)),
    teamSubstitutes: Math.max(0, parseNumber(body?.teamSubstitutes, 0)),
    teamPriceMode: body?.teamPriceMode === 'fixed_team' ? 'fixed_team' : 'per_player',
    fixedTeamPrice:
      body?.fixedTeamPrice === null || body?.fixedTeamPrice === undefined
        ? null
        : Math.max(0, parseNumber(body.fixedTeamPrice, 0)),
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

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Solo admins pueden crear eventos por esta ruta.' }, { status: 403 });
    }

    if (!hasCompleteEventProfile(user)) {
      return NextResponse.json(
        { error: REQUIRED_EVENT_PROFILE_MESSAGE, code: 'PROFILE_DETAILS_REQUIRED' },
        { status: 422 }
      );
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

    const selectedEventType = catalogs.eventTypes.find((item) => item.id === payload.eventTypeId);
    const validEventType = Boolean(selectedEventType);
    const validLevel = catalogs.levels.some((item) => item.id === payload.levelId);

    if (!validEventType || !validLevel) {
      return NextResponse.json({ error: 'Tipo de evento o nivel inválido.' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();
    const { data: profile } = await adminSupabase
      .from('profile')
      .select('username')
      .eq('user', user.id)
      .maybeSingle();

    const createdBy = profile?.username || user.email?.split('@')[0] || 'Peloteras';
    const isVersus = isVersusEventTypeName(selectedEventType?.name);
    const versusTeamCount = Math.max(2, payload.teamCount ?? 2);
    const versusTeamPlayers = Math.max(1, payload.teamPlayers ?? 7);
    const versusTeamSubstitutes = Math.max(0, payload.teamSubstitutes ?? 0);
    const versusTeamMaxPlayers = versusTeamPlayers + versusTeamSubstitutes;
    if (isVersus && (!Number.isInteger(versusTeamCount) || versusTeamCount > 64)) {
      return NextResponse.json(
        { error: 'La cantidad de equipos debe estar entre 2 y 64.' },
        { status: 400 }
      );
    }
    if (
      isVersus &&
      (!Number.isInteger(versusTeamPlayers) ||
        versusTeamPlayers > 30 ||
        !Number.isInteger(versusTeamSubstitutes) ||
        versusTeamSubstitutes > 30)
    ) {
      return NextResponse.json(
        { error: 'Revisa el tamaño del plantel por equipo.' },
        { status: 400 }
      );
    }
    if (isVersus && payload.teamPriceMode === 'fixed_team' && payload.fixedTeamPrice === null) {
      return NextResponse.json({ error: 'Define el precio por equipo.' }, { status: 400 });
    }

    const baseInsertPayload = {
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
      min_users: isVersus ? versusTeamPlayers * 2 : payload.minUsers,
      max_users: isVersus ? versusTeamMaxPlayers * versusTeamCount : payload.maxUsers,
      price: isVersus && payload.teamPriceMode === 'fixed_team' ? 0 : payload.price,
      EventType: payload.eventTypeId,
      level: payload.levelId,
      created_by: createdBy,
      created_by_id: user.id,
      is_published: false,
      allows_team_registration: isVersus,
      team_registration_min_players: isVersus ? versusTeamPlayers : null,
      team_registration_max_players: isVersus ? versusTeamMaxPlayers : null,
      team_registration_price_mode: isVersus ? payload.teamPriceMode : 'per_player',
      team_registration_fixed_price:
        isVersus && payload.teamPriceMode === 'fixed_team' ? payload.fixedTeamPrice : null,
    };
    const teamModeInsertPayload = {
      registration_mode: isVersus ? 'team' : 'individual',
      team_registration_max_teams: isVersus ? versusTeamCount : null,
    };
    let includePlaceTextColumn = true;
    let includeTeamModeColumns = true;
    let data: { id: string | number } | null = null;
    let error: any = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const result = await adminSupabase
        .from('event')
        .insert({
          ...baseInsertPayload,
          ...(includeTeamModeColumns ? teamModeInsertPayload : {}),
          ...(includePlaceTextColumn
            ? { place_text: payload.placeText }
            : {
                description: {
                  ...baseInsertPayload.description,
                  place_text: payload.placeText || null,
                },
              }),
        })
        .select('id')
        .single();

      data = result.data as { id: string | number } | null;
      error = result.error;
      if (!error) break;

      if (includePlaceTextColumn && isMissingPlaceTextColumnError(error)) {
        includePlaceTextColumn = false;
        log.warn('Event place_text column missing; retrying public create without it', 'EVENT_API', {
          userId: user.id,
        });
        continue;
      }

      if (includeTeamModeColumns && isMissingTeamModeColumnError(error)) {
        if (isVersus) {
          return NextResponse.json(
            {
              error:
                'La base de datos aún no tiene habilitado el nuevo formato Versus. Aplica las migraciones pendientes e inténtalo nuevamente.',
            },
            { status: 503 }
          );
        }
        includeTeamModeColumns = false;
        log.warn(
          'Event team-mode columns missing; retrying public individual event with legacy schema',
          'EVENT_API',
          { userId: user.id }
        );
        continue;
      }

      break;
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data?.id) {
      return NextResponse.json({ error: 'No se pudo obtener el evento creado.' }, { status: 500 });
    }

    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'No se pudo crear el evento.' }, { status: 500 });
  }
}
