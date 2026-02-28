import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get('title') ?? 'Pronósticos hípicos Venezuela';
  const subtitle = searchParams.get('subtitle') ?? 'Expertos · La Rinconada · Valencia';
  const type = searchParams.get('type') ?? 'default'; // 'default' | 'retirados' | 'pronosticos'

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0d0d14',
          position: 'relative',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Red top accent bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '8px', backgroundColor: '#CC2626', display: 'flex' }} />

        {/* Blue bottom accent bar */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', backgroundColor: '#4169E1', display: 'flex' }} />

        {/* Background subtle texture — diagonal lines */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'repeating-linear-gradient(135deg, rgba(204,38,38,0.03) 0px, rgba(204,38,38,0.03) 1px, transparent 1px, transparent 60px)',
          display: 'flex',
        }} />

        {/* Hexagon logo mark */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '96px',
          height: '96px',
          border: '4px solid #4169E1',
          borderRadius: '16px',
          backgroundColor: 'rgba(65,105,225,0.1)',
          marginBottom: '28px',
        }}>
          <span style={{ fontSize: '40px', fontWeight: 900, color: '#DCFF00', letterSpacing: '-2px' }}>DH</span>
        </div>

        {/* Main title */}
        <div style={{
          fontSize: type === 'default' ? '64px' : '52px',
          fontWeight: 900,
          color: '#DCFF00',
          letterSpacing: '-2px',
          textAlign: 'center',
          lineHeight: 1.1,
          marginBottom: '16px',
          maxWidth: '900px',
        }}>
          {title}
        </div>

        {/* Divider line */}
        <div style={{ width: '120px', height: '3px', backgroundColor: '#4169E1', marginBottom: '20px', display: 'flex' }} />

        {/* Subtitle */}
        <div style={{
          fontSize: '28px',
          fontWeight: 600,
          color: 'rgba(255,255,255,0.65)',
          textAlign: 'center',
          maxWidth: '800px',
          lineHeight: 1.4,
        }}>
          {subtitle}
        </div>

        {/* Bottom domain tag */}
        <div style={{
          position: 'absolute',
          bottom: '28px',
          right: '40px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <div style={{
            fontSize: '20px',
            fontWeight: 700,
            color: 'rgba(255,255,255,0.35)',
            letterSpacing: '0.5px',
          }}>
            desafiohipico.com
          </div>
        </div>

        {/* Type badge — top right */}
        {type !== 'default' && (
          <div style={{
            position: 'absolute',
            top: '28px',
            right: '40px',
            backgroundColor: type === 'retirados' ? 'rgba(204,38,38,0.2)' : 'rgba(65,105,225,0.2)',
            border: `1px solid ${type === 'retirados' ? '#CC2626' : '#4169E1'}`,
            borderRadius: '8px',
            padding: '6px 14px',
            fontSize: '18px',
            fontWeight: 700,
            color: type === 'retirados' ? '#ff6b6b' : '#7090ff',
            display: 'flex',
          }}>
            {type === 'retirados' ? '🚫 Retirados' : '🏇 Pronósticos'}
          </div>
        )}
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
