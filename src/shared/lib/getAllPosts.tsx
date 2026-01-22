import { getServerSupabase } from '@src/core/api/supabase.server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { log } from '../../core/lib/logger';

export default async function getAllPosts() {
  const supabase = await getServerSupabase();
  // Replace 'event' with the actual table name in your Supabase database if needed.
  const { data, error } = await supabase.from('event').select('*');

  if (error) {
    log.database('SELECT getAllPosts', 'event', error);
    throw new Error('Failed to fetch data');
  }

  return data;
}
