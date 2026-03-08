import 'server-only';
import { createPrivateKey, createSign } from 'crypto';
import { getAdminSupabase } from '@core/api/supabase.admin';
import { fetchWithTimeout, isAbortError } from '@core/api/backend';
import { log } from '@core/lib/logger';

const GOOGLE_WALLET_PROVIDER = 'google_wallet';
const WALLET_CLASS_DEFAULT_EVENT_NAME = 'Peloteras';
const WALLET_EVENT_CLASS_PREFIX = 'peloteras_event_';
const walletClassValidationCache = new Set<string>();

export type BuildGoogleWalletSaveUrlInput = {
  qrToken: string;
  ticketNumber: string;
  ticketHolderName: string;
  eventTitle?: string | null;
  eventStartTime?: string | null;
  eventEndTime?: string | null;
  classId?: string | null;
};

type WalletSettingsRow = {
  issuer_id: string;
  active_class_id: string | null;
  service_account_email: string;
  service_account_private_key: string;
  origins: string[] | null;
};

export type GoogleWalletConfig = {
  issuerId: string;
  classId: string | null;
  serviceAccountEmail: string;
  privateKey: string;
  origins: string[];
  source: 'db';
};

export type GoogleWalletSettingsSummary = {
  issuerId: string;
  activeClassId: string | null;
  serviceAccountEmail: string;
  origins: string[];
  hasCredentials: boolean;
  source: 'db';
};

export type GoogleWalletClassSummary = {
  id: string;
  reviewStatus: string | null;
  state: string | null;
  eventName: string | null;
};

export type ParsedServiceAccount = {
  serviceAccountEmail: string;
  privateKey: string;
};

export type UpsertGoogleWalletSettingsInput = {
  issuerId?: string | null;
  activeClassId?: string | null;
  serviceAccountEmail?: string | null;
  serviceAccountPrivateKey?: string | null;
  origins?: string[] | null;
  updatedBy?: string | null;
};

export type EnsureGoogleWalletEventClassInput = {
  eventId: string | number;
  eventTitle?: string | null;
  eventStartTime?: string | null;
  eventEndTime?: string | null;
};

function normalizePrivateKey(rawKey: string) {
  const trimmed = rawKey.trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
  return trimmed.replace(/\\n/g, '\n');
}

function toBase64Url(value: string | Buffer) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function sanitizeObjectSuffix(value: string) {
  return value.replace(/[^A-Za-z0-9._-]/g, '_');
}

function getWalletClassObjectKey(classId: string) {
  const suffix = classId.split('.').pop() || classId;
  const normalized = sanitizeObjectSuffix(suffix).slice(0, 40);
  return normalized || 'class';
}

function normalizeOrigins(value: string[] | null | undefined) {
  return (value ?? []).map((item) => item.trim()).filter(Boolean);
}

function isPlaceholderWalletEventName(value: string | null | undefined) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  return (
    normalized === 'event.title' ||
    normalized === '{event.title}' ||
    normalized === '${event.title}' ||
    normalized === 'event_name' ||
    normalized === 'eventname'
  );
}

function toLocalizedString(value: string) {
  return {
    defaultValue: {
      language: 'es-PE',
      value,
    },
  };
}

function toTrimmedOrNull(value: string | null | undefined) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function normalizeWalletClassId(
  classId: string | null | undefined,
  issuerId: string | null | undefined
) {
  const normalizedClassId = toTrimmedOrNull(classId);
  if (!normalizedClassId) return null;
  if (normalizedClassId.includes('.')) return normalizedClassId;

  const normalizedIssuerId = toTrimmedOrNull(issuerId);
  if (!normalizedIssuerId) return normalizedClassId;

  return `${normalizedIssuerId}.${normalizedClassId}`;
}

function asIssuerFromClassId(classId: string | null | undefined) {
  if (!classId) return null;
  const parts = classId.split('.');
  return parts.length > 1 ? parts[0] : null;
}

function resolveClassId(config: GoogleWalletConfig, inputClassId?: string | null) {
  return normalizeWalletClassId(inputClassId, config.issuerId) ?? config.classId;
}

export function buildGoogleWalletEventClassId(
  eventId: string | number,
  issuerId?: string | null
) {
  const eventSuffix = sanitizeObjectSuffix(String(eventId ?? '').trim());
  if (!eventSuffix) return null;
  return normalizeWalletClassId(`${WALLET_EVENT_CLASS_PREFIX}${eventSuffix}`, issuerId);
}

async function getGoogleWalletConfigFromDb(): Promise<GoogleWalletConfig | null> {
  try {
    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from('wallet_provider_settings')
      .select(
        'issuer_id, active_class_id, service_account_email, service_account_private_key, origins'
      )
      .eq('provider', GOOGLE_WALLET_PROVIDER)
      .maybeSingle();

    if (error) {
      const message = String((error as any)?.message ?? '').toLowerCase();
      if (message.includes('wallet_provider_settings') && message.includes('does not exist')) {
        return null;
      }
      log.database('SELECT wallet provider settings', 'wallet_provider_settings', error as any);
      return null;
    }

    const row = (data ?? null) as WalletSettingsRow | null;
    if (!row?.issuer_id || !row?.service_account_email || !row?.service_account_private_key) {
      return null;
    }

    return {
      issuerId: row.issuer_id,
      classId: normalizeWalletClassId(row.active_class_id, row.issuer_id),
      serviceAccountEmail: row.service_account_email,
      privateKey: normalizePrivateKey(row.service_account_private_key),
      origins: normalizeOrigins(row.origins),
      source: 'db',
    };
  } catch (error) {
    log.warn('Wallet settings unavailable in DB', 'TICKETS', { error });
    return null;
  }
}

export async function getGoogleWalletConfig(): Promise<GoogleWalletConfig | null> {
  return getGoogleWalletConfigFromDb();
}

export async function getGoogleWalletSettingsSummary(): Promise<GoogleWalletSettingsSummary | null> {
  const config = await getGoogleWalletConfig();
  if (!config) return null;

  return {
    issuerId: config.issuerId,
    activeClassId: config.classId,
    serviceAccountEmail: config.serviceAccountEmail,
    origins: config.origins,
    hasCredentials: Boolean(config.serviceAccountEmail && config.privateKey),
    source: config.source,
  };
}

export function parseGoogleServiceAccountJson(rawJson: string): ParsedServiceAccount {
  try {
    const parsed = JSON.parse(rawJson) as {
      client_email?: string;
      private_key?: string;
    };

    const serviceAccountEmail = String(parsed.client_email || '').trim();
    const privateKey = normalizePrivateKey(String(parsed.private_key || ''));

    if (!serviceAccountEmail || !privateKey.includes('BEGIN PRIVATE KEY')) {
      throw new Error('JSON inválido: faltan client_email o private_key.');
    }

    return {
      serviceAccountEmail,
      privateKey,
    };
  } catch (error) {
    throw new Error('El JSON de Service Account no es válido.');
  }
}

export async function upsertGoogleWalletSettings(input: UpsertGoogleWalletSettingsInput) {
  const supabase = getAdminSupabase();

  const { data: current, error: currentError } = await supabase
    .from('wallet_provider_settings')
    .select(
      'issuer_id, active_class_id, service_account_email, service_account_private_key, origins'
    )
    .eq('provider', GOOGLE_WALLET_PROVIDER)
    .maybeSingle();

  if (currentError) {
    log.database('SELECT wallet settings before upsert', 'wallet_provider_settings', currentError as any);
    throw new Error('No se pudo leer la configuración actual de Wallet.');
  }

  const currentRow = (current ?? null) as WalletSettingsRow | null;

  const issuerId =
    (input.issuerId ?? currentRow?.issuer_id ?? '').trim() ||
    asIssuerFromClassId(input.activeClassId ?? currentRow?.active_class_id ?? undefined) ||
    '';
  const activeClassId =
    normalizeWalletClassId(
      typeof input.activeClassId === 'string'
        ? input.activeClassId.trim() || null
        : (currentRow?.active_class_id ?? null),
      issuerId
    );
  const serviceAccountEmail =
    (input.serviceAccountEmail ?? currentRow?.service_account_email ?? '').trim() || '';
  const serviceAccountPrivateKey =
    input.serviceAccountPrivateKey != null
      ? normalizePrivateKey(input.serviceAccountPrivateKey)
      : normalizePrivateKey(currentRow?.service_account_private_key ?? '');
  const origins =
    input.origins != null
      ? normalizeOrigins(input.origins)
      : normalizeOrigins(currentRow?.origins);

  if (!issuerId) throw new Error('issuerId es obligatorio.');
  if (!serviceAccountEmail) {
    throw new Error('serviceAccountEmail es obligatorio. Pega el JSON de Service Account.');
  }
  if (!serviceAccountPrivateKey || !serviceAccountPrivateKey.includes('BEGIN PRIVATE KEY')) {
    throw new Error('serviceAccountPrivateKey es inválida. Pega el JSON de Service Account.');
  }

  const nowIso = new Date().toISOString();

  const { error } = await supabase.from('wallet_provider_settings').upsert(
    {
      provider: GOOGLE_WALLET_PROVIDER,
      issuer_id: issuerId,
      active_class_id: activeClassId,
      service_account_email: serviceAccountEmail,
      service_account_private_key: serviceAccountPrivateKey,
      origins,
      updated_by: input.updatedBy ?? null,
      updated_at: nowIso,
    },
    { onConflict: 'provider' }
  );

  if (error) {
    log.database('UPSERT wallet settings', 'wallet_provider_settings', error as any, {
      issuerId,
      activeClassId,
      updatedBy: input.updatedBy,
    });
    throw new Error('No se pudo guardar la configuración de Wallet.');
  }

  return {
    issuerId,
    activeClassId,
    serviceAccountEmail,
    origins,
  };
}

function buildGoogleWalletSaveUrlWithConfig(
  config: GoogleWalletConfig,
  input: BuildGoogleWalletSaveUrlInput
): string | null {
  const classId = resolveClassId(config, input.classId);
  if (!classId) return null;

  try {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const classObjectKey = getWalletClassObjectKey(classId);
    const objectId = `${config.issuerId}.ticket_${classObjectKey}_${sanitizeObjectSuffix(input.qrToken)}`;
    const qrValue = `PELOTERAS:TICKET:${input.qrToken}`;

    const payload = {
      iss: config.serviceAccountEmail,
      aud: 'google',
      typ: 'savetowallet',
      iat: nowSeconds,
      origins: config.origins,
      payload: {
        eventTicketObjects: [
          {
            id: objectId,
            classId,
            state: 'ACTIVE',
            ticketHolderName: input.ticketHolderName,
            ticketNumber: input.ticketNumber,
            barcode: {
              type: 'QR_CODE',
              value: qrValue,
            },
          },
        ],
      },
    };

    const encodedHeader = toBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const encodedPayload = toBase64Url(JSON.stringify(payload));
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;

    const signer = createSign('RSA-SHA256');
    signer.update(unsignedToken);
    signer.end();

    const privateKey = createPrivateKey(config.privateKey);
    const signature = signer.sign(privateKey);
    const encodedSignature = toBase64Url(signature);

    return `https://pay.google.com/gp/v/save/${unsignedToken}.${encodedSignature}`;
  } catch (error) {
    log.warn('Failed to sign Google Wallet JWT', 'TICKETS', {
      error,
      hasClassId: Boolean(config.classId),
      hasIssuerId: Boolean(config.issuerId),
      hasServiceAccountEmail: Boolean(config.serviceAccountEmail),
      source: config.source,
    });
    return null;
  }
}

export async function buildGoogleWalletSaveUrl(
  input: BuildGoogleWalletSaveUrlInput,
  config?: GoogleWalletConfig | null
): Promise<string | null> {
  const resolvedConfig = config ?? (await getGoogleWalletConfig());
  if (!resolvedConfig) return null;
  const classId = resolveClassId(resolvedConfig, input.classId);
  if (!classId) return null;
  const configWithClass = classId === resolvedConfig.classId ? resolvedConfig : { ...resolvedConfig, classId };
  await ensureWalletClassEventName(configWithClass, input);
  return buildGoogleWalletSaveUrlWithConfig(configWithClass, input);
}

export async function ensureGoogleWalletEventClass(
  input: EnsureGoogleWalletEventClassInput,
  config?: GoogleWalletConfig | null
): Promise<string | null> {
  const resolvedConfig = config ?? (await getGoogleWalletConfig());
  if (!resolvedConfig) return null;

  const classId = buildGoogleWalletEventClassId(input.eventId, resolvedConfig.issuerId);
  if (!classId) return null;

  const configWithClass = classId === resolvedConfig.classId ? resolvedConfig : { ...resolvedConfig, classId };
  await ensureWalletClassEventName(configWithClass, {
    eventTitle: input.eventTitle,
    eventStartTime: input.eventStartTime,
    eventEndTime: input.eventEndTime,
  });

  return classId;
}

function getGoogleWalletClassEndpoint(classId: string) {
  return `https://walletobjects.googleapis.com/walletobjects/v1/eventTicketClass/${encodeURIComponent(classId)}`;
}

type GoogleWalletClassApiBody = {
  eventName?: {
    defaultValue?: {
      value?: string;
    };
  };
  dateTime?: {
    start?: string;
    end?: string;
  };
  error?: {
    message?: string;
  };
};

async function fetchGoogleWalletClass(
  accessToken: string,
  classId: string
): Promise<{ response: Response; body: GoogleWalletClassApiBody }> {
  const classResponse = await fetchWithTimeout(
    getGoogleWalletClassEndpoint(classId),
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    },
    5000
  );

  const classBody = (await classResponse.json().catch(() => ({}))) as GoogleWalletClassApiBody;
  return { response: classResponse, body: classBody };
}

async function createGoogleWalletEventClass(
  accessToken: string,
  classId: string,
  input?: Pick<BuildGoogleWalletSaveUrlInput, 'eventTitle' | 'eventStartTime' | 'eventEndTime'>
) {
  const desiredEventName = toTrimmedOrNull(input?.eventTitle) || WALLET_CLASS_DEFAULT_EVENT_NAME;
  const desiredStartTime = toTrimmedOrNull(input?.eventStartTime);
  const desiredEndTime = toTrimmedOrNull(input?.eventEndTime);

  const payload: Record<string, unknown> = {
    id: classId,
    issuerName: WALLET_CLASS_DEFAULT_EVENT_NAME,
    reviewStatus: 'UNDER_REVIEW',
    eventName: toLocalizedString(desiredEventName),
  };

  if (desiredStartTime) {
    payload.dateTime = {
      start: desiredStartTime,
      ...(desiredEndTime ? { end: desiredEndTime } : {}),
    };
  }

  const response = await fetchWithTimeout(
    'https://walletobjects.googleapis.com/walletobjects/v1/eventTicketClass',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
    5000
  );

  const body = (await response.json().catch(() => ({}))) as {
    error?: {
      message?: string;
    };
  };

  if (response.ok || response.status === 409) {
    return true;
  }

  log.warn('Could not create Google Wallet event class', 'TICKETS', {
    classId,
    status: response.status,
    error: body?.error?.message || 'Unknown error',
  });

  return false;
}

async function getGoogleWalletAccessToken(config: GoogleWalletConfig) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const jwtHeader = toBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const jwtPayload = toBase64Url(
    JSON.stringify({
      iss: config.serviceAccountEmail,
      scope: 'https://www.googleapis.com/auth/wallet_object.issuer',
      aud: 'https://oauth2.googleapis.com/token',
      iat: nowSeconds,
      exp: nowSeconds + 3600,
    })
  );
  const unsignedJwt = `${jwtHeader}.${jwtPayload}`;

  const signer = createSign('RSA-SHA256');
  signer.update(unsignedJwt);
  signer.end();

  const signature = signer.sign(createPrivateKey(config.privateKey));
  const assertion = `${unsignedJwt}.${toBase64Url(signature)}`;

  let tokenResponse: Response;
  try {
    tokenResponse = await fetchWithTimeout(
      'https://oauth2.googleapis.com/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion,
        }),
      },
      5000
    );
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error('Tiempo de espera agotado al solicitar token de Google Wallet.');
    }
    throw error;
  }

  const tokenJson = (await tokenResponse.json().catch(() => ({}))) as {
    access_token?: string;
    error_description?: string;
    error?: string;
  };

  if (!tokenResponse.ok || !tokenJson?.access_token) {
    throw new Error(
      tokenJson.error_description || tokenJson.error || 'No se pudo obtener token de Google Wallet.'
    );
  }

  return tokenJson.access_token;
}

async function ensureWalletClassEventName(
  config: GoogleWalletConfig,
  input?: Pick<BuildGoogleWalletSaveUrlInput, 'eventTitle' | 'eventStartTime' | 'eventEndTime'>
) {
  const classId = String(config.classId || '').trim();
  if (!classId) return;

  const desiredEventName = toTrimmedOrNull(input?.eventTitle) || WALLET_CLASS_DEFAULT_EVENT_NAME;
  const desiredStartTime = toTrimmedOrNull(input?.eventStartTime);
  const desiredEndTime = toTrimmedOrNull(input?.eventEndTime);
  const cacheKey = `${classId}::${desiredEventName}::${desiredStartTime || ''}::${desiredEndTime || ''}`;
  if (walletClassValidationCache.has(cacheKey)) return;
  let shouldCache = false;

  try {
    const token = await getGoogleWalletAccessToken(config);
    let { response: classResponse, body: classBody } = await fetchGoogleWalletClass(token, classId);

    if (!classResponse.ok && classResponse.status === 404) {
      const created = await createGoogleWalletEventClass(token, classId, input);
      if (!created) return;
      ({ response: classResponse, body: classBody } = await fetchGoogleWalletClass(token, classId));
    }

    if (!classResponse.ok) {
      log.warn('Could not verify Google Wallet class eventName', 'TICKETS', {
        classId,
        status: classResponse.status,
        error: classBody?.error?.message || 'Unknown error',
      });
      return;
    }

    const currentEventName = classBody?.eventName?.defaultValue?.value ?? null;
    const currentStartTime = toTrimmedOrNull(classBody?.dateTime?.start ?? null);
    const currentEndTime = toTrimmedOrNull(classBody?.dateTime?.end ?? null);

    const shouldPatchEventName =
      isPlaceholderWalletEventName(currentEventName) || currentEventName !== desiredEventName;
    const shouldPatchDateTime =
      Boolean(desiredStartTime) &&
      (currentStartTime !== desiredStartTime ||
        (desiredEndTime ? currentEndTime !== desiredEndTime : false));

    if (!shouldPatchEventName && !shouldPatchDateTime) {
      shouldCache = true;
      return;
    }

    const patchPayload: Record<string, unknown> = {};
    if (shouldPatchEventName) {
      patchPayload.eventName = toLocalizedString(desiredEventName);
    }
    if (shouldPatchDateTime && desiredStartTime) {
      patchPayload.dateTime = {
        start: desiredStartTime,
        ...(desiredEndTime ? { end: desiredEndTime } : {}),
      };
    }

    const patchResponse = await fetchWithTimeout(
      getGoogleWalletClassEndpoint(classId),
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patchPayload),
      },
      5000
    );

    const patchBody = (await patchResponse.json().catch(() => ({}))) as {
      error?: {
        message?: string;
      };
    };

    if (!patchResponse.ok) {
      log.warn('Could not normalize Google Wallet class metadata', 'TICKETS', {
        classId,
        status: patchResponse.status,
        error: patchBody?.error?.message || 'Unknown error',
      });
      return;
    }

    log.info('Google Wallet class metadata normalized', 'TICKETS', {
      classId,
      eventName: desiredEventName,
      startTime: desiredStartTime,
      endTime: desiredEndTime,
    });
    shouldCache = true;
  } catch (error) {
    log.warn('Wallet class metadata validation failed; continuing with current class', 'TICKETS', {
      classId,
      error,
    });
  } finally {
    if (shouldCache) {
      walletClassValidationCache.add(cacheKey);
    }
  }
}

export async function listGoogleWalletEventClasses(
  config?: GoogleWalletConfig | null
): Promise<GoogleWalletClassSummary[]> {
  const resolvedConfig = config ?? (await getGoogleWalletConfig());
  if (!resolvedConfig) {
    throw new Error('Configura primero issuer y credenciales de Google Wallet.');
  }

  const token = await getGoogleWalletAccessToken(resolvedConfig);
  let response: Response;
  try {
    response = await fetchWithTimeout(
      `https://walletobjects.googleapis.com/walletobjects/v1/eventTicketClass?issuerId=${encodeURIComponent(
        resolvedConfig.issuerId
      )}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      },
      5000
    );
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error('Tiempo de espera agotado al listar clases de Google Wallet.');
    }
    throw error;
  }

  const body = (await response.json().catch(() => ({}))) as {
    resources?: Array<{
      id?: string;
      reviewStatus?: string;
      state?: string;
      eventName?: {
        defaultValue?: {
          value?: string;
        };
      };
    }>;
    error?: {
      message?: string;
    };
  };

  if (!response.ok) {
    throw new Error(body?.error?.message || 'No se pudieron listar clases de Google Wallet.');
  }

  const classes = (body.resources ?? [])
    .map((item) => ({
      id: String(item.id || '').trim(),
      reviewStatus: item.reviewStatus ?? null,
      state: item.state ?? null,
      eventName: item.eventName?.defaultValue?.value ?? null,
    }))
    .filter((item) => item.id);

  classes.sort((a, b) => a.id.localeCompare(b.id));
  return classes;
}
