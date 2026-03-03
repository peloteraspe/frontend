'use server';

import { revalidatePath } from 'next/cache';
import { getServerSupabase } from '@src/core/api/supabase.server';
import { EventUpsertInput } from '@modules/admin/model/eventForm';

function isEventsVerified(value: unknown) {
  return value === true || value === 'true';
}

function toInsertPayload(input: EventUpsertInput, userId: string, createdBy: string) {
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

  const { error } = await supabase.from('event').insert(toInsertPayload(input, user.id, createdBy));
  if (error) throw new Error(error.message);

  revalidatePath('/admin/events');
  revalidatePath('/events');
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

  const { error } = await supabase
    .from('event')
    .update(toInsertPayload(input, user.id, createdBy))
    .eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath('/admin/events');
  revalidatePath(`/admin/events/${id}/edit`);
  revalidatePath('/events');
  revalidatePath(`/events/${id}`);
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
}
