'use server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { getServerSupabase } from '@src/core/api/supabase.server';

export type EventInput = {
  title: string;
  price: number;
  date?: string;
  level_id?: number;
  eventType_id?: number;
  capacity?: number;
  locationText?: string;
};

function isEventsVerified(value: unknown) {
  return value === true || value === 'true';
}

export async function createEvent(input: EventInput) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isEventsVerified(user?.user_metadata?.events_verified)) {
    throw new Error('Debes verificar tu identidad para crear eventos.');
  }
  const { error } = await supabase.from('event').insert({
    title: input.title,
    price: input.price,
    formattedDateTime: input.date,
    level_id: input.level_id,
    eventType_id: input.eventType_id,
    capacity: input.capacity,
    locationText: input.locationText,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/events');
}

export async function updateEvent(id: string, input: EventInput) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isEventsVerified(user?.user_metadata?.events_verified)) {
    throw new Error('Debes verificar tu identidad para editar eventos.');
  }
  const { error } = await supabase
    .from('event')
    .update({
      title: input.title,
      price: input.price,
      formattedDateTime: input.date,
      level_id: input.level_id,
      eventType_id: input.eventType_id,
      capacity: input.capacity,
      locationText: input.locationText,
    })
    .eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/events');
  revalidatePath(`/admin/events/${id}/edit`);
}

export async function deleteEvent(id: string) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isEventsVerified(user?.user_metadata?.events_verified)) {
    throw new Error('Debes verificar tu identidad para eliminar eventos.');
  }
  const { error } = await supabase.from('event').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/events');
}
