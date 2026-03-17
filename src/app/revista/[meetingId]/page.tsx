import type { Metadata } from 'next';
import RevistaClient from './RevistaClient';

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
  const dateStr = new Date(m.date).toLocaleDateString('es-VE', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  const title = `Revista ${m.trackName} · Reunión ${m.meetingNumber} — ${dateStr}`;
  const description = `Programa, inscritos${data.hasWorkouts ? ', trabajos de entrenamiento' : ''} y resultados de la Reunión ${m.meetingNumber} del ${m.trackName}. ${dateStr}.`;

  return {
    title,
    description,
    openGraph: { title, description, locale: 'es_VE', type: 'website' },
    alternates: { canonical: `${base}/revista/${meetingId}` },
  };
}

export default async function RevistaPage({ params }: Props) {
  const { meetingId } = await params;
  return <RevistaClient meetingId={meetingId} />;
}
