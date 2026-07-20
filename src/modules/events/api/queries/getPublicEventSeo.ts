import 'server-only';
import { cache } from 'react';
import { getServerSupabase } from '@core/api/supabase.server';
import { extractEventDescriptionText } from '@shared/lib/eventDescription';
import { extractEventPlaceText } from '@shared/lib/eventPlaceText';

export type PublicEventSeo = {
  id: string;
  title: string;
  description: string;
  startTime: string | null;
  endTime: string | null;
  locationText: string;
  district: string;
  price: number | null;
};

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function numericValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export const getPublicEventSeoById = cache(async (id: string): Promise<PublicEventSeo | null> => {
  const normalizedId = text(id);
  if (!normalizedId) return null;

  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from('event')
      .select(
        'id,title,description,start_time,end_time,location_text,district,price,place_text,is_published'
      )
      .eq('id', normalizedId)
      .eq('is_published', true)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: String(data.id),
      title: text(data.title) || 'Pichanga Peloteras',
      description: text(extractEventDescriptionText(data.description)),
      startTime: text(data.start_time) || null,
      endTime: text(data.end_time) || null,
      locationText: text(data.location_text) || extractEventPlaceText(data),
      district: text(data.district),
      price: numericValue(data.price),
    };
  } catch {
    return null;
  }
});
