/**
 * GET /api/og/handicapper
 * Generates a shareable handicapper daily card (1080x1350 — portrait, optimized for WhatsApp/stories).
 *
 * Query params:
 *   id  — handicapper profile ID (fetches data server-side, no URL bloat)
 */

import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

const LABEL_COLORS: Record<string, string> = {
  'Línea':          '#60a5fa',
  'Casi Fijo':      '#facc15',
  'Súper Especial': '#c084fc',
  'Buen Dividendo': '#4ade80',
  'Batacazo':       '#f87171',
};
function lc(label: string) { return LABEL_COLORS[label] ?? '#9ca3af'; }

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return new Response('Missing id', { status: 400 });

  // Fetch data from our own public API
  const base = origin;
  const res = await fetch(`${base}/api/handicapper/${id}/public`, { cache: 'no-store' });
  if (!res.ok) return new Response('Not found', { status: 404 });
  const data = await res.json();

  const { profile, meeting, races } = data as {
    profile: { pseudonym: string; isGhost: boolean; stats: Record<string, number> };
    meeting: { meetingNumber: number; date: string; trackName: string } | null;
    races: { raceNumber: number; isVip: boolean; marks: { dorsalNumber?: number; horseName: string; label: string }[] }[];
  };

  const publicRaces = races.filter(r => !r.isVip && r.marks.length > 0);
  const dateStr = meeting
    ? new Date(meeting.date).toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' })
    : '';
  const subtitle = meeting ? `${meeting.trackName} · Reunión ${meeting.meetingNumber}` : '';

  return new ImageResponse(
    (
      <div style={{ width: '1080px', height: '1350px', display: 'flex', flexDirection: 'column', backgroundColor: '#0d0d14', fontFamily: 'sans-serif' }}>
        {/* Top red bar */}
        <div style={{ height: '10px', backgroundColor: '#CC2626', display: 'flex' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', padding: '40px 52px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', border: '3px solid #4169E1', borderRadius: '18px', backgroundColor: 'rgba(65,105,225,0.1)', flexShrink: 0 }}>
            <span style={{ fontSize: '34px', fontWeight: 900, color: '#DCFF00' }}>DH</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <span style={{ fontSize: '38px', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.5px' }}>{profile.pseudonym}</span>
            <span style={{ fontSize: '18px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
              {profile.isGhost ? '🤖 Procesado con IA' : '✅ Handicapper'}{subtitle ? `  ·  ${subtitle}` : ''}
            </span>
          </div>
        </div>

        {/* Date strip */}
        {dateStr && (
          <div style={{ backgroundColor: 'rgba(204,38,38,0.12)', border: '1px solid rgba(204,38,38,0.25)', margin: '0 52px', borderRadius: '12px', padding: '10px 20px', display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '18px', color: '#ff8080', fontWeight: 600 }}>📅 {dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}</span>
          </div>
        )}

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '16px', padding: '20px 52px 8px' }}>
          {[
            { label: 'Pronósticos', value: String(profile.stats?.totalForecasts ?? 0) },
            { label: 'Acierto 1°', value: `${(profile.stats?.pct1st ?? 0).toFixed(0)}%` },
            { label: 'Acierto Gral', value: `${(profile.stats?.pctGeneral ?? 0).toFixed(0)}%` },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '14px 8px' }}>
              <span style={{ fontSize: '28px', fontWeight: 900, color: '#DCFF00' }}>{s.value}</span>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginTop: '4px' }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Blue divider */}
        <div style={{ height: '2px', backgroundColor: '#4169E1', margin: '16px 52px 12px', display: 'flex' }} />

        {/* Races */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '0 52px', flex: 1, overflow: 'hidden' }}>
          {publicRaces.slice(0, 6).map((race, ri) => (
            <div key={ri} style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '14px 18px', gap: '8px' }}>
              {/* Race header */}
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                Carrera {race.raceNumber}
              </span>
              {/* Marks inline */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {race.marks.slice(0, 4).map((m, mi) => (
                  <div key={mi} style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(255,255,255,0.05)', border: `1px solid ${lc(m.label)}30`, borderRadius: '10px', padding: '6px 12px' }}>
                    {m.dorsalNumber != null && (
                      <span style={{ fontSize: '15px', fontWeight: 900, color: '#fff', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '6px', padding: '2px 7px' }}>{m.dorsalNumber}</span>
                    )}
                    <span style={{ fontSize: '15px', fontWeight: 700, color: lc(m.label) }}>{m.label}</span>
                    <span style={{ fontSize: '15px', color: 'rgba(255,255,255,0.8)' }}>{m.horseName}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {publicRaces.length === 0 && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '20px', color: 'rgba(255,255,255,0.2)' }}>Sin pronósticos públicos para hoy</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 52px 24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ fontSize: '20px', fontWeight: 700, color: '#DCFF00' }}>desafiohipico.com</span>
          <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.2)' }}>Más pronósticos de expertos →</span>
        </div>

        {/* Bottom blue bar */}
        <div style={{ height: '6px', backgroundColor: '#4169E1', display: 'flex' }} />
      </div>
    ),
    { width: 1080, height: 1350 }
  );
}
