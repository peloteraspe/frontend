'use server';

import { ProfileRequestBody, UserProfileUpdate } from '@modules/users/model/types';
import { backendFetch, isAbortError } from '@core/api/backend';
import { log } from '../../../core/lib/logger';

export async function createProfile(requestBody: ProfileRequestBody) {
  try {
    const response = await backendFetch(`${process.env.BACKEND_URL}/profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    }, 6000);

    log.apiCall('POST', `/profile`, response.status, { userId: requestBody.user });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || response.statusText);
    }
    return data;
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

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || response.statusText);
    }

    return data;
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
      body: JSON.stringify(requestBody),
    }, 6000);

    log.apiCall('PATCH', `/profile/${userId}`, response.status, { userId });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || response.statusText);
    }

    return data;
  } catch (error: any) {
    if (isAbortError(error)) {
      throw new Error('La actualización de perfil tardó demasiado. Intenta nuevamente.');
    }
    log.error('Error updating profile', 'PROFILE_ACTION', error, { userId });
    throw error;
  }
}
