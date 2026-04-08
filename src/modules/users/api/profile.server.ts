'use server';

import { ProfileRequestBody, UserProfileUpdate } from '@modules/users/model/types';
import { backendFetch, isAbortError } from '@core/api/backend';
import { log } from '../../../core/lib/logger';

type BackendErrorWithStatus = Error & {
  status?: number;
  bodyText?: string;
};

function stripPhoneFromProfilePayload<T extends Record<string, any>>(payload: T): Omit<T, 'phone'> {
  const { phone: _phone, ...rest } = payload;
  return rest;
}

async function readBackendResponse(response: Response) {
  const bodyText = await response.text().catch(() => '');
  if (!bodyText) {
    return { bodyText, data: null as any };
  }

  try {
    return {
      bodyText,
      data: JSON.parse(bodyText) as any,
    };
  } catch {
    return { bodyText, data: null as any };
  }
}

function toBackendError(
  response: Response,
  parsed: { bodyText: string; data: any },
  fallbackMessage: string
): BackendErrorWithStatus {
  const payloadMessage =
    (typeof parsed.data?.message === 'string' && parsed.data.message.trim()) ||
    (typeof parsed.data?.error === 'string' && parsed.data.error.trim()) ||
    '';
  const rawMessage = payloadMessage || parsed.bodyText || response.statusText || fallbackMessage;
  const error = new Error(
    `HTTP ${response.status}: ${String(rawMessage || fallbackMessage).trim()}`
  ) as BackendErrorWithStatus;
  error.status = response.status;
  error.bodyText = parsed.bodyText;
  return error;
}

export async function createProfile(requestBody: ProfileRequestBody) {
  try {
    const response = await backendFetch(`${process.env.BACKEND_URL}/profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(stripPhoneFromProfilePayload(requestBody as Record<string, any>)),
    }, 6000);

    log.apiCall('POST', `/profile`, response.status, { userId: requestBody.user });

    const parsed = await readBackendResponse(response);
    if (!response.ok) {
      throw toBackendError(response, parsed, 'No se pudo crear el perfil');
    }

    return parsed.data;
  } catch (error: any) {
    if (isAbortError(error)) {
      throw new Error('La creación de perfil tardó demasiado. Intenta nuevamente.');
    }
    log.error('Error creating profile', 'PROFILE_ACTION', error, { userId: requestBody.user });
    throw error;
  }
}

export async function getProfile(userId: string) {
  const url = `${process.env.BACKEND_URL}/profile/${userId}`;

  try {
    const response = await backendFetch(url, { method: 'GET' }, 5000);

    log.apiCall('GET', `/profile/${userId}`, response.status);

    const parsed = await readBackendResponse(response);

    if (!response.ok) {
      throw toBackendError(response, parsed, 'No se pudo obtener el perfil');
    }

    return parsed.data;
  } catch (error) {
    if (isAbortError(error)) {
      log.warn('Timeout fetching profile', 'PROFILE_ACTION', { userId });
      return null;
    }
    log.error(
      'Error fetching profile',
      'PROFILE_ACTION',
      error instanceof Error ? error : new Error('Unknown error'),
      { userId }
    );
    throw error;
  }
}

export async function updateProfileByUserId(userId: string, requestBody: UserProfileUpdate) {
  const url = `${process.env.BACKEND_URL}/profile/${userId}`;
  try {
    const response = await backendFetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(stripPhoneFromProfilePayload(requestBody as Record<string, any>)),
    }, 6000);

    log.apiCall('PATCH', `/profile/${userId}`, response.status, { userId });

    const parsed = await readBackendResponse(response);
    if (!response.ok) {
      throw toBackendError(response, parsed, 'No se pudo actualizar el perfil');
    }

    return parsed.data;
  } catch (error: any) {
    if (isAbortError(error)) {
      throw new Error('La actualización de perfil tardó demasiado. Intenta nuevamente.');
    }
    log.error('Error updating profile', 'PROFILE_ACTION', error, { userId });
    throw error;
  }
}
