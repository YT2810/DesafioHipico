import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.desafiohipico.com';
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/pronosticos',
          '/retirados',
          '/programa/',
          '/ranking',
          '/traqueos',
          '/retrospectos',
          '/revista/',
          '/resultados',
          '/en-vivo',
          '/handicapper/',
          '/contacto',
        ],
        disallow: [
          '/admin/',
          '/staff/',
          '/api/',
          '/perfil',
          '/auth/',
        ],
      },
      {
        // Allow AI crawlers explicitly for LLM indexing
        userAgent: ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Googlebot-News'],
        allow: [
          '/',
          '/pronosticos',
          '/retirados',
          '/programa/',
          '/ranking',
          '/traqueos',
          '/retrospectos',
          '/revista/',
          '/resultados',
          '/handicapper/',
        ],
        disallow: ['/admin/', '/api/', '/staff/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
