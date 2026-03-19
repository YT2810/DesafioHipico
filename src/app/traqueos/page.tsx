import type { Metadata } from 'next';
import TraqueosClient from './TraqueosClient';

const BASE = 'https://www.desafiohipico.com';

export const metadata: Metadata = {
  title: 'Traqueos La Rinconada · Trabajos Oficiales INH Esta Semana',
  description:
    'Consulta gratis los traqueos oficiales de La Rinconada publicados por la División de Toma Tiempos del INH. Trabajos, parciales, remates y comentarios de cada ejemplar para el próximo domingo.',
  keywords: [
    'traqueos La Rinconada',
    'traqueos oficiales INH',
    'traqueos La Rinconada hoy',
    'traqueos la rinconada gratis',
    'traqueos de esta semana la rinconada',
    'traqueos en la rinconada para este domingo',
    'trabajos caballos La Rinconada',
    'parciales caballos Venezuela',
    'toma tiempos INH',
    'trabajos oficiales hipódromo Venezuela',
    'remates caballos La Rinconada',
    'ajustes caballos La Rinconada',
  ],
  alternates: { canonical: `${BASE}/traqueos` },
  openGraph: {
    title: 'Traqueos La Rinconada · Trabajos Oficiales INH',
    description:
      'Traqueos y parciales oficiales de los caballos en La Rinconada. Datos de la División de Toma Tiempos del INH, actualizados cada semana.',
    url: `${BASE}/traqueos`,
    siteName: 'Desafío Hípico',
    locale: 'es_VE',
    type: 'website',
    images: [{ url: `${BASE}/api/og`, width: 1200, height: 630, alt: 'Traqueos La Rinconada · Desafío Hípico' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Traqueos La Rinconada · Trabajos Oficiales INH',
    description: 'Parciales, remates y trabajos de cada ejemplar. Datos oficiales INH.',
    images: [`${BASE}/api/og`],
  },
};

export default function TraqueosPage() {
  return <TraqueosClient />;
}
