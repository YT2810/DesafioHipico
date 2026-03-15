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

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Resultados de Carreras | Desafío Hípico Venezuela',
    description: 'Resultados oficiales de carreras de caballos en Venezuela — Hipódromo La Rinconada (Caracas), Valencia y más. Posiciones, tiempos, dividendos y video resumen de cada jornada.',
    keywords: 'resultados carreras caballos venezuela, resultados la rinconada, hipódromo caracas resultados, dividendos hipismo venezuela, ganadores carreras',
    openGraph: {
      title: 'Resultados de Carreras | Desafío Hípico Venezuela',
      description: 'Posiciones, dividendos y video resumen de cada jornada hípica en Venezuela.',
      type: 'website',
    },
    alternates: {
      canonical: 'https://desafiohipico.com/resultados',
    },
  };
}

export default function ResultadosPage() {
  return (
    <>
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
    </>
  );
}
