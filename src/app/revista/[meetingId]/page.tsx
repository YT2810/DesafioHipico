import type { Metadata } from 'next';
import RevistaClient from './RevistaClient';

const BASE = 'https://www.desafiohipico.com';

const MONTHS_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DAYS_ES = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];

interface Props {
  params: Promise<{ meetingId: string }>;
}

async function fetchMeta(meetingId: string) {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.desafiohipico.com';
    const res = await fetch(`${base}/api/revista/${meetingId}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { meetingId } = await params;
  const data = await fetchMeta(meetingId);
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.desafiohipico.com';

  if (!data?.meeting) {
    return { title: 'Revista Hípica | Desafío Hípico' };
  }

  const m = data.meeting;
  const dt = new Date(m.date);
  const dayName = DAYS_ES[dt.getUTCDay()];
  const dd = dt.getUTCDate();
  const mon = MONTHS_ES[dt.getUTCMonth()];
  const yyyy = dt.getUTCFullYear();
  const dateStr = `${dd} de ${mon} de ${yyyy}`;
  const isRinconada = (m.trackName ?? '').toLowerCase().includes('rinconada');
  const isValencia = (m.trackName ?? '').toLowerCase().includes('valencia');

  const trackShort = isRinconada ? 'La Rinconada' : isValencia ? 'Valencia' : m.trackName;
  const title = `${trackShort} Reunión ${m.meetingNumber} · Datos e Inscritos · ${dd} ${mon} ${yyyy}`;
  const description = `Inscritos, traqueos${data.hasWorkouts ? ' y trabajos de entrenamiento' : ''} de la Reunión ${m.meetingNumber} en ${m.trackName} del ${dayName} ${dateStr}. Historial de cada ejemplar, parciales y datos del INH.`;

  const keywords = [
    `datos ${isRinconada ? 'la rinconada' : 'valencia'} reunión ${m.meetingNumber}`,
    `inscritos ${isRinconada ? 'la rinconada' : 'valencia'} reunión ${m.meetingNumber}`,
    `datos ${isRinconada ? 'la rinconada' : 'hipódromo venezuela'} ${dayName} ${dd} de ${mon}`,
    `retrospectos la rinconada ${dd} de ${mon}`,
    isRinconada ? `cuánto pagó el 5y6 la rinconada ${dd} de ${mon}` : `cuánto pagó el 5y6 valencia`,
    isRinconada ? 'gaceta hípica rinconada digital' : `hipódromo valencia inscritos ${yyyy}`,
    'datos inh oficiales',
    'revista hípica la rinconada',
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `Reunión Hípica ${m.meetingNumber} · ${m.trackName}`,
    startDate: m.date,
    location: {
      '@type': 'SportsActivityLocation',
      name: m.trackName,
      address: { '@type': 'PostalAddress', addressCountry: 'VE' },
    },
    organizer: { '@type': 'Organization', name: 'Instituto Nacional de Hipismo (INH)', url: 'https://www.inh.gob.ve' },
    url: `${BASE}/revista/${meetingId}`,
    description,
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Desafío Hípico', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'Retrospectos', item: `${BASE}/retrospectos` },
      { '@type': 'ListItem', position: 3, name: title, item: `${BASE}/revista/${meetingId}` },
    ],
  };

  return {
    title,
    description,
    keywords,
    openGraph: {
      title,
      description,
      locale: 'es_VE',
      type: 'article',
      url: `${BASE}/revista/${meetingId}`,
      siteName: 'Desafío Hípico',
      images: [{ url: `${BASE}/api/og`, width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [`${BASE}/api/og`] },
    alternates: { canonical: `${BASE}/revista/${meetingId}` },
    other: { 'script:ld+json': JSON.stringify([jsonLd, breadcrumb]) },
  };
}

export default async function RevistaPage({ params }: Props) {
  const { meetingId } = await params;
  const data = await fetchMeta(meetingId);
  const m = data?.meeting;

  const dt = m ? new Date(m.date) : null;
  const dd2 = dt?.getUTCDate();
  const mon2 = dt ? MONTHS_ES[dt.getUTCMonth()] : '';
  const yyyy2 = dt?.getUTCFullYear();
  const dayName2 = dt ? DAYS_ES[dt.getUTCDay()] : '';
  const isRinconada2 = (m?.trackName ?? '').toLowerCase().includes('rinconada');
  const trackShort2 = isRinconada2 ? 'La Rinconada' : 'Valencia';

  return (
    <>
      {m && (
        <>
          <h1 className="sr-only">
            {trackShort2} · Reunión {m.meetingNumber} · {dayName2} {dd2} de {mon2} de {yyyy2} · Datos e Inscritos
          </h1>
          <p className="text-[11px] text-gray-800 text-center leading-relaxed px-4 pt-1">
            Datos {trackShort2} Reunión {m.meetingNumber} · Inscritos {trackShort2} {dayName2} {dd2} de {mon2} ·
            {isRinconada2 ? ` Cuánto pagó el 5y6 La Rinconada · Retrospectos La Rinconada · Gaceta hípica` : ` Cuánto pagó el 5y6 Valencia · Retrospectos Valencia`} · Datos INH
          </p>
        </>
      )}
      <RevistaClient meetingId={meetingId} />
    </>
  );
}
