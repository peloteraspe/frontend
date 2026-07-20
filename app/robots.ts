import type { MetadataRoute } from 'next';
import { SITE_URL } from '@shared/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/api/',
        '/auth/',
        '/check-in/',
        '/create-event',
        '/login',
        '/payments/',
        '/profile',
        '/signUp',
        '/tickets',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
