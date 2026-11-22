import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const rawBase =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://darktriad.in';
  const baseUrl = rawBase.replace(/\/+$/, '');

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
