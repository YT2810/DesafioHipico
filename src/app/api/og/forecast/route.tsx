/**
 * GET /api/og/forecast
 * Generates a shareable forecast card image (1080x1080 square — optimized for WhatsApp/Instagram).
 *
 * Query params:
 *   handicapper  — handicapper pseudonym
 *   badge        — 🤖 | ✅ | 📋 (url-encoded emoji or text)
 *   track        — trackName (e.g. "La Rinconada")
 *   meeting      — meeting number
 *   race         — race number
 *   marks        — JSON array: [{dorsal,name,label}]
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

function labelColor(label: string): string {
  return LABEL_COLORS[label] ?? '#9ca3af';
}

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;

  const handicapper = sp.get('handicapper') ?? 'Handicapper';
  const badge       = sp.get('badge') ?? '';
  const track       = sp.get('track') ?? 'La Rinconada';
  const meeting     = sp.get('meeting') ?? '';
  const race        = sp.get('race') ?? '';
  const marksRaw    = sp.get('marks') ?? '[]';

  let marks: { dorsal?: number; name: string; label: string }[] = [];
  try { marks = JSON.parse(marksRaw); } catch { marks = []; }
  marks = marks.slice(0, 5);

  const subtitle = [
    track,
    meeting ? `Reunión ${meeting}` : '',
    race    ? `Carrera ${race}`    : '',
  ].filter(Boolean).join(' · ');

  return new ImageResponse(
    (
      <div
        style={{
          width: '1080px', height: '1080px',
          display: 'flex', flexDirection: 'column',
          backgroundColor: '#0d0d14',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Top red bar */}
        <div style={{ height: '10px', backgroundColor: '#CC2626', display: 'flex' }} />

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '18px',
          padding: '36px 48px 28px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          {/* DH mark */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '64px', height: '64px',
            border: '3px solid #4169E1',
            borderRadius: '14px',
            backgroundColor: 'rgba(65,105,225,0.1)',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: '28px', fontWeight: 900, color: '#DCFF00' }}>DH</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', letterSpacing: '2px', textTransform: 'uppercase' }}>Pronóstico</span>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>{subtitle}</span>
          </div>
          <span style={{ fontSize: '32px', color: 'rgba(255,255,255,0.15)', fontWeight: 900 }}>🏇</span>
        </div>

        {/* Handicapper name */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '16px',
          padding: '32px 48px 24px',
        }}>
          {/* Avatar circle */}
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            backgroundColor: 'rgba(212,175,55,0.15)',
            border: '2px solid rgba(212,175,55,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: '30px', fontWeight: 900, color: '#D4AF37' }}>
              {handicapper[0]?.toUpperCase() ?? 'H'}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '36px', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.5px' }}>
              {handicapper}
            </span>
            {badge && (
              <span style={{ fontSize: '18px', color: 'rgba(255,255,255,0.45)', marginTop: '4px' }}>
                {badge === '✅' ? '✅ Pronóstico directo' : badge === '🤖' ? '🤖 Procesado con IA' : '📋 Publicado por staff'}
              </span>
            )}
          </div>
        </div>

        {/* Blue divider */}
        <div style={{ height: '2px', backgroundColor: '#4169E1', margin: '0 48px', display: 'flex' }} />

        {/* Marks */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '16px',
          padding: '28px 48px',
          flex: 1,
        }}>
          {marks.map((m, i) => (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'center', gap: '16px',
                backgroundColor: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '16px',
                padding: '18px 24px',
              }}
            >
              {/* Preference number */}
              <span style={{ fontSize: '16px', fontWeight: 700, color: 'rgba(255,255,255,0.25)', width: '20px', textAlign: 'center' }}>
                {i + 1}
              </span>
              {/* Dorsal */}
              {m.dorsal != null && (
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <span style={{ fontSize: '18px', fontWeight: 900, color: '#fff' }}>{m.dorsal}</span>
                </div>
              )}
              {/* Label badge */}
              <span style={{
                fontSize: '14px', fontWeight: 700,
                color: labelColor(m.label),
                backgroundColor: `${labelColor(m.label)}18`,
                border: `1px solid ${labelColor(m.label)}40`,
                borderRadius: '8px',
                padding: '4px 10px',
                flexShrink: 0,
              }}>
                {m.label}
              </span>
              {/* Horse name */}
              <span style={{
                fontSize: '24px', fontWeight: 700, color: '#ffffff',
                flex: 1, overflow: 'hidden',
              }}>
                {m.name}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 48px 28px',
          borderTop: '1px solid rgba(255,255,255,0.07)',
        }}>
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#DCFF00' }}>
            desafiohipico.com
          </span>
          <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.25)' }}>
            Consulta todos los expertos →
          </span>
        </div>

        {/* Bottom blue bar */}
        <div style={{ height: '6px', backgroundColor: '#4169E1', display: 'flex' }} />
      </div>
    ),
    { width: 1080, height: 1080 }
  );
}
