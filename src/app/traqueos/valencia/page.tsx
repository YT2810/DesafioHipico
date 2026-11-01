import type { Metadata } from 'next';
import TraqueosClient from '../TraqueosClient';
import AnimatedSponsorBanner from '@/components/AnimatedSponsorBanner';
import { getActiveCampaign } from '@/services/adService';

const BASE = 'https://www.desafiohipico.com';

export const metadata: Metadata = {
  title: 'Traqueos Valencia · Trabajos Oficiales INH Hipódromo Nacional',
  description:
    'Consulta gratis los traqueos oficiales del Hipódromo Nacional de Valencia publicados por la División de Toma Tiempos del INH. Trabajos, parciales, remates y comentarios de cada ejemplar.',
  keywords: [
    'traqueos Valencia',
    'traqueos hipódromo Valencia',
    'traqueos oficiales INH Valencia',
    'trabajos caballos Valencia Venezuela',
    'parciales caballos Valencia',
    'toma tiempos Valencia INH',
    'traqueos hipódromo nacional Valencia',
    'ejercicios ejemplares Valencia',
  ],
  alternates: { canonical: `${BASE}/traqueos/valencia` },
  openGraph: {
    title: 'Traqueos Valencia · Trabajos Oficiales INH',
    description:
      'Traqueos y parciales oficiales de los caballos en el Hipódromo Nacional de Valencia. Datos de la División de Toma Tiempos del INH.',
    url: `${BASE}/traqueos/valencia`,
    siteName: 'Desafío Hípico',
    locale: 'es_VE',
    type: 'website',
    images: [{ url: `${BASE}/api/og`, width: 1200, height: 630, alt: 'Traqueos Valencia · Desafío Hípico' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Traqueos Valencia · Trabajos Oficiales INH',
    description: 'Parciales, remates y trabajos de cada ejemplar en Valencia. Datos oficiales INH.',
    images: [`${BASE}/api/og`],
  },
};

export const revalidate = 300;

export default async function TraqueosValenciaPage() {
  const sponsor = await getActiveCampaign('traqueos_inline');
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Desafío Hípico', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'Traqueos', item: `${BASE}/traqueos` },
      { '@type': 'ListItem', position: 3, name: 'Traqueos Valencia', item: `${BASE}/traqueos/valencia` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <TraqueosClient
        track="valencia"
        sponsorBanner={sponsor ? (
          <AnimatedSponsorBanner
            ad={{
              slug: sponsor.slug,
              brand: sponsor.brand,
              slot: 'traqueos_inline',
              badgeText: sponsor.creative.badgeText ?? 'Publicidad',
              title: sponsor.creative.title,
              subtitle: sponsor.creative.subtitle ?? '',
              ctaText: sponsor.creative.ctaText,
              logoUrl: sponsor.creative.logoUrl,
              accentColor: sponsor.creative.accentColor ?? '#00A8E8',
              endsAt: sponsor.endsAt ? new Date(sponsor.endsAt).toISOString() : undefined,
              isHouseAd: !!(sponsor as any).isHouseAd,
            }}
          />
        ) : undefined}
      />
    </>
  );
}
