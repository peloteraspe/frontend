'use server';

import { revalidatePath } from 'next/cache';
import { getServerSupabase } from '@src/core/api/supabase.server';
import { log } from '@core/lib/logger';
import { EventUpsertInput, validateEventFormInput } from '@modules/admin/model/eventForm';
import { isSuperAdmin } from '@shared/lib/auth/isAdmin';
import { ensureGoogleWalletEventClass } from '@modules/tickets/api/services/google-wallet.service';

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
    is_featured: isFeatured,
    created_by_id: userId,
    created_by: createdBy,
  };
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
  supabase: Awaited<ReturnType<typeof getServerSupabase>>,
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
  supabase: Awaited<ReturnType<typeof getServerSupabase>>,
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
    throw new Error('Solo puedes usar formas de pago creadas por tu cuenta.');
  }

  const { error: insertError } = await supabase.from('eventPaymentMethod').insert(
    ownedMethodIds.map((paymentMethodId) => ({
      event: eventId,
      paymentMethod: paymentMethodId,
    }))
  );

  if (insertError) throw new Error(insertError.message);
}

export async function createEvent(input: EventUpsertInput) {
  validateEventFormInput(input);

  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Debes iniciar sesión para crear eventos.');

  const { data: profile } = await supabase
    .from('profile')
    .select('username')
    .eq('user', user.id)
    .maybeSingle();

  const createdBy = profile?.username || user.email?.split('@')[0] || 'Peloteras';
  const canManageFeatured = isSuperAdmin(user as any);
  const isFeatured = canManageFeatured ? Boolean(input.isFeatured) : false;

  const { data: createdEvent, error } = await supabase
    .from('event')
    .insert(toInsertPayload(input, user.id, createdBy, isFeatured))
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  if (!createdEvent?.id) throw new Error('No se pudo obtener el id del evento creado.');

  await syncEventFeatures(supabase, createdEvent.id, input.featureIds);
  await syncEventPaymentMethods(supabase, createdEvent.id, user.id, input.paymentMethodIds);

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

  revalidatePath('/admin/events');
  revalidatePath('/events');
  revalidatePath(`/events/${createdEvent.id}`);
  revalidatePath(`/payments/${createdEvent.id}`);
  revalidatePath('/');

  return { id: String(createdEvent.id) };
}

export async function updateEvent(id: string, input: EventUpsertInput) {
  validateEventFormInput(input);

  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Debes iniciar sesión para editar eventos.');

  const { data: profile } = await supabase
    .from('profile')
    .select('username')
    .eq('user', user.id)
    .maybeSingle();

  const createdBy = profile?.username || user.email?.split('@')[0] || 'Peloteras';
  const canManageFeatured = isSuperAdmin(user as any);
  let isFeatured = false;

  if (canManageFeatured) {
    isFeatured = Boolean(input.isFeatured);
  } else {
    const { data: existingEvent, error: existingEventError } = await supabase
      .from('event')
      .select('is_featured')
      .eq('id', id)
      .maybeSingle();

    if (existingEventError) throw new Error(existingEventError.message);
    isFeatured = Boolean(existingEvent?.is_featured);
  }

  const { error } = await supabase
    .from('event')
    .update(toInsertPayload(input, user.id, createdBy, isFeatured))
    .eq('id', id);

  if (error) throw new Error(error.message);

  await syncEventFeatures(supabase, id, input.featureIds);
  await syncEventPaymentMethods(supabase, id, user.id, input.paymentMethodIds);

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
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Debes iniciar sesión para eliminar eventos.');

  const { error } = await supabase.from('event').delete().eq('id', id);
  if (error) throw new Error(error.message);

  revalidatePath('/admin/events');
  revalidatePath('/events');
  revalidatePath('/');
}

export async function setEventFeatured(id: string, isFeatured: boolean) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Debes iniciar sesión para gestionar destacados.');
  if (!isSuperAdmin(user as any)) {
    throw new Error('Solo superadmin puede gestionar partidos destacados.');
  }
  if (!id) throw new Error('Id de evento inválido.');

  const { error } = await supabase.from('event').update({ is_featured: isFeatured }).eq('id', id);
  if (error) throw new Error(error.message);

  revalidatePath('/admin/events');
  revalidatePath('/events');
  revalidatePath(`/events/${id}`);
  revalidatePath('/');
}
