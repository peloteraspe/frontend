import { getServerSupabase } from '@src/core/api/supabase.server';
import { log } from '@src/core/lib/logger';

export async function getFeatures() {
  const supabase = await getServerSupabase();

  const { data: features, error: featuresError } = await supabase.from('features').select('*');

  if (featuresError || !features) {
    log.database('SELECT getFeatures', 'features', featuresError);
    throw new Error('Failed to fetch data');
  }

  return features;
}
