import { PhoneNumberFormat, PhoneNumberUtil } from 'google-libphonenumber';

const phoneUtil = PhoneNumberUtil.getInstance();

export const DEFAULT_PHONE_COUNTRY_ISO2 = 'pe';
export const DEFAULT_PHONE_REGION = 'PE';

export type PhoneValidationResult = {
  raw: string;
  e164: string;
  isValid: boolean;
  regionCode: string | null;
  countryIso2: string | null;
};

type PhoneMetadataSource = {
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
};

type AuthMetadata = Record<string, unknown> | null | undefined;

function normalizeRegionCode(regionCode?: string | null) {
  const normalized = String(regionCode || '')
    .trim()
    .toUpperCase();

  return normalized || DEFAULT_PHONE_REGION;
}

export function validateInternationalPhone(
  value: unknown,
  options?: {
    defaultRegion?: string | null;
  }
): PhoneValidationResult {
  const raw = String(value || '').trim();

  if (!raw) {
    return {
      raw,
      e164: '',
      isValid: false,
      regionCode: null,
      countryIso2: null,
    };
  }

  try {
    const parsedNumber = phoneUtil.parseAndKeepRawInput(
      raw,
      normalizeRegionCode(options?.defaultRegion)
    );
    const isValid = phoneUtil.isValidNumber(parsedNumber);
    const regionCode = phoneUtil.getRegionCodeForNumber(parsedNumber)?.toUpperCase() || null;

    return {
      raw,
      e164: isValid ? phoneUtil.format(parsedNumber, PhoneNumberFormat.E164) : '',
      isValid,
      regionCode,
      countryIso2: regionCode ? regionCode.toLowerCase() : null,
    };
  } catch {
    return {
      raw,
      e164: '',
      isValid: false,
      regionCode: null,
      countryIso2: null,
    };
  }
}

export function normalizeInternationalPhone(
  value: unknown,
  options?: {
    defaultRegion?: string | null;
  }
) {
  const result = validateInternationalPhone(value, options);
  return result.isValid ? result.e164 : '';
}

export function normalizePhoneMetadata(metadata?: AuthMetadata) {
  const rawMetadata = (metadata ?? {}) as Record<string, unknown>;
  const legacyPhone = String(rawMetadata.organizer_phone || '').trim();
  const nextPhone = String(rawMetadata.phone || '').trim() || legacyPhone;
  const { organizer_phone: _legacyOrganizerPhone, ...rest } = rawMetadata;

  return {
    ...rest,
    ...(nextPhone ? { phone: nextPhone } : {}),
  };
}

export function resolveStoredPhone(source?: PhoneMetadataSource | null) {
  const candidates = [
    source?.user_metadata?.phone,
    source?.app_metadata?.phone,
  ];

  for (const candidate of candidates) {
    const normalized = String(candidate || '').trim();
    if (normalized) return normalized;
  }

  return '';
}
