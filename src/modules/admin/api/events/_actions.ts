'use server';

import { revalidatePath } from 'next/cache';
import { getServerSupabase } from '@src/core/api/supabase.server';
import { getAdminSupabase } from '@core/api/supabase.admin';
import { log } from '@core/lib/logger';
import { EventUpsertInput, validateEventFormInput } from '@modules/admin/model/eventForm';
import {
  getEventPublishReadiness,
  parseStoredBoolean,
} from '@modules/admin/model/eventPublishReadiness';
import { isAdmin, isSuperAdmin } from '@shared/lib/auth/isAdmin';
import { ensureGoogleWalletEventClass } from '@modules/tickets/api/services/google-wallet.service';

type SupabaseClientLike =
  | Awaited<ReturnType<typeof getServerSupabase>>
  | ReturnType<typeof getAdminSupabase>;

function toInsertPayload(
  input: EventUpsertInput,
  userId: string,
  createdBy: string,
  isFeatured: boolean
) {
  return {
    title: input.title,
    description: {
      title: input.title,
      description: input.description,
      field_reserved_confirmed: input.isFieldReservedConfirmed,
    },
    start_time: input.startTime,
    end_time: input.endTime,
    location: {
      lat: input.lat,
      long: input.lng,
    },
    location_text: input.locationText,
    district: input.district,
    min_users: input.minUsers,
    max_users: input.maxUsers,
    price: input.price,
    EventType: input.eventTypeId,
    level: input.levelId,
    is_published: input.isPublished,
    is_featured: isFeatured,
    created_by_id: userId,
    created_by: createdBy,
  };
}

function toUpdatePayload(input: EventUpsertInput, isFeatured: boolean) {
  return {
    title: input.title,
    description: {
      title: input.title,
      description: input.description,
      field_reserved_confirmed: input.isFieldReservedConfirmed,
    },
    start_time: input.startTime,
    end_time: input.endTime,
    location: {
      lat: input.lat,
      long: input.lng,
    },
    location_text: input.locationText,
    district: input.district,
    min_users: input.minUsers,
    max_users: input.maxUsers,
    price: input.price,
    EventType: input.eventTypeId,
    level: input.levelId,
    is_published: input.isPublished,
    is_featured: isFeatured,
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    const message = error.message.trim();
    return message || fallback;
  }

  if (typeof error === 'string') {
    const message = error.trim();
    return message || fallback;
  }

  return fallback;
}

async function getAuthenticatedAdminContext(action: string) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error(`Debes iniciar sesión para ${action} eventos.`);
  }

  if (!isAdmin(user as any)) {
    throw new Error('No tienes permisos para gestionar eventos.');
  }

  return {
    supabase,
    adminSupabase: getAdminSupabase(),
    user,
  };
}

async function assertCanManageEvent(
  supabase: SupabaseClientLike,
  eventId: string,
  user: { id?: string | null; email?: string | null } | null
) {
  if (!user?.id) throw new Error('Debes iniciar sesión para gestionar eventos.');
  if (isSuperAdmin(user as any)) return;

  const { data: event, error } = await supabase
    .from('event')
    .select('created_by_id')
    .eq('id', eventId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!event) throw new Error('Evento no encontrado.');
  if (String(event.created_by_id || '') !== String(user.id || '')) {
    throw new Error('No tienes permisos para gestionar este evento.');
  }
}

async function assertEventCanBePublished(
  supabase: SupabaseClientLike,
  eventId: string,
  user: { id?: string | null; email?: string | null } | null
) {
  await assertCanManageEvent(supabase, eventId, user);

  const { data: event, error: eventError } = await supabase
    .from('event')
    .select('title,start_time,end_time,district,location_text,location,description')
    .eq('id', eventId)
    .maybeSingle();

  if (eventError) throw new Error(eventError.message);
  if (!event) throw new Error('Evento no encontrado.');

  const description =
    event.description && typeof event.description === 'object'
      ? (event.description as Record<string, unknown>)
      : {};
  const location = event.location && typeof event.location === 'object'
    ? (event.location as Record<string, unknown>)
    : {};

  const { data: paymentMethodLinks, error: paymentMethodsError } = await supabase
    .from('eventPaymentMethod')
    .select('paymentMethod')
    .eq('event', eventId);

  if (paymentMethodsError) throw new Error(paymentMethodsError.message);

  const paymentMethodIds = Array.from(
    new Set(
      (paymentMethodLinks ?? [])
        .map((row) => Number((row as { paymentMethod: number | string | null }).paymentMethod))
        .filter((id) => Number.isInteger(id) && id > 0)
    )
  );

  const { data: activePaymentMethods, error: activePaymentMethodsError } =
    paymentMethodIds.length > 0
      ? await supabase
          .from('paymentMethod')
          .select('id')
          .in('id', paymentMethodIds)
          .eq('is_active', true)
          .limit(1)
      : { data: [], error: null };

  if (activePaymentMethodsError) throw new Error(activePaymentMethodsError.message);

  const publishReadiness = getEventPublishReadiness({
    title: event.title,
    startTime: event.start_time,
    endTime: event.end_time,
    district: event.district,
    locationText: event.location_text,
    lat: location.lat,
    lng: location.lng ?? location.long,
    paymentMethodCount: (activePaymentMethods ?? []).length,
    isFieldReservedConfirmed: parseStoredBoolean(description.field_reserved_confirmed),
  });

  if (!publishReadiness.isReady && publishReadiness.primaryMessage) {
    throw new Error(publishReadiness.primaryMessage);
  }
}

function normalizeFeatureIds(ids: number[]) {
  return Array.from(
    new Set(ids.filter((id) => Number.isInteger(id) && id > 0))
  );
}

function normalizePaymentMethodIds(ids: number[]) {
  return Array.from(
    new Set(ids.filter((id) => Number.isInteger(id) && id > 0))
  );
}

async function syncEventFeatures(
  supabase: SupabaseClientLike,
  eventId: string | number,
  featureIds: number[]
) {
  const normalizedFeatureIds = normalizeFeatureIds(featureIds);

  const { error: deleteError } = await supabase.from('eventFeatures').delete().eq('event', eventId);
  if (deleteError) throw new Error(deleteError.message);

  if (normalizedFeatureIds.length === 0) return;

  const { error: insertError } = await supabase.from('eventFeatures').insert(
    normalizedFeatureIds.map((featureId) => ({
      event: eventId,
      feature: featureId,
    }))
  );

  if (insertError) throw new Error(insertError.message);
}

async function syncEventPaymentMethods(
  supabase: SupabaseClientLike,
  eventId: string | number,
  ownerUserId: string,
  paymentMethodIds: number[]
) {
  const normalizedPaymentMethodIds = normalizePaymentMethodIds(paymentMethodIds);

  const { error: deleteError } = await supabase
    .from('eventPaymentMethod')
    .delete()
    .eq('event', eventId);

  if (deleteError) throw new Error(deleteError.message);

  if (normalizedPaymentMethodIds.length === 0) return;

  const { data: ownedMethods, error: ownedMethodsError } = await supabase
    .from('paymentMethod')
    .select('id')
    .eq('created_by', ownerUserId)
    .eq('is_active', true)
    .in('id', normalizedPaymentMethodIds);

  if (ownedMethodsError) throw new Error(ownedMethodsError.message);

  const ownedMethodIds = Array.from(
    new Set(
      (ownedMethods ?? [])
        .map((row) => Number((row as { id: number }).id))
        .filter((id) => Number.isInteger(id) && id > 0)
    )
  );

  if (ownedMethodIds.length !== normalizedPaymentMethodIds.length) {
    throw new Error('Solo puedes usar formas de pago activas creadas por tu cuenta.');
  }

  const { error: insertError } = await supabase.from('eventPaymentMethod').insert(
    ownedMethodIds.map((paymentMethodId) => ({
      event: eventId,
      paymentMethod: paymentMethodId,
    }))
  );

  if (insertError) throw new Error(insertError.message);
}

async function clearEventRelations(supabase: SupabaseClientLike, eventId: string | number) {
  const { error: deletePaymentMethodsError } = await supabase
    .from('eventPaymentMethod')
    .delete()
    .eq('event', eventId);

  if (deletePaymentMethodsError) {
    throw new Error(deletePaymentMethodsError.message);
  }

  const { error: deleteFeaturesError } = await supabase.from('eventFeatures').delete().eq('event', eventId);

  if (deleteFeaturesError) {
    throw new Error(deleteFeaturesError.message);
  }
}

export async function createEvent(input: EventUpsertInput) {
  validateEventFormInput(input);

  const { adminSupabase, user } = await getAuthenticatedAdminContext('crear');

  const { data: profile, error: profileError } = await adminSupabase
    .from('profile')
    .select('username')
    .eq('user', user.id)
    .maybeSingle();
  if (profileError) throw new Error(profileError.message);

  const createdBy = profile?.username || user.email?.split('@')[0] || 'Peloteras';
  const canManageFeatured = isSuperAdmin(user as any);
  const isFeatured = canManageFeatured ? Boolean(input.isFeatured) : false;
  let createdEventId: string | number | null = null;

  try {
    const { data: createdEvent, error } = await adminSupabase
      .from('event')
      .insert(toInsertPayload(input, user.id, createdBy, isFeatured))
      .select('id')
      .single();

    if (error) throw new Error(error.message);
    if (!createdEvent?.id) throw new Error('No se pudo obtener el id del evento creado.');

    createdEventId = createdEvent.id;

    await syncEventFeatures(adminSupabase, createdEvent.id, input.featureIds);
    await syncEventPaymentMethods(adminSupabase, createdEvent.id, user.id, input.paymentMethodIds);

    try {
      await ensureGoogleWalletEventClass({
        eventId: createdEvent.id,
        eventTitle: input.title,
        eventStartTime: input.startTime,
        eventEndTime: input.endTime,
      });
    } catch (walletError) {
      log.warn('Could not provision Google Wallet class on event creation', 'ADMIN_EVENTS', {
        eventId: createdEvent.id,
        error: walletError,
      });
    }
  } catch (error) {
    if (createdEventId !== null) {
      try {
        await clearEventRelations(adminSupabase, createdEventId);
        const { error: deleteEventError } = await adminSupabase.from('event').delete().eq('id', createdEventId);
        if (deleteEventError) {
          log.database('ROLLBACK create event', 'event', deleteEventError as any, {
            eventId: createdEventId,
          });
        }
      } catch (rollbackError) {
        log.error('Event rollback failed after create error', 'ADMIN_EVENTS', rollbackError, {
          eventId: createdEventId,
        });
      }
    }

    log.error('Event creation failed', 'ADMIN_EVENTS', error, {
      userId: user.id,
      paymentMethodIds: input.paymentMethodIds,
      featureIds: input.featureIds,
    });
    throw new Error(getErrorMessage(error, 'No se pudo crear el evento.'));
  }

  revalidatePath('/admin/events');
  revalidatePath('/events');
  revalidatePath(`/events/${createdEventId}`);
  revalidatePath(`/payments/${createdEventId}`);
  revalidatePath('/');

  return { id: String(createdEventId) };
}

export async function updateEvent(id: string, input: EventUpsertInput) {
  validateEventFormInput(input);

  const { adminSupabase, user } = await getAuthenticatedAdminContext('editar');
  await assertCanManageEvent(adminSupabase, id, user);
  const canManageFeatured = isSuperAdmin(user as any);
  let isFeatured = false;

  if (canManageFeatured) {
    isFeatured = Boolean(input.isFeatured);
  } else {
    const { data: existingEvent, error: existingEventError } = await adminSupabase
      .from('event')
      .select('is_featured')
      .eq('id', id)
      .maybeSingle();

    if (existingEventError) throw new Error(existingEventError.message);
    isFeatured = Boolean(existingEvent?.is_featured);
  }

  const { error } = await adminSupabase
    .from('event')
    .update(toUpdatePayload(input, isFeatured))
    .eq('id', id);

  if (error) throw new Error(error.message);

  await syncEventFeatures(adminSupabase, id, input.featureIds);
  await syncEventPaymentMethods(adminSupabase, id, user.id, input.paymentMethodIds);

  try {
    await ensureGoogleWalletEventClass({
      eventId: id,
      eventTitle: input.title,
      eventStartTime: input.startTime,
      eventEndTime: input.endTime,
    });
  } catch (walletError) {
    log.warn('Could not provision Google Wallet class on event update', 'ADMIN_EVENTS', {
      eventId: id,
      error: walletError,
    });
  }

  revalidatePath('/admin/events');
  revalidatePath(`/admin/events/${id}/edit`);
  revalidatePath('/events');
  revalidatePath(`/events/${id}`);
  revalidatePath(`/payments/${id}`);
  revalidatePath('/');
}

export async function deleteEvent(id: string) {
  const { adminSupabase, user } = await getAuthenticatedAdminContext('eliminar');
  await assertCanManageEvent(adminSupabase, id, user);
  await clearEventRelations(adminSupabase, id);

  const { error } = await adminSupabase.from('event').delete().eq('id', id);
  if (error) throw new Error(error.message);

  revalidatePath('/admin/events');
  revalidatePath('/events');
  revalidatePath('/');
}

export async function setEventFeatured(id: string, isFeatured: boolean) {
  const { adminSupabase, user } = await getAuthenticatedAdminContext('gestionar');
  if (!isSuperAdmin(user as any)) {
    throw new Error('Solo superadmin puede gestionar partidos destacados.');
  }
  if (!id) throw new Error('Id de evento inválido.');

  const { error } = await adminSupabase.from('event').update({ is_featured: isFeatured }).eq('id', id);
  if (error) throw new Error(error.message);

  revalidatePath('/admin/events');
  revalidatePath('/events');
  revalidatePath(`/events/${id}`);
  revalidatePath('/');
}

export async function setEventPublished(id: string, isPublished: boolean) {
  const { adminSupabase, user } = await getAuthenticatedAdminContext('gestionar');
  if (!id) throw new Error('Id de evento inválido.');

  if (isPublished) {
    await assertEventCanBePublished(adminSupabase, id, user);
  } else {
    await assertCanManageEvent(adminSupabase, id, user);
  }

  const { error } = await adminSupabase.from('event').update({ is_published: isPublished }).eq('id', id);
  if (error) throw new Error(error.message);

  revalidatePath('/admin/events');
  revalidatePath(`/admin/events/${id}/edit`);
  revalidatePath('/events');
  revalidatePath(`/events/${id}`);
  revalidatePath(`/payments/${id}`);
  revalidatePath('/');
}
