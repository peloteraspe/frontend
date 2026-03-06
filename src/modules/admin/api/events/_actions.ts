'use server';

import { revalidatePath } from 'next/cache';
import { getServerSupabase } from '@src/core/api/supabase.server';
import { EventUpsertInput } from '@modules/admin/model/eventForm';
import { isSuperAdmin } from '@shared/lib/auth/isAdmin';

function isEventsVerified(value: unknown) {
  return value === true || value === 'true';
}

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

export async function createEvent(input: EventUpsertInput) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Debes iniciar sesión para crear eventos.');

  if (!isEventsVerified(user.user_metadata?.events_verified)) {
    throw new Error('Debes verificar tu identidad para crear eventos.');
  }

  const { data: profile } = await supabase
    .from('profile')
    .select('username')
    .eq('user', user.id)
    .maybeSingle();

  const createdBy = profile?.username || user.email?.split('@')[0] || 'Peloteras';
  const canManageFeatured = isSuperAdmin(user as any);
  const isFeatured = canManageFeatured ? Boolean(input.isFeatured) : false;

  const { error } = await supabase
    .from('event')
    .insert(toInsertPayload(input, user.id, createdBy, isFeatured));
  if (error) throw new Error(error.message);

  revalidatePath('/admin/events');
  revalidatePath('/events');
  revalidatePath('/');
}

export async function updateEvent(id: string, input: EventUpsertInput) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Debes iniciar sesión para editar eventos.');

  if (!isEventsVerified(user.user_metadata?.events_verified)) {
    throw new Error('Debes verificar tu identidad para editar eventos.');
  }

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

  revalidatePath('/admin/events');
  revalidatePath(`/admin/events/${id}/edit`);
  revalidatePath('/events');
  revalidatePath(`/events/${id}`);
  revalidatePath('/');
}

export async function deleteEvent(id: string) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Debes iniciar sesión para eliminar eventos.');

  if (!isEventsVerified(user.user_metadata?.events_verified)) {
    throw new Error('Debes verificar tu identidad para eliminar eventos.');
  }

  const { error } = await supabase.from('event').delete().eq('id', id);
  if (error) throw new Error(error.message);

  revalidatePath('/admin/events');
  revalidatePath('/events');
  revalidatePath('/');
}
