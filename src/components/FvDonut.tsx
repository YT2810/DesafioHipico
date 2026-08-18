export interface FvRow {
  position: number; total: number; wins: number; pct: number;
}

export interface FvAccuracy {
  trackId: string; trackName: string; totalRaces: number;
  batacazos: number; batacazoPct: number; byPosition: FvRow[];
}

interface Slice { label: string; value: number; color: string; }
const GOLD = '#D4AF37';

function buildSlices(data: FvAccuracy): Slice[] {
  if (!data.totalRaces) return [];
  const p = data.byPosition;
  return [
    { label: '1º FV', value: p[0]?.wins ?? 0, color: GOLD },
    { label: '2º FV', value: p[1]?.wins ?? 0, color: '#FBBF24' },
    { label: '3º FV', value: p[2]?.wins ?? 0, color: '#9CA3AF' },
    { label: '4º FV', value: p[3]?.wins ?? 0, color: '#6B7280' },
    { label: '5º FV', value: p[4]?.wins ?? 0, color: '#4B5563' },
    { label: 'Batacazo', value: data.batacazos, color: '#EF4444' },
  ].filter(s => s.value > 0);
}

export default function FvDonut({ data, size = 140 }: { data: FvAccuracy; size?: number }) {
  const slices = buildSlices(data);
  const total = data.totalRaces;
  const wins1 = data.byPosition[0]?.wins ?? 0;
  const wins2 = data.byPosition[1]?.wins ?? 0;
  const wins3 = data.byPosition[2]?.wins ?? 0;
  const pctTop3 = total > 0 ? ((wins1 + wins2 + wins3) / total) * 100 : 0;
  const pct1 = total > 0 ? (wins1 / total) * 100 : 0;
  if (slices.length === 0) return null;

  let acc = 0;
  const stops = slices.map(s => {
    const start = acc;
    const end = acc + s.value / total;
    acc = end;
    return `${s.color} ${(start * 100).toFixed(2)}% ${(end * 100).toFixed(2)}%`;
  }).join(',');

  const style = { width: size, height: size, borderRadius: '50%', background: `conic-gradient(${stops})` } as React.CSSProperties;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={style}>
        <div className="absolute inset-0 m-auto rounded-full bg-gray-950 flex flex-col items-center justify-center" style={{ width: '58%', height: '58%' }}>
          <span className="text-2xl font-extrabold" style={{ color: GOLD }}>{pctTop3.toFixed(1)}%</span>
          <span className="text-[10px] text-gray-500">Top 3</span>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {slices.map(s => (
          <div key={s.label} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-[10px] text-gray-400">{s.label} {s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
