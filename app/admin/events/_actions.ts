"use server";
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

export type EventInput = {
  title: string;
  price: number;
  date?: string;
  level_id?: number;
  eventType_id?: number;
  capacity?: number;
  locationText?: string;
};

export async function createEvent(input: EventInput) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
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
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { error } = await supabase.from('event').update({
    title: input.title,
    price: input.price,
    formattedDateTime: input.date,
    level_id: input.level_id,
    eventType_id: input.eventType_id,
    capacity: input.capacity,
    locationText: input.locationText,
  }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/events');
  revalidatePath(`/admin/events/${id}/edit`);
}

export async function deleteEvent(id: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { error } = await supabase.from('event').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/events');
}
