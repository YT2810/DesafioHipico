/**
 * GET /api/og/picks
 * Genera tarjeta de pronósticos estilo Gaceta Hípica venezolana:
 * - Bloque "NO VÁLIDAS" arriba
 * - Bloque "5 Y 6" abajo
 * - Dorsales como chips de colores por carrera
 * - 1080x1350 portrait — optimizado para WhatsApp/Instagram Stories/X
 *
 * Query params:
 *   id  — handicapper profile ID (busca datos server-side)
 */

import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Colores de dorsal por posición (igual que los chips de colores de Gulfstream/Gaceta)
const DORSAL_COLORS = [
  '#e53e3e', // 1 — rojo
  '#3182ce', // 2 — azul
  '#38a169', // 3 — verde
  '#d69e2e', // 4 — amarillo/naranja
  '#805ad5', // 5 — morado
  '#dd6b20', // 6 — naranja
  '#319795', // 7 — teal
  '#e53e3e', // 8 — rosa/rojo (varía)
  '#2b6cb0', // 9 — azul oscuro
  '#276749', // 10 — verde oscuro
  '#744210', // 11 — marrón
  '#2c7a7b', // 12 — teal oscuro
];

function dorsalColor(n: number): string {
  return DORSAL_COLORS[(n - 1) % DORSAL_COLORS.length] ?? '#4a5568';
}

// Colores de etiqueta
const LABEL_COLORS: Record<string, string> = {
  'Línea':          '#60a5fa',
  'Casi Fijo':      '#facc15',
  'Súper Especial': '#c084fc',
  'Buen Dividendo': '#4ade80',
  'Batacazo':       '#f87171',
};
function labelColor(label: string): string {
  return LABEL_COLORS[label] ?? '#9ca3af';
}

interface MarkItem {
  dorsalNumber?: number;
  horseName: string;
  label: string;
  preferenceOrder: number;
}

interface RaceItem {
  raceNumber: number;
  isVip: boolean;
  marks: MarkItem[];
}

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return new Response('Missing id', { status: 400 });

  const res = await fetch(`${origin}/api/handicapper/${id}/public`, { cache: 'no-store' });
  if (!res.ok) return new Response('Not found', { status: 404 });

  const data = await res.json() as {
    profile: { pseudonym: string; isGhost: boolean; stats: Record<string, number> };
    meeting: { meetingNumber: number; date: string; trackName: string; raceCount?: number } | null;
    races: RaceItem[];
  };

  const { profile, meeting, races } = data;

  // Solo carreras públicas con marcas
  const publicRaces = races
    .filter(r => !r.isVip && r.marks.length > 0)
    .sort((a, b) => a.raceNumber - b.raceNumber);

  // Calcular corte válidas: las últimas 6 siempre son válidas (5 y 6)
  const totalRaces = meeting?.raceCount ?? (publicRaces.length > 0
    ? Math.max(...publicRaces.map(r => r.raceNumber))
    : 12);
  const validasStart = Math.max(1, totalRaces - 5); // C(totalRaces-5) a C(totalRaces) = 6 válidas

  const noValidas = publicRaces.filter(r => r.raceNumber < validasStart);
  const validas   = publicRaces.filter(r => r.raceNumber >= validasStart);

  // Fecha formateada
  const dateStr = meeting
    ? new Date(meeting.date).toLocaleDateString('es-VE', {
        day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'UTC',
      })
    : '';
  const trackName = meeting?.trackName ?? 'Hipódromo';
  const meetingNum = meeting?.meetingNumber ?? '';

  // Numeración relativa dentro del bloque (1, 2, 3...)
  function RaceRow({ race, index }: { race: RaceItem; index: number }) {
    const sortedMarks = [...race.marks].sort((a, b) => a.preferenceOrder - b.preferenceOrder);
    // Prioridad: mostrar label especial si hay fijo/batacazo
    const specialMark = sortedMarks.find(m => m.label === 'Batacazo' || m.label === 'Súper Especial');

    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '10px 0',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Número relativo */}
        <span style={{
          fontSize: '22px', fontWeight: 900,
          color: 'rgba(255,255,255,0.35)',
          width: '32px', textAlign: 'right', flexShrink: 0,
        }}>
          {index + 1}
        </span>

        {/* Chips de dorsales */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', flex: 1 }}>
          {sortedMarks.map((m, mi) => {
            const isSpecial = m.label === 'Batacazo' || m.label === 'Súper Especial' || m.label === 'Casi Fijo';
            const bgColor = m.dorsalNumber != null
              ? dorsalColor(m.dorsalNumber)
              : labelColor(m.label);
            return (
              <div key={mi} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                minWidth: '46px', height: '46px',
                backgroundColor: bgColor,
                borderRadius: '10px',
                border: isSpecial ? '2px solid rgba(255,255,255,0.6)' : '2px solid transparent',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: '20px', fontWeight: 900, color: '#fff' }}>
                  {m.dorsalNumber != null ? m.dorsalNumber : m.horseName.slice(0, 2).toUpperCase()}
                </span>
              </div>
            );
          })}
          {/* Etiqueta especial si aplica */}
          {specialMark && (
            <div style={{
              display: 'flex', alignItems: 'center',
              backgroundColor: `${labelColor(specialMark.label)}22`,
              border: `1px solid ${labelColor(specialMark.label)}60`,
              borderRadius: '8px',
              padding: '4px 10px',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: labelColor(specialMark.label) }}>
                {specialMark.label === 'Batacazo' ? '🔥' : specialMark.label === 'Súper Especial' ? '⭐' : '🎯'}{' '}{specialMark.label}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  function SectionHeader({ label, color }: { label: string; color: string }) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '12px 0 4px',
      }}>
        <div style={{ height: '3px', width: '28px', backgroundColor: color, borderRadius: '2px', display: 'flex' }} />
        <span style={{ fontSize: '18px', fontWeight: 900, color, letterSpacing: '2px', textTransform: 'uppercase' }}>
          {label}
        </span>
        <div style={{ flex: 1, height: '1px', backgroundColor: `${color}30`, display: 'flex' }} />
      </div>
    );
  }

  return new ImageResponse(
    (
      <div style={{
        width: '1080px', height: '1350px',
        display: 'flex', flexDirection: 'column',
        backgroundColor: '#0a0a12',
        fontFamily: 'sans-serif',
      }}>
        {/* Top accent bar */}
        <div style={{ height: '8px', backgroundColor: '#D4AF37', display: 'flex' }} />

        {/* Header: logo + handicapper + fecha */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '20px',
          padding: '28px 48px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          {/* DH mark */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '68px', height: '68px',
            border: '3px solid #D4AF37',
            borderRadius: '16px',
            backgroundColor: 'rgba(212,175,55,0.1)',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: '26px', fontWeight: 900, color: '#D4AF37' }}>DH</span>
          </div>

          {/* Name + subtitle */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
            <span style={{
              fontSize: '42px', fontWeight: 900, color: '#ffffff',
              letterSpacing: '-0.5px', lineHeight: 1.1,
            }}>
              {profile.pseudonym}
            </span>
            <span style={{ fontSize: '17px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
              {trackName}{meetingNum ? `  ·  Reunión ${meetingNum}` : ''}{dateStr ? `  ·  ${dateStr}` : ''}
            </span>
          </div>
        </div>

        {/* Body: NO VÁLIDAS + 5 Y 6 */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '16px 48px 12px' }}>

          {/* ── NO VÁLIDAS ── */}
          {noValidas.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '8px' }}>
              <SectionHeader label="No Válidas" color="#ff8080" />
              {noValidas.map((race, i) => (
                <RaceRow key={race.raceNumber} race={race} index={i} />
              ))}
            </div>
          )}

          {/* ── 5 Y 6 ── */}
          {validas.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: noValidas.length > 0 ? '12px' : '0' }}>
              <SectionHeader label="🌴 5 y 6" color="#D4AF37" />
              {validas.map((race, i) => (
                <RaceRow key={race.raceNumber} race={race} index={i} />
              ))}
            </div>
          )}

          {publicRaces.length === 0 && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '20px', color: 'rgba(255,255,255,0.2)' }}>Sin pronósticos públicos para hoy</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 48px 18px',
          borderTop: '1px solid rgba(255,255,255,0.07)',
        }}>
          <span style={{ fontSize: '20px', fontWeight: 900, color: '#D4AF37', letterSpacing: '0.5px' }}>
            desafiohipico.com
          </span>
          <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.25)' }}>
            Consulta todos los expertos →
          </span>
        </div>

        {/* Bottom accent bar */}
        <div style={{ height: '6px', backgroundColor: '#D4AF37', display: 'flex' }} />
      </div>
    ),
    { width: 1080, height: 1350 }
  );
}
