import type { Metadata } from 'next';
import Link from 'next/link';
import connectMongo from '@/lib/mongodb';
import Meeting from '@/models/Meeting';
import '@/models/Track';

const BASE = 'https://www.desafiohipico.com';

const MONTHS_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DAYS_ES = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

export const metadata: Metadata = {
  title: 'Programa y Retrospectos · Próximas Reuniones Hípicas Venezuela',
  description: 'Consulta el programa de las próximas reuniones hípicas en La Rinconada y Valencia. Inscritos, historial, traqueos y datos para estudiar antes de apostar.',
  keywords: [
    'retrospectos la rinconada',
    'retrospectos la rinconada hoy',
    'retrospectos hípicos la rinconada',
    'retrospectos gaceta hípica',
    'retrospectos carreras americanas',
    'historial carreras la rinconada',
    'historial hípico venezuela',
    'revista hípica la rinconada por fecha',
    'datos hípicos la rinconada',
    'inh resultados por reunión',
    'la rinconada datos',
    'gaceta hípica digital venezuela',
  ],
  alternates: { canonical: `${BASE}/retrospectos` },
  openGraph: {
    title: 'Retrospectos La Rinconada · Desafío Hípico',
    description: 'Historial completo de reuniones hípicas en Venezuela. Inscritos, resultados, traqueos y datos del INH por fecha.',
    url: `${BASE}/retrospectos`,
    siteName: 'Desafío Hípico',
    locale: 'es_VE',
    type: 'website',
    images: [{ url: `${BASE}/api/og`, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Retrospectos La Rinconada · Historial de Reuniones',
    description: 'Historial de todas las reuniones hípicas venezolanas. Datos del INH.',
    images: [`${BASE}/api/og`],
  },
};

interface MeetingRow {
  id: string;
  meetingNumber: number;
  date: string;
  trackName: string;
  raceCount: number;
}

export default async function RetrospectosPage() {
  let upcoming: MeetingRow[] = [];
  let past: MeetingRow[] = [];

  try {
    await connectMongo();
    const now = new Date();
    const future = new Date(now);
    future.setDate(future.getDate() + 30);
    const pastFrom = new Date(now);
    pastFrom.setDate(pastFrom.getDate() - 45);

    const toRow = (m: any): MeetingRow => ({
      id: m._id.toString(),
      meetingNumber: m.meetingNumber,
      date: m.date,
      trackName: (m.trackId as any)?.name ?? 'La Rinconada',
      raceCount: m.races?.length ?? 0,
    });

    const [rawUpcoming, rawPast] = await Promise.all([
      Meeting.find({ date: { $gte: now, $lte: future } })
        .sort({ date: 1 })
        .limit(10)
        .populate('trackId', 'name')
        .lean() as Promise<any[]>,
      Meeting.find({ date: { $gte: pastFrom, $lt: now } })
        .sort({ date: -1 })
        .limit(30)
        .populate('trackId', 'name')
        .lean() as Promise<any[]>,
    ]);

    upcoming = rawUpcoming.map(toRow);
    past = rawPast.map(toRow);
  } catch { /* build time */ }

  // Group past by month
  const byMonth: Record<string, MeetingRow[]> = {};
  for (const m of past) {
    const dt = new Date(m.date);
    const key = `${MONTHS_ES[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(m);
  }

  const GOLD = '#D4AF37';

  const allForSchema = [...upcoming, ...past];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Programa y Retrospectos · Desafío Hípico',
    description: 'Próximas reuniones hípicas en Venezuela. Inscritos, historial, traqueos y datos para estudiar antes de apostar.',
    url: `${BASE}/retrospectos`,
    publisher: { '@type': 'Organization', name: 'Desafío Hípico', url: BASE },
    hasPart: allForSchema.slice(0, 20).map(m => ({
      '@type': 'SportsEvent',
      name: `Reunión Hípica ${m.meetingNumber} · ${m.trackName}`,
      startDate: m.date,
      url: `${BASE}/revista/${m.id}`,
    })),
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Desafío Hípico', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'Retrospectos', item: `${BASE}/retrospectos` },
    ],
  };

  const MeetingCard = ({ m, highlight = false }: { m: MeetingRow; highlight?: boolean }) => {
    const dt = new Date(m.date);
    const day = DAYS_ES[dt.getUTCDay()];
    const dd = dt.getUTCDate();
    const mon = MONTHS_ES[dt.getUTCMonth()];
    const isRinconada = m.trackName.toLowerCase().includes('rinconada');
    return (
      <Link
        href={`/revista/${m.id}`}
        className={`flex items-center gap-3 rounded-2xl px-4 py-3 transition-colors group border ${
          highlight
            ? 'bg-yellow-950/20 border-yellow-700/40 hover:border-yellow-600/60'
            : 'bg-gray-900 border-gray-800 hover:border-yellow-800/50'
        }`}
      >
        <div
          className="shrink-0 w-10 h-10 rounded-xl flex flex-col items-center justify-center font-bold text-xs text-black"
          style={{ backgroundColor: GOLD }}
        >
          <span className="text-base font-extrabold leading-none">{dd}</span>
          <span className="uppercase leading-none text-[9px]">{mon.slice(0, 3)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold truncate transition-colors ${highlight ? 'text-yellow-300 group-hover:text-yellow-200' : 'text-white group-hover:text-yellow-400'}`}>
            {isRinconada ? '🏇' : '🏟'} {m.trackName} · Reunión {m.meetingNumber}
          </p>
          <p className="text-xs text-gray-500">{day} {dd} de {mon} · {m.raceCount > 0 ? `${m.raceCount} carreras` : 'Ver programa'}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-xs font-bold px-2 py-1 rounded-lg border ${highlight ? 'text-yellow-400 border-yellow-700/60' : 'text-yellow-600 border-gray-700 group-hover:text-yellow-400'}`}>
            {highlight ? '📰 Estudiar →' : 'Ver →'}
          </span>
        </div>
      </Link>
    );
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      <div className="min-h-screen bg-gray-950 text-gray-100">

        {/* ── Header ── */}
        <div className="border-b border-gray-800 bg-gray-900">
          <div className="max-w-3xl mx-auto px-4 py-5">
            <Link href="/" className="text-[11px] text-gray-500 hover:text-yellow-500 transition-colors">
              ← Desafío Hípico
            </Link>
            <h1 className="text-2xl font-black text-white mt-1 leading-tight">
              Programa · Retrospectos
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Inscritos · Historial · Traqueos · La Rinconada y Valencia
            </p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-5 space-y-8">

          {/* ── PRÓXIMAS — lo que se va a correr (para estudiar) ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-yellow-500 uppercase tracking-widest">
                📅 Próximas reuniones
              </p>
              <span className="text-xs text-gray-600">Para estudiar</span>
            </div>
            {upcoming.length === 0 ? (
              <p className="text-sm text-gray-600 py-6 text-center">No hay reuniones programadas próximamente</p>
            ) : (
              upcoming.map(m => <MeetingCard key={m.id} m={m} highlight />)
            )}
          </div>

          {/* ── CTA traqueos ── */}
          <div className="rounded-2xl border border-gray-700 bg-gray-900 p-4 flex items-center gap-4">
            <div className="flex-1">
              <p className="text-sm font-bold text-white">⏱ Traqueos oficiales INH</p>
              <p className="text-xs text-gray-400 mt-0.5">Trabajos y parciales de los ejemplares que van a correr.</p>
            </div>
            <Link href="/traqueos"
              className="shrink-0 px-4 py-2 rounded-xl text-sm font-bold border border-yellow-700/60 text-yellow-400 hover:bg-yellow-950/40 transition-colors">
              Ver Traqueos
            </Link>
          </div>

          {/* ── HISTORIAL — reuniones pasadas ── */}
          {Object.keys(byMonth).length > 0 && (
            <div className="space-y-6">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-widest border-t border-gray-800 pt-4">
                🗂 Historial reciente
              </p>
              {Object.entries(byMonth).map(([monthLabel, rows]) => (
                <div key={monthLabel} className="space-y-2">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                    {monthLabel}
                  </p>
                  {rows.map(m => <MeetingCard key={m.id} m={m} />)}
                </div>
              ))}
            </div>
          )}

          {/* ── SEO footer ── */}
          <p className="text-[11px] text-gray-800 text-center leading-relaxed">
            Retrospectos hípicos Venezuela · Historial La Rinconada · Gaceta hípica digital · Datos INH por reunión · HINAVA · Hipismo venezolano
          </p>

        </div>
      </div>
    </>
  );
}
