'use server';

import { revalidatePath } from 'next/cache';
import { getServerSupabase } from '@src/core/api/supabase.server';
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
  paymentMethodIds: number[]
) {
  const normalizedPaymentMethodIds = normalizePaymentMethodIds(paymentMethodIds);

  const { error: deleteError } = await supabase
    .from('eventPaymentMethod')
    .delete()
    .eq('event', eventId);

  if (deleteError) throw new Error(deleteError.message);

  if (normalizedPaymentMethodIds.length === 0) return;

  const { error: insertError } = await supabase.from('eventPaymentMethod').insert(
    normalizedPaymentMethodIds.map((paymentMethodId) => ({
      event: eventId,
      paymentMethod: paymentMethodId,
    }))
  );

  if (insertError) throw new Error(insertError.message);
}

function isMissingEventWalletClassColumnError(error: any) {
  const message = String(error?.message ?? '').toLowerCase();
  return message.includes('google_wallet_class_id') && message.includes('does not exist');
}

async function syncGoogleWalletClassForEvent(
  supabase: Awaited<ReturnType<typeof getServerSupabase>>,
  input: {
    eventId: string | number;
    eventTitle: string;
    eventDescription?: string;
    startTime?: string;
    endTime?: string;
    locationText?: string;
  }
) {
  const walletClass = await ensureGoogleWalletEventClass({
    eventId: input.eventId,
    eventTitle: input.eventTitle,
    eventDescription: input.eventDescription,
    startTime: input.startTime,
    endTime: input.endTime,
    locationText: input.locationText,
  });

  if (!walletClass?.classId) {
    return null;
  }

  const { error } = await supabase
    .from('event')
    .update({ google_wallet_class_id: walletClass.classId })
    .eq('id', input.eventId);

  if (error) {
    if (isMissingEventWalletClassColumnError(error)) {
      throw new Error('Falta la migración de Google Wallet en event. Ejecuta migraciones.');
    }
    throw new Error(error.message);
  }

  return walletClass.classId;
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

  try {
    await syncGoogleWalletClassForEvent(supabase, {
      eventId: createdEvent.id,
      eventTitle: input.title,
      eventDescription: input.description,
      startTime: input.startTime,
      endTime: input.endTime,
      locationText: input.locationText,
    });
  } catch (walletError: any) {
    const { error: rollbackError } = await supabase.from('event').delete().eq('id', createdEvent.id);
    if (rollbackError) {
      throw new Error(
        `${walletError?.message || 'No se pudo crear la clase en Google Wallet.'} Además, no se pudo revertir el evento creado.`
      );
    }
    throw walletError;
  }

  await syncEventFeatures(supabase, createdEvent.id, input.featureIds);
  await syncEventPaymentMethods(supabase, createdEvent.id, input.paymentMethodIds);

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
  await syncEventPaymentMethods(supabase, id, input.paymentMethodIds);

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
