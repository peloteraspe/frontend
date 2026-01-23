'use server';

import { log } from '../../../core/lib/logger';

export async function getAllEvents() {
  try {
    const response = await fetch(`${process.env.BACKEND_URL}/event`);

    log.apiCall('GET', '/event', response.status);

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || response.statusText);
    }
    return data;
  } catch (error: any) {
    log.error('Error fetching all events', 'EVENT_ACTION', error);
    throw error;
  }
}

export async function getAdminNameByEvent(eventId: string) {
  try {
    const response = await fetch(`${process.env.BACKEND_URL}/event/user/${eventId}`);

    log.apiCall('GET', `/event/user/${eventId}`, response.status);

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || response.statusText);
    }
    return data;
  } catch (error: any) {
    log.error('Error fetching admin name by event', 'EVENT_ACTION', error, { eventId });
    throw error;
  }
}

export async function getEventById(eventId: string) {
  try {
    const response = await fetch(`${process.env.BACKEND_URL}/event/${eventId}`);

    log.apiCall('GET', `/event/${eventId}`, response.status);

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || response.statusText);
    }
    return data;
  } catch (error: any) {
    log.error('Error fetching event by id', 'EVENT_ACTION', error, { eventId });
    throw error;
  }
}

export async function getEventsByUser(userId: string) {
  try {
    const response = await fetch(`${process.env.BACKEND_URL}/event/up-past/${userId}`);

    log.apiCall('GET', `/event/up-past/${userId}`, response.status);

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || response.statusText);
    }
    return data;
  } catch (error: any) {
    log.error('Error fetching events by user', 'EVENT_ACTION', error, { userId });
    throw error;
  }
}
