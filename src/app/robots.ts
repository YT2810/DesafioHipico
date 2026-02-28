import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.desafiohipico.com';
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/pronosticos', '/retirados', '/programa/'],
        disallow: [
          '/admin/',
          '/staff/',
          '/api/',
          '/perfil',
          '/handicapper/',
          '/auth/',
        ],
      },
      {
        // Allow AI crawlers explicitly for LLM indexing (Googlebot-AI, GPTBot, ClaudeBot, PerplexityBot)
        userAgent: ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Googlebot-News'],
        allow: ['/', '/pronosticos', '/retirados', '/programa/'],
        disallow: ['/admin/', '/api/', '/staff/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
