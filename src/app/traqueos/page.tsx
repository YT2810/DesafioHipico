import type { Metadata } from 'next';
import TraqueosClient from './TraqueosClient';
import connectMongo from '@/lib/mongodb';
import WorkoutEntry from '@/models/WorkoutEntry';
import Track from '@/models/Track';

const BASE = 'https://www.desafiohipico.com';

const MONTHS_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DAYS_ES = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

export const revalidate = 300; // ISR: re-fetch MongoDB cada 5 min

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

function sessionLabel(sourceFile: string) {
  const f = (sourceFile ?? '').toUpperCase();
  if (f.includes('AJUSTE')) return 'Ajustes';
  if (f.includes('TRABAJO')) return 'Trabajos';
  return 'Traqueos';
}

export default async function TraqueosPage() {
  let dates: { _id: string; sourceFile: string }[] = [];
  try {
    await connectMongo();
    const track = await Track.findOne({ name: /rinconada/i }).lean() as any;
    if (track) {
      dates = await WorkoutEntry.aggregate([
        { $match: { trackId: track._id } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$workoutDate' } }, sourceFile: { $first: '$sourceFile' } } },
        { $sort: { _id: -1 } },
        { $limit: 60 },
      ]);
    }
  } catch { /* build time — skip */ }

  // JSON-LD: DataCatalog (hub) + ItemList of sessions
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'DataCatalog',
    name: 'Traqueos La Rinconada · Desafío Hípico',
    description: 'Catálogo de traqueos y trabajos oficiales de La Rinconada publicados por la División de Toma Tiempos del INH.',
    url: `${BASE}/traqueos`,
    publisher: { '@type': 'Organization', name: 'Desafío Hípico', url: BASE },
    dataset: dates.map(d => {
      const dt = new Date(`${d._id}T12:00:00Z`);
      const label = sessionLabel(d.sourceFile);
      const day = DAYS_ES[dt.getUTCDay()];
      const dd = dt.getUTCDate();
      const mon = MONTHS_ES[dt.getUTCMonth()];
      const y = dt.getUTCFullYear();
      return {
        '@type': 'Dataset',
        name: `${label} La Rinconada ${day} ${dd} de ${mon} ${y}`,
        url: `${BASE}/traqueos/${d._id}`,
        datePublished: d._id,
        creator: { '@type': 'Organization', name: 'Instituto Nacional de Hipismo (INH)' },
      };
    }),
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Desafío Hípico', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'Traqueos La Rinconada', item: `${BASE}/traqueos` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <TraqueosClient />
    </>
  );
}
