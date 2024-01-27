// utils/supabaseServer.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function getCollectionsFromSupabase({
  searchValue = '',
  sortKey = 'title',
  reverse = false,
} = {}) {
  const { data, error } = await supabase
    .from('event')
    .select('id, title')
    .order(sortKey, { ascending: reverse })
    .ilike('title', `%${searchValue}%`);

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getCollectionBySlugFromSupabase(slug: any) {
  const { data, error } = await supabase
    .from('event')
    .select('id, title')
    .eq('title', slug)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}