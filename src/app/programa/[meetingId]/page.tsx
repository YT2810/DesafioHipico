import type { Metadata } from 'next';
import ProgramaClient from './ProgramaClient';

interface Props {
  params: Promise<{ meetingId: string }>;
}

async function fetchMeetingMeta(meetingId: string) {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.desafiohipico.com';
    const res = await fetch(`${base}/api/programa/${meetingId}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { meetingId } = await params;
  const data = await fetchMeetingMeta(meetingId);

  if (!data?.meeting) {
    return {
      title: 'Programa e Inscritos | Desafío Hípico',
      description: 'Programa e inscritos de la reunión hípica en Venezuela.',
    };
  }

  const m = data.meeting;
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.desafiohipico.com';
  const dateStr = new Date(m.date).toLocaleDateString('es-VE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const dateShort = new Date(m.date).toLocaleDateString('es-VE', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  const raceCount: number = data.races?.length ?? 0;
  const title = `Inscritos Reunión ${m.meetingNumber} — ${m.trackName} ${dateShort}`;
  const description = `Programa oficial e inscritos para la Reunión ${m.meetingNumber} del ${m.trackName}${m.trackLocation ? ` (${m.trackLocation})` : ''}, ${dateStr}. ${raceCount} carrera${raceCount !== 1 ? 's' : ''} con dorsales, jinetes y entrenadores. INH · HINAVA.`;

  const ogImg = `${base}/api/og?title=${encodeURIComponent(`Inscritos ${m.trackName}`)}&subtitle=${encodeURIComponent(`Reunión ${m.meetingNumber} · ${dateShort}`)}`;
  return {
    title,
    description,
    keywords: [
      `inscritos ${m.trackName}`,
      `inscritos ${m.trackName} ${dateShort}`,
      `programa ${m.trackName} ${dateShort}`,
      `inscritos reunión ${m.meetingNumber}`,
      'inscritos hipódromo Venezuela',
      'inscritos La Rinconada hoy',
      'programa carreras Venezuela',
      'dorsales carreras Venezuela',
    ],
    openGraph: {
      title,
      description,
      type: 'website',
      locale: 'es_VE',
      images: [{ url: ogImg, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image' as const,
      images: [ogImg],
    },
    alternates: {
      canonical: `${base}/programa/${meetingId}`,
    },
  };
}

export default async function ProgramaPage({ params }: Props) {
  const { meetingId } = await params;
  const data = await fetchMeetingMeta(meetingId);

  // Build SportsEvent JSON-LD array for each race
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.desafiohipico.com';
  const m = data?.meeting;
  const races: any[] = data?.races ?? [];

  const sportsEvents = m
    ? races.map((race: any) => ({
        '@context': 'https://schema.org',
        '@type': 'SportsEvent',
        name: `Carrera ${race.raceNumber} — ${m.trackName} Reunión ${m.meetingNumber}`,
        description: `${race.distance} metros${race.conditions ? `. ${race.conditions}` : ''}`,
        startDate: race.scheduledTime
          ? `${m.date.substring(0, 10)}T${race.scheduledTime}`
          : m.date,
        location: {
          '@type': 'SportsActivityLocation',
          name: m.trackName,
          address: {
            '@type': 'PostalAddress',
            addressLocality: m.trackLocation || m.trackName,
            addressCountry: 'VE',
          },
        },
        organizer: {
          '@type': 'SportsOrganization',
          name: m.isValencia ? 'HINAVA' : 'INH',
          url: m.isValencia ? 'https://www.hinava.com.ve' : 'https://www.inh.gob.ve',
        },
        url: `${base}/programa/${meetingId}`,
        competitor: (race.entries ?? []).slice(0, 10).map((e: any) => ({
          '@type': 'Person',
          name: e.horseName,
          description: `Dorsal ${e.dorsalNumber}${e.jockeyName ? ` · Jockey: ${e.jockeyName}` : ''}${e.trainerName ? ` · Entrenador: ${e.trainerName}` : ''}`,
        })),
      }))
    : [];

  const breadcrumb = m ? {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Desafío Hípico', item: base },
      { '@type': 'ListItem', position: 2, name: 'Programa', item: `${base}/programa` },
      { '@type': 'ListItem', position: 3, name: m.trackName, item: `${base}/programa/${meetingId}` },
    ],
  } : null;

  return (
    <>
      {sportsEvents.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(sportsEvents) }}
        />
      )}
      {breadcrumb && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
        />
      )}
      <ProgramaClient meetingId={meetingId} />
    </>
  );
}
