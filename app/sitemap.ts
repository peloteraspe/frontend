import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getAbsoluteUrl } from '@shared/lib/site';

export const dynamic = 'force-dynamic';

const publicPages: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority: number;
}> = [
  { path: '/', changeFrequency: 'daily', priority: 1 },
  { path: '/events', changeFrequency: 'daily', priority: 0.9 },
  { path: '/registro-jugadoras', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/organiza-con-peloteras', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/patrocinios', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/customer-support', changeFrequency: 'monthly', priority: 0.4 },
];

async function getPublishedEventIds(): Promise<string[]> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) return [];

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: {
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            signal: AbortSignal.timeout(4000),
          }),
      },
    });
    const { data, error } = await supabase
      .from('event')
      .select('id')
      .eq('is_published', true)
      .order('start_time', { ascending: false });

    if (error) {
      console.warn('Could not add published events to sitemap', error.message);
      return [];
    }

    return (data ?? []).map((event) => String(event.id));
  } catch (error) {
    console.warn(
      'Could not add published events to sitemap',
      error instanceof Error ? error.message : String(error)
    );
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const eventIds = await getPublishedEventIds();

  return [
    ...publicPages.map((page) => ({
      url: getAbsoluteUrl(page.path),
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    })),
    ...eventIds.map((eventId) => ({
      url: getAbsoluteUrl(`/events/${encodeURIComponent(eventId)}`),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];
}
