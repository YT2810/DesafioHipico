import type { Metadata } from 'next';
import EnVivoClient from './EnVivoClient';

const BASE = 'https://www.desafiohipico.com';

export const metadata: Metadata = {
  title: 'INH en Vivo · Carreras La Rinconada en Directo',
  description: 'Mira la transmisión en vivo del Hipódromo La Rinconada. Inscritos, programa de carreras y favoritos de cada carrera mientras ves la transmisión oficial del INH.',
  keywords: [
    'inh en vivo',
    'inh oficial en vivo',
    'la rinconada en vivo',
    'carreras en vivo venezuela',
    'hipódromo la rinconada en vivo hoy',
    'la rinconada carreras en vivo',
    'transmisión hipismo venezuela',
    'inh transmisión en vivo',
    'hipódromo la rinconada en directo',
    'carreras de caballos en vivo venezuela',
    'la rinconada en vivo domingo',
    'inh youtube en vivo',
  ],
  alternates: { canonical: `${BASE}/en-vivo` },
  openGraph: {
    title: 'INH en Vivo · La Rinconada en Directo',
    description: 'Transmisión en vivo de las carreras del Hipódromo La Rinconada con programa e inscritos en tiempo real.',
    url: `${BASE}/en-vivo`,
    siteName: 'Desafío Hípico',
    locale: 'es_VE',
    type: 'website',
    images: [{ url: `${BASE}/api/og`, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'INH en Vivo · La Rinconada en Directo',
    description: 'Transmisión en vivo del hipódromo + programa de carreras.',
    images: [`${BASE}/api/og`],
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BroadcastEvent',
  name: 'Transmisión en Vivo · Hipódromo La Rinconada',
  description: 'Transmisión oficial de las carreras del Hipódromo La Rinconada, Venezuela. Datos del INH.',
  isLiveBroadcast: true,
  broadcastOfEvent: {
    '@type': 'SportsEvent',
    name: 'Carreras de Caballos La Rinconada',
    location: {
      '@type': 'SportsActivityLocation',
      name: 'Hipódromo La Rinconada',
      address: { '@type': 'PostalAddress', addressLocality: 'Caracas', addressCountry: 'VE' },
    },
  },
  url: `${BASE}/en-vivo`,
};

const breadcrumb = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Desafío Hípico', item: BASE },
    { '@type': 'ListItem', position: 2, name: 'En Vivo', item: `${BASE}/en-vivo` },
  ],
};

export default function EnVivoPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <EnVivoClient />
    </>
  );
}
