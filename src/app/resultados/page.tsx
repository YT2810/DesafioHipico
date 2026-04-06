import type { Metadata } from 'next';
import ResultadosClient from './ResultadosClient';

export const dynamic = 'force-dynamic';
export const revalidate = 300; // 5 min cache

// SEO: hipódromos venezolanos conocidos
const TRACK_SEO: Record<string, { title: string; description: string; keywords: string }> = {
  'la rinconada': {
    title: 'Resultados La Rinconada | Hipódromo La Rinconada Caracas',
    description: 'Resultados oficiales de carreras en el Hipódromo La Rinconada, Caracas. Posiciones, dividendos y ganadores de cada carrera. Actualizado cada jornada.',
    keywords: 'resultados la rinconada, hipódromo la rinconada, carreras caracas, dividendos la rinconada, ganador la rinconada',
  },
  'valencia': {
    title: 'Resultados Valencia | Hipódromo La Rinconada Valencia',
    description: 'Resultados de carreras en el Hipódromo de Valencia, Venezuela. Posiciones, tiempos y dividendos de cada carrera.',
    keywords: 'resultados hipódromo valencia, carreras valencia venezuela, dividendos valencia, ganador valencia hipódromo',
  },
  'maracaibo': {
    title: 'Resultados Maracaibo | Carreras Hipódromo Maracaibo',
    description: 'Resultados de carreras hípicas en Maracaibo, Venezuela. Posiciones oficiales y dividendos.',
    keywords: 'resultados hipódromo maracaibo, carreras maracaibo, hipismo maracaibo',
  },
};

const BASE = 'https://www.desafiohipico.com';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Resultados La Rinconada y Valencia · INH Hoy',
    description: 'Resultados oficiales de carreras hípicas en Venezuela: Hipódromo La Rinconada (Caracas) y Valencia. Posiciones, tiempos, dividendos y ganadores de cada carrera. Datos del INH actualizados cada jornada.',
    keywords: [
      'resultados hípicos de hoy domingo',
      'resultados hipódromo la rinconada hoy',
      'resultados la rinconada',
      'resultados inh',
      'resultados inh hoy',
      'resultados inh hoy la rinconada',
      'la rinconada resultados',
      'resultados carreras caballos venezuela',
      'resultados hípicos de hoy domingo meridiano',
      'resultados hipódromo de valencia hoy',
      'dividendos la rinconada hoy',
      'ganadores carreras la rinconada',
      'resultados hinava hoy',
      'resultados 5y6 hipódromo la rinconada hoy',
      'cuánto pagó el 5y6 la rinconada',
      'cuánto pagó el 5y6 hoy',
      'datos la rinconada hoy',
      'datos resultados la rinconada',
    ],
    openGraph: {
      title: 'Resultados Hípicos · La Rinconada y Valencia · INH',
      description: 'Posiciones, tiempos, dividendos y ganadores de cada carrera hípica en Venezuela. Datos oficiales del INH.',
      type: 'website',
      url: `${BASE}/resultados`,
      siteName: 'Desafío Hípico',
      locale: 'es_VE',
      images: [{ url: `${BASE}/api/og`, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Resultados Hípicos · La Rinconada y Valencia',
      description: 'Posiciones, dividendos y ganadores. Datos oficiales INH Venezuela.',
      images: [`${BASE}/api/og`],
    },
    alternates: {
      canonical: `${BASE}/resultados`,
    },
  };
}

export default function ResultadosPage() {
  return (
    <>
      <h1 className="sr-only">Resultados La Rinconada y Valencia · Posiciones, Dividendos y Cuánto Pagó el 5y6</h1>
      {/* Structured data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SportsEvent',
            name: 'Resultados de Carreras Hípicas Venezuela',
            description: 'Resultados oficiales de hipódromos venezolanos',
            location: [
              { '@type': 'SportsActivityLocation', name: 'Hipódromo La Rinconada', address: { '@type': 'PostalAddress', addressLocality: 'Caracas', addressCountry: 'VE' } },
              { '@type': 'SportsActivityLocation', name: 'Hipódromo de Valencia', address: { '@type': 'PostalAddress', addressLocality: 'Valencia', addressCountry: 'VE' } },
            ],
            organizer: { '@type': 'Organization', name: 'Desafío Hípico' },
          }),
        }}
      />
      <ResultadosClient />
      <p className="text-[11px] text-gray-800 text-center leading-relaxed px-4 pb-4">
        Resultados La Rinconada hoy · Cuánto pagó el 5y6 La Rinconada · Dividendos La Rinconada ·
        Resultados Valencia hoy · Cuánto pagó el 5y6 Valencia · Datos INH Venezuela ·
        Ganadores carreras La Rinconada · Posiciones oficiales INH
      </p>
    </>
  );
}
