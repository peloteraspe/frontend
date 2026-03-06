'use server';

import { backendFetch, isAbortError } from '@core/api/backend';
import { log } from '../../../core/lib/logger';

export async function getAllEvents() {
  try {
    const response = await backendFetch(`${process.env.BACKEND_URL}/event`, undefined, 5000);

    log.apiCall('GET', '/event', response.status);

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || response.statusText);
    }
    return data;
  } catch (error: any) {
    if (isAbortError(error)) {
      log.warn('Timeout fetching all events, returning empty list', 'EVENT_ACTION');
      return [];
    }
    log.error('Error fetching all events', 'EVENT_ACTION', error);
    throw error;
  }
}

export async function getAdminNameByEvent(eventId: string) {
  try {
    const response = await backendFetch(`${process.env.BACKEND_URL}/event/user/${eventId}`, undefined, 5000);

    log.apiCall('GET', `/event/user/${eventId}`, response.status);

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || response.statusText);
    }
    return data;
  } catch (error: any) {
    if (isAbortError(error)) {
      log.warn('Timeout fetching admin name by event', 'EVENT_ACTION', { eventId });
      return null;
    }
    log.error('Error fetching admin name by event', 'EVENT_ACTION', error, { eventId });
    throw error;
  }
}

export async function getEventById(eventId: string) {
  try {
    const response = await backendFetch(`${process.env.BACKEND_URL}/event/${eventId}`, undefined, 5000);

    log.apiCall('GET', `/event/${eventId}`, response.status);

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || response.statusText);
    }
    return data;
  } catch (error: any) {
    if (isAbortError(error)) {
      log.warn('Timeout fetching event by id', 'EVENT_ACTION', { eventId });
      return null;
    }
    log.error('Error fetching event by id', 'EVENT_ACTION', error, { eventId });
    throw error;
  }
}

export async function getEventsByUser(userId: string) {
  try {
    const response = await backendFetch(`${process.env.BACKEND_URL}/event/up-past/${userId}`, undefined, 5000);

    log.apiCall('GET', `/event/up-past/${userId}`, response.status);

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || response.statusText);
    }
    return data;
  } catch (error: any) {
    if (isAbortError(error)) {
      log.warn('Timeout fetching events by user, returning empty list', 'EVENT_ACTION', { userId });
      return [];
    }
    log.error('Error fetching events by user', 'EVENT_ACTION', error, { userId });
    throw error;
  }
}
