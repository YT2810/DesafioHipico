import type { Metadata } from 'next';
import RetiradosClient from './RetiradosClient';

interface Props {
  searchParams: Promise<{ reunion?: string }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { reunion } = await searchParams;

  if (!reunion) {
    return {
      title: 'Retirados del día | Desafío Hípico',
      description: 'Consulta los ejemplares retirados de las carreras hípicas en Venezuela. Información actualizada de retirados por reunión, carrera e hipódromo.',
      keywords: ['retirados hipismo Venezuela', 'ejemplares retirados carreras', 'retirados La Rinconada', 'retirados hipódromo Valencia', 'carreras hípicas Venezuela'],
      openGraph: {
        title: 'Retirados del día — Desafío Hípico',
        description: 'Consulta los ejemplares retirados de cada reunión hípica en Venezuela.',
        type: 'website',
        locale: 'es_VE',
      },
    };
  }

  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://desafiohipico.com';
    const res = await fetch(`${base}/api/retirados?meetingId=${reunion}`, { cache: 'no-store' });
    if (!res.ok) throw new Error();
    const data = await res.json();

    const dateStr = data.date
      ? new Date(data.date).toLocaleDateString('es-VE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      : '';
    const track = data.trackName ?? 'Hipódromo';
    const total = data.totalScratched ?? 0;
    const title = `Retirados Reunión ${data.meetingNumber} — ${track} ${dateStr}`;
    const description = total > 0
      ? `${total} ejemplar${total !== 1 ? 'es' : ''} retirado${total !== 1 ? 's' : ''} en la Reunión ${data.meetingNumber} del ${track}. ${dateStr}. Consulta qué caballos no corren hoy.`
      : `Sin retirados confirmados para la Reunión ${data.meetingNumber} del ${track}. ${dateStr}.`;

    return {
      title: `${title} | Desafío Hípico`,
      description,
      keywords: [
        `retirados ${track}`,
        `retirados reunión ${data.meetingNumber}`,
        `ejemplares retirados ${dateStr}`,
        'carreras hípicas Venezuela',
        'retirados hipismo',
        'La Rinconada retirados',
      ],
      openGraph: {
        title,
        description,
        type: 'website',
        locale: 'es_VE',
      },
      alternates: {
        canonical: `${base}/retirados?reunion=${reunion}`,
      },
    };
  } catch {
    return {
      title: 'Retirados | Desafío Hípico',
      description: 'Ejemplares retirados de las reuniones hípicas en Venezuela.',
    };
  }
}

export default async function RetiradosPage({ searchParams }: Props) {
  const { reunion } = await searchParams;
  return <RetiradosClient initialMeetingId={reunion ?? ''} />;
}
