import type { Metadata } from 'next';
import HandicapperPublicClient from './HandicapperPublicClient';

interface Props { params: Promise<{ id: string }> }

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.desafiohipico.com';

async function fetchProfile(id: string) {
  try {
    const res = await fetch(`${BASE}/api/handicapper/${id}/public`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await fetchProfile(id);
  if (!data) return { title: 'Handicapper | Desafío Hípico' };

  const { profile, meeting } = data;
  const title = `${profile.pseudonym} — Pronósticos hípicos Venezuela`;
  const description = profile.bio
    ? `${profile.bio} · Acierto general: ${profile.stats.pctGeneral?.toFixed(0) ?? 0}%`
    : `Pronósticos de ${profile.pseudonym} para las carreras hípicas de Venezuela. Acierto 1°: ${profile.stats.pct1st?.toFixed(0) ?? 0}%. La Rinconada · Valencia.`;

  const ogImg = `${BASE}/api/og/handicapper?id=${id}`;

  return {
    title: `${title} | Desafío Hípico`,
    description,
    keywords: [
      `pronósticos ${profile.pseudonym}`,
      `${profile.pseudonym} hipismo Venezuela`,
      `handicapper ${profile.pseudonym}`,
      'pronósticos hípicos Venezuela',
      'La Rinconada pronósticos',
    ],
    openGraph: {
      title,
      description,
      type: 'profile',
      locale: 'es_VE',
      images: [{ url: ogImg, width: 1080, height: 1350, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      images: [ogImg],
    },
    alternates: { canonical: `${BASE}/handicapper/${id}` },
  };
}

export default async function HandicapperPublicPage({ params }: Props) {
  const { id } = await params;
  const data = await fetchProfile(id);

  // JSON-LD Person schema
  const personSchema = data ? {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: data.profile.pseudonym,
    url: `${BASE}/handicapper/${id}`,
    jobTitle: 'Handicapper hípico',
    worksFor: { '@type': 'Organization', name: 'Desafío Hípico', url: BASE },
    description: data.profile.bio ?? `Handicapper hípico venezolano. Acierto 1°: ${data.profile.stats?.pct1st?.toFixed(0) ?? 0}%.`,
  } : null;

  return (
    <>
      {personSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }} />
      )}
      <HandicapperPublicClient id={id} initialData={data} />
    </>
  );
}
