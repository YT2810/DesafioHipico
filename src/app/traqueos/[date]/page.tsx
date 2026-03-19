import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import connectMongo from '@/lib/mongodb';
import WorkoutEntry from '@/models/WorkoutEntry';
import Track from '@/models/Track';
import TraqueosDateClient from './TraqueosDateClient';

const BASE = 'https://www.desafiohipico.com';

const MONTHS_ES = [
  'enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre'
];
const DAYS_ES = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];

function parseDate(dateStr: string): Date | null {
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(`${dateStr}T12:00:00Z`);
}

function sessionType(sourceFile: string): string {
  const f = sourceFile.toUpperCase();
  if (f.includes('AJUSTE')) return 'Ajustes';
  if (f.includes('TRABAJO')) return 'Trabajos';
  return 'Traqueos';
}

function buildTitle(date: Date, sourceFile: string): string {
  const type = sessionType(sourceFile);
  const day = DAYS_ES[date.getUTCDay()];
  const d = date.getUTCDate();
  const mon = MONTHS_ES[date.getUTCMonth()];
  const y = date.getUTCFullYear();
  return `${type} La Rinconada ${day.charAt(0).toUpperCase() + day.slice(1)} ${d} de ${mon} ${y}`;
}

export async function generateMetadata(
  { params }: { params: Promise<{ date: string }> }
): Promise<Metadata> {
  const { date } = await params;
  const parsed = parseDate(date);
  if (!parsed) return { title: 'Traqueos La Rinconada' };

  await connectMongo();
  const track = await Track.findOne({ name: /rinconada/i }).lean() as any;
  const entry = track ? await WorkoutEntry.findOne({
    trackId: track._id,
    workoutDate: { $gte: new Date(`${date}T00:00:00Z`), $lte: new Date(`${date}T23:59:59Z`) },
  }).lean() as any : null;

  const sourceFile = entry?.sourceFile ?? '';
  const title = buildTitle(parsed, sourceFile);
  const type = sessionType(sourceFile);
  const day = DAYS_ES[parsed.getUTCDay()];
  const d = parsed.getUTCDate();
  const mon = MONTHS_ES[parsed.getUTCMonth()];
  const y = parsed.getUTCFullYear();

  const description = `${type} y parciales oficiales de La Rinconada del ${day} ${d} de ${mon} de ${y}. Datos de la División de Toma Tiempos del INH. Tiempos, remates y comentarios de cada ejemplar.`;

  return {
    title,
    description,
    keywords: [
      `${type.toLowerCase()} la rinconada ${d} de ${mon}`,
      `traqueos la rinconada ${mon} ${y}`,
      `trabajos la rinconada ${day}`,
      'traqueos oficiales INH',
      'parciales caballos La Rinconada',
      'toma tiempos INH Venezuela',
    ],
    alternates: { canonical: `${BASE}/traqueos/${date}` },
    openGraph: {
      title: `${title} · Desafío Hípico`,
      description,
      url: `${BASE}/traqueos/${date}`,
      siteName: 'Desafío Hípico',
      locale: 'es_VE',
      type: 'article',
      images: [{ url: `${BASE}/api/og`, width: 1200, height: 630 }],
    },
  };
}

export default async function TraqueosDatePage(
  { params }: { params: Promise<{ date: string }> }
) {
  const { date } = await params;
  if (!parseDate(date)) notFound();
  return <TraqueosDateClient date={date} />;
}
