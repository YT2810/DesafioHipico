'use client';

/**
 * GacetaPrintTemplate — Estilo Gaceta Hípica · Branding Desafío Hípico
 *
 * Invisible en pantalla (hidden), visible solo al imprimir (print:block).
 *
 * Arquitectura por caballo — 5 paneles verticales (flex):
 *   Panel 1 (~4%)  : N° gualdrapa — rojo/dorado, ★ si es pick del tipster
 *   Panel 2 (~22%) : Caballo (nombre, pedigree, color, stats, medicación)
 *   Panel 3 (~10%) : Yunta (jinete, kg, implementos, entrenador)
 *   Panel 3b (~5%) : PP del día (puesto de pista en la carrera actual)
 *   Panel 4 (~59%) : Retrospecto — micro-tabla + traqueos
 *
 * ColumnHeaderBar separado (fuera de los horse rows) → alineación perfecta.
 * Densidad: hasta 14 caballos por hoja A4.
 */

import React from 'react';

// ─── Brand colors ─────────────────────────────────────────────────────────────
const RED    = '#C0392B';
const YELLOW = '#FFE000';
const BLUE   = '#4169E1';
const CYAN   = '#00b4e4';
const BLACK  = '#000000';
const WHITE  = '#FFFFFF';
const LGRAY  = '#f5f5f5';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RaceHistoryItem {
  date: string;
  annualRaceNumber: string | number | null;
  trackCode: string;
  raceNumber: number;
  distance: number;
  dorsalNumber: number;
  weight: string;
  jockeyName: string;
  finishPosition: number | null;
  officialTime: string | null;
  winnerTime: string | null;
  diffVsFirst: string | null;
  distanceMargin: string | null;
  winnerName: string | null;
  secondName: string | null;
  isScratched: boolean;
  conditions?: string;
}

interface WorkoutItem {
  workoutDate: string;
  distance: number;
  workoutType: string;
  splits: string;
  comment: string;
  daysRest: number | null;
}

interface EntryItem {
  dorsalNumber: number;
  postPosition: number;
  horseName: string;
  nationality: string | null;
  color: string | null;
  sire: string | null;
  dam: string | null;
  gender: string | null;
  jockeyName: string;
  trainerName: string;
  studName: string;
  weightDeclared: string;
  medication: string | null;
  implements: string | null;
  status: string;
  finishPosition: number | null;
  isScratched: boolean;
  raceHistory: RaceHistoryItem[];
  workouts: WorkoutItem[];
  yearStats: { starts: number; wins: number; winless: number } | null;
}

interface RaceItem {
  raceId: string;
  raceNumber: number;
  annualRaceNumber: number | null;
  distance: number;
  scheduledTime: string;
  conditions: string;
  prizePool: { bs: number; usd: number };
  games: string[];
  status: string;
  entries: EntryItem[];
}

interface MeetingData {
  meetingNumber: number;
  date: string;
  trackName: string;
  trackCode: string;
  isValencia: boolean;
}

export interface TipsterPick {
  preferenceOrder: number;
  horseName: string;
  dorsalNumber: number | null;
  label: string | null;
}

export interface PicksForRace {
  marks: TipsterPick[];
  hasAiSource: boolean;
}

export interface GacetaPrintConfig {
  mode: 'public' | 'tipster' | 'premium';
  tipsterName: string;
  tipsterId?: string;
  brandName?: string;
  brandUrl?: string;
}

interface Props {
  meeting: MeetingData;
  races: RaceItem[];
  tipster: { id: string; name: string } | null;
  picksByRace: Record<string, PicksForRace>;
  config: GacetaPrintConfig;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getUTCDate()).padStart(2,'0')}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;
}
function fmtYear(iso: string): string {
  return String(new Date(iso).getUTCFullYear()).slice(2);
}
function raceCode(h: RaceHistoryItem): string {
  const n = h.annualRaceNumber ?? h.raceNumber;
  return `${h.trackCode}${String(n).replace(/^[a-zA-Z]+/,'')}`;
}
function posDisplay(h: RaceHistoryItem): string {
  if (h.isScratched) return 'R';
  if (!h.finishPosition) return '?';
  return `${h.finishPosition}°`;
}

/** Jinete: Apellido, Inicial. (sin truncar apellido) */
function jockeyFmt(name: string): string {
  if (!name) return '—';
  const p = name.trim().split(/\s+/);
  if (p.length === 1) return p[0];
  return `${p.slice(1).join(' ')}, ${p[0][0]}.`;
}

/** Entrenador: últimas 2 palabras */
function trainerFmt(name: string): string {
  if (!name) return '—';
  const p = name.trim().split(/\s+/);
  return p.slice(-2).join(' ');
}

/** Medicación abreviada: BUT→B, LAX→L, BUT-LAX→B-L */
function medAbbr(med: string | null): string | null {
  if (!med) return null;
  const m = med.toUpperCase().replace(/\s/g,'').replace(/-/g,'');
  const hasBut = m.includes('BUT') || m.includes('BUTA');
  const hasLax = m.includes('LAX') || m.includes('LAS') || m.includes('FURO');
  if (hasBut && hasLax) return 'B-L';
  if (hasBut) return 'B';
  if (hasLax) return 'L';
  return med.trim().slice(0,4);
}

/**
 * Series abbreviation — Venezuelan horse racing:
 * Clásicos/Copas/GP → nombre del clásico
 * Normales → tipo + edad + calificación (Ptr2a, Per3+, G1, etc.)
 */
function seriesAbbr(conditions: string): string {
  if (!conditions) return '';
  const raw = conditions.trim();

  // ── Named races ──────────────────────────────────────────────────────────
  const clsM = raw.match(/cl[aá]sico\s+(.+)/i);
  if (clsM) {
    const name = clsM[1].replace(/\s+/g,' ').trim().split(/\s+/).slice(0,4).join(' ');
    return name.slice(0, 20);
  }
  const copaM = raw.match(/copa\s+(.+)/i);
  if (copaM) return `Copa ${copaM[1].trim().split(/\s+/).slice(0,3).join(' ')}`.slice(0,18);

  const gpM = raw.match(/gran\s+premio\s+(.+)/i);
  if (gpM) return `GP ${gpM[1].trim().split(/\s+/).slice(0,3).join(' ')}`.slice(0,16);

  // ── Build code from parts ─────────────────────────────────────────────────
  const c = raw.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');

  const parts: string[] = [];

  // Animal type
  if (c.includes('POTR'))       parts.push('Ptr');
  else if (c.includes('YEGU'))  parts.push('Yeg');
  else if (c.includes('CABALLO') || c.includes('CABALL')) parts.push('Cab');

  // Age
  const ageYmas = c.match(/(\d)\s*AN[NO]S?\s+Y\s+MA/);      // "3 años y más"
  const ageDe   = c.match(/DE\s+(\d)\s*AN[NO]S?(?!\s+Y\s+M)/); // "de 3 años" (no "y más")
  if (ageYmas)    parts.push(`${ageYmas[1]}a+`);
  else if (ageDe) parts.push(`${ageDe[1]}a`);

  // Qualification — ganadoras
  const g12 = c.match(/GANAD\w+\s+DE\s+1\s+Y\s+2/);
  const gN  = c.match(/GANAD\w+\s+DE\s+([1-9])/);
  if (g12)         parts.push('G1y2');
  else if (gN)     parts.push(`G${gN[1]}`);

  // Perdedoras
  if (c.includes('PERDED')) {
    const pAge = c.match(/PERDED\w+\s+DE\s+(\d)/);
    if (pAge) {
      const plus = c.includes('Y MAS') || c.includes('Y MA');
      parts.push(`Per${pAge[1]}${plus ? '+' : ''}`);
    } else {
      parts.push('Per');
    }
  }

  // Debutantes / No ganadoras
  if (c.includes('DEBUT'))                         parts.push('Deb');
  if (c.includes('NO GANAD') && !gN && !g12)      parts.push('NoG');

  // Special categories
  if (c.includes('HANDICAP'))                      parts.push('Hcp');
  if (c.includes('RECLAM'))                        parts.push('Rcl');
  if (c.includes('ALLOWANCE') || c.includes('ALW')) parts.push('Alw');

  return parts.join(' ').slice(0, 20) || raw.slice(0, 14);
}

/** maxHistory dinámico según cantidad de caballos */
function maxHistRows(n: number): number {
  if (n >= 13) return 3;
  if (n >= 9)  return 4;
  return 5;
}

/** Slot publicitario en px según caballos en carrera */
function adHeight(n: number): number {
  if (n <= 4)  return 105;
  if (n <= 6)  return 72;
  if (n <= 9)  return 40;
  if (n <= 11) return 18;
  return 0;
}

// ─── DH Logo SVG ──────────────────────────────────────────────────────────────

function DHLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display:'block', flexShrink:0 }}>
      <polygon points="50,4 93,27 93,73 50,96 7,73 7,27" fill={RED} stroke={BLUE} strokeWidth="5"/>
      <text x="50" y="63" textAnchor="middle" fontFamily="Arial Narrow,Arial,sans-serif"
        fontWeight="900" fontSize="36" fill={YELLOW} letterSpacing="-1">DH</text>
    </svg>
  );
}

// ─── History column definitions ───────────────────────────────────────────────
//
// IMPORTANT: the Panel 4 padding in EntryBlock/ColumnHeaderBar MUST match
// (both use padding: '1px 0 1px 2px') so tables align across rows.

const COLS: { key: string; w: number; align: 'center'|'left'|'right' }[] = [
  { key:'Fec',          w:22,  align:'center' },
  { key:'Carr',         w:20,  align:'center' },
  { key:'Dist',         w:16,  align:'center' },
  { key:'PP',           w:13,  align:'center' }, // cyan tint — post position in hist race
  { key:'400m',         w:12,  align:'center' },
  { key:'800m',         w:12,  align:'center' },
  { key:'Lleg',         w:13,  align:'center' },
  { key:'Kg.Jin',       w:14,  align:'center' },
  { key:'Jinete',       w:35,  align:'left'   },
  { key:'Div',          w:13,  align:'center' },
  { key:'Ganador / 2°', w:68,  align:'left'   },
  { key:'Cpos',         w:18,  align:'center' },
  { key:'Serie',        w:32,  align:'left'   },
  { key:'Rat',          w:11,  align:'center' },
  { key:'T.G.',         w:22,  align:'center' },
  { key:'T.Ej.',        w:22,  align:'center' },
  { key:'Cont.',        w:0,   align:'left'   }, // flex remainder
];

// ─── Shared cell styles ───────────────────────────────────────────────────────

const DC: React.CSSProperties = {
  fontSize: 6.5,
  fontFamily: 'Arial Narrow, Arial, sans-serif',
  fontWeight: 600,
  color: BLACK,
  lineHeight: 1.1,
  padding: '0 1px',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  borderRight: '0.5px solid #bbb',
  verticalAlign: 'middle',
};
const HC: React.CSSProperties = {
  ...DC,
  fontWeight: 700,
  fontSize: 6,
  color: WHITE,
  background: BLACK,
  textTransform: 'uppercase',
  letterSpacing: '0.02em',
  padding: '1px',
  textAlign: 'center',
  printColorAdjust: 'exact',
  WebkitPrintColorAdjust: 'exact',
} as React.CSSProperties;

// Shared padding that MUST be identical in ColumnHeaderBar Panel4 and EntryBlock Panel4
const P4_PADDING = '1px 0 1px 2px';

// ─── Column header bar (ONE per race, outside horse rows) ─────────────────────

function ColumnHeaderBar() {
  return (
    <div style={{
      display:'flex', alignItems:'stretch',
      background: BLACK,
      printColorAdjust:'exact', WebkitPrintColorAdjust:'exact',
    } as React.CSSProperties}>
      {/* N° */}
      <div style={{ flexShrink:0, width:32, display:'flex', alignItems:'center',
        justifyContent:'center', borderRight:`1px solid #444` }}>
        <span style={{ fontSize:6, fontWeight:700, color:YELLOW }}>N°</span>
      </div>
      {/* Caballo */}
      <div style={{ flexShrink:0, width:'22%', borderRight:`1px solid #444`,
        padding:'1px 3px', display:'flex', alignItems:'center' }}>
        <span style={{ fontSize:6, fontWeight:700, color:WHITE, textTransform:'uppercase',
          letterSpacing:'0.05em' }}>Ejemplar / Stud</span>
      </div>
      {/* Yunta */}
      <div style={{ flexShrink:0, width:'10%', borderRight:`1px solid #444`,
        padding:'1px 2px', display:'flex', alignItems:'center' }}>
        <span style={{ fontSize:6, fontWeight:700, color:WHITE, textTransform:'uppercase',
          letterSpacing:'0.05em' }}>Yunta / Kg</span>
      </div>
      {/* PP del día */}
      <div style={{ flexShrink:0, width:'5%', borderRight:`1px solid #444`,
        padding:'1px 2px', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <span style={{ fontSize:6, fontWeight:700, color:CYAN }}>PP</span>
      </div>
      {/* Retrospecto columns */}
      <div style={{ flex:1, overflow:'hidden', padding: P4_PADDING }}>
        <table style={{ width:'100%', borderCollapse:'collapse', tableLayout:'fixed' }}>
          <thead>
            <tr>
              {COLS.map(c => (
                <th key={c.key} style={{
                  ...HC,
                  width: c.w > 0 ? c.w : undefined,
                  textAlign: c.align,
                }}>{c.key}</th>
              ))}
            </tr>
          </thead>
        </table>
      </div>
    </div>
  );
}

// ─── History data row ─────────────────────────────────────────────────────────

function HistoryRow({ h, isOdd }: { h: RaceHistoryItem; isOdd: boolean }) {
  const isWin = h.finishPosition === 1 && !h.isScratched;
  const isScr = h.isScratched;
  const bg    = isOdd ? LGRAY : WHITE;
  const cpos  = isWin ? '—' : (h.distanceMargin || h.diffVsFirst || '—');
  const ref   = isWin ? (h.secondName ?? '—') : (h.winnerName ?? '—');
  const serie = seriesAbbr(h.conditions ?? '');

  return (
    <tr style={{ background: bg }}>
      {/* Fec */}
      <td style={{ ...DC, textAlign:'center', color:'#222' }}>
        {fmtDate(h.date)}/{fmtYear(h.date)}
      </td>
      {/* Carr */}
      <td style={{ ...DC, textAlign:'center', fontFamily:'monospace', fontSize:6 }}>
        {raceCode(h)}
      </td>
      {/* Dist */}
      <td style={{ ...DC, textAlign:'center' }}>{h.distance}</td>
      {/* PP — cyan tint */}
      <td style={{
        ...DC, textAlign:'center', fontWeight:700,
        background:`${CYAN}40`,
        printColorAdjust:'exact', WebkitPrintColorAdjust:'exact',
      } as React.CSSProperties}>
        {isScr ? 'R' : (h.dorsalNumber || '—')}
      </td>
      {/* 400m */}
      <td style={{ ...DC, textAlign:'center', color:'#777' }}>—</td>
      {/* 800m */}
      <td style={{ ...DC, textAlign:'center', color:'#777' }}>—</td>
      {/* Lleg */}
      <td style={{
        ...DC, textAlign:'center',
        fontWeight: isWin ? 900 : 700,
        color: isWin ? '#6a4500' : (isScr ? '#999' : BLACK),
        textDecoration: isScr ? 'line-through' : 'none',
      }}>
        {posDisplay(h)}
      </td>
      {/* Kg.Jin — h.weight from snapshot */}
      <td style={{ ...DC, textAlign:'center' }}>
        {h.weight || '—'}
      </td>
      {/* Jinete */}
      <td style={{ ...DC, textAlign:'left', color:'#111' }}>
        {h.jockeyName ? jockeyFmt(h.jockeyName) : '—'}
      </td>
      {/* Div */}
      <td style={{ ...DC, textAlign:'center', color:'#777' }}>—</td>
      {/* Ganador / 2° */}
      <td style={{
        ...DC, textAlign:'left',
        fontWeight: isWin ? 700 : 600,
        color: isWin ? '#6a4500' : BLACK,
        overflow:'hidden',
      }}>
        {isWin
          ? <><span style={{ fontSize:5.5, color:'#888' }}>2°: </span>{ref.slice(0,22)}</>
          : ref.slice(0,22)
        }
      </td>
      {/* Cpos */}
      <td style={{ ...DC, textAlign:'center' }}>{cpos}</td>
      {/* Serie */}
      <td style={{ ...DC, textAlign:'left', fontSize:5.5, color:'#333' }}>{serie}</td>
      {/* Rat */}
      <td style={{ ...DC, textAlign:'center', color:'#777' }}>—</td>
      {/* T.G. */}
      <td style={{ ...DC, textAlign:'center', fontFamily:'monospace', fontSize:6,
        color: isWin ? '#6a4500' : '#222' }}>
        {h.winnerTime ?? '—'}
      </td>
      {/* T.Ej. */}
      <td style={{ ...DC, textAlign:'center', fontFamily:'monospace', fontSize:6,
        fontWeight: isWin ? 900 : 700,
        color: isWin ? '#6a4500' : BLACK }}>
        {isWin ? (h.winnerTime ?? '—') : (h.officialTime ?? '—')}
      </td>
      {/* Cont. */}
      <td style={{ ...DC, color:'#555', fontSize:5.5 }}></td>
    </tr>
  );
}

// ─── Panel 4: Retrospecto + Traqueos ─────────────────────────────────────────

function Panel4({ entry, maxH }: { entry: EntryItem; maxH: number }) {
  const rows = entry.raceHistory.slice(0, maxH);

  const workoutLine = entry.workouts.length > 0
    ? entry.workouts.slice(0, 5).map(w => {
        const t = ({ EP:'EP', ES:'ES', AP:'AP', galopo:'Gal', trote:'Trot' } as Record<string,string>)[w.workoutType] ?? w.workoutType ?? '';
        return `${fmtDate(w.workoutDate)} ${t} ${w.distance}m ${w.splits}${w.comment ? ` (${w.comment})` : ''}${w.daysRest ? ` ${w.daysRest}d` : ''}`;
      }).join(' · ')
    : null;

  return (
    // NOTE: padding MUST match P4_PADDING in ColumnHeaderBar for column alignment
    <div style={{ flex:1, minWidth:0, padding: P4_PADDING, display:'flex', flexDirection:'column' }}>
      {rows.length === 0 ? (
        <span style={{ fontSize:6.5, color:'#888', fontStyle:'italic', padding:'1px 2px' }}>
          Sin historial
        </span>
      ) : (
        <table style={{ width:'100%', borderCollapse:'collapse', tableLayout:'fixed' }}>
          <tbody>
            {rows.map((h, i) => <HistoryRow key={i} h={h} isOdd={i % 2 === 0} />)}
          </tbody>
        </table>
      )}
      {workoutLine && (
        <div style={{
          fontSize:6, fontStyle:'italic', fontWeight:600, color:'#222',
          lineHeight:1.15, borderTop:'0.5px dashed #ccc',
          padding:'0.5px 0 0 2px', marginTop:1,
        }}>
          <span style={{ fontWeight:700, fontStyle:'normal', color:BLUE, marginRight:3 }}>Traq:</span>
          {workoutLine}
        </div>
      )}
    </div>
  );
}

// ─── Full entry block ─────────────────────────────────────────────────────────

function EntryBlock({ entry, maxH, isPick, pickOrder }: {
  entry: EntryItem;
  maxH: number;
  isPick: boolean;
  pickOrder?: number;
}) {
  const scratched = entry.isScratched;
  const pedigree  = [entry.sire, entry.dam].filter(Boolean).join(' x ');
  const med       = medAbbr(entry.medication);

  // Nationality parenthesised at same size as name
  const natStr = entry.nationality && entry.nationality !== 'VEN'
    ? ` (${entry.nationality})`
    : '';

  return (
    <div style={{
      borderTop:'0.5px solid #aaa',
      breakInside:'avoid', pageBreakInside:'avoid',
      opacity: scratched ? 0.6 : 1,
    }}>
      <div style={{ display:'flex', alignItems:'stretch', minHeight:26 }}>

        {/* ── PANEL 1: N° gualdrapa ── */}
        <div style={{
          flexShrink:0, width:32,
          display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'center',
          borderRight:`2px solid ${BLACK}`,
          background: RED,
          printColorAdjust:'exact', WebkitPrintColorAdjust:'exact',
          padding:'1px 0', position:'relative',
        } as React.CSSProperties}>
          {isPick && pickOrder !== undefined && (
            <div style={{
              position:'absolute', top:1, right:1,
              fontSize:6, fontWeight:900, color:YELLOW, lineHeight:1,
            }}>★{pickOrder}</div>
          )}
          <div style={{
            fontSize:20, fontWeight:900,
            fontFamily:'Arial Black, Arial Narrow, Arial, sans-serif',
            lineHeight:1, color:YELLOW,
            textDecoration: scratched ? 'line-through' : 'none',
          }}>
            {entry.dorsalNumber}
          </div>
          {scratched && (
            <div style={{ fontSize:5, fontWeight:700, color:'rgba(255,224,0,0.75)', lineHeight:1 }}>RET</div>
          )}
        </div>

        {/* ── PANEL 2: Datos del caballo ── */}
        <div style={{
          flexShrink:0, width:'22%',
          borderRight:`1px solid ${BLACK}`,
          padding:'1px 3px',
          display:'flex', flexDirection:'column',
          justifyContent:'center', position:'relative',
        }}>
          {/* Stud */}
          {entry.studName && (
            <div style={{ fontSize:5.5, color:'#444', lineHeight:1.1, fontStyle:'italic' }}>
              {entry.studName}
            </div>
          )}
          {/* Horse name + nationality (SAME size) */}
          <div style={{
            fontSize:8.5, fontWeight:900,
            fontFamily:'Arial Narrow, Arial, sans-serif',
            textTransform:'uppercase', letterSpacing:'0.01em',
            lineHeight:1.1, color: scratched ? '#777' : BLACK,
            textDecoration: scratched ? 'line-through' : 'none',
          }}>
            {entry.horseName}{natStr}
          </div>
          {/* Pedigree */}
          {pedigree && (
            <div style={{ fontSize:6, fontStyle:'italic', color:'#333', lineHeight:1.1 }}>
              {pedigree}
            </div>
          )}
          {/* Color / gender / year stats */}
          <div style={{ fontSize:5.5, color:'#444', lineHeight:1.1 }}>
            {[entry.color, entry.gender].filter(Boolean).join(' · ')}
            {entry.yearStats && entry.yearStats.starts > 0 && (
              <span style={{ marginLeft:4, fontWeight:700, color:'#222' }}>
                2026: {entry.yearStats.starts}c-{entry.yearStats.wins}g
                {entry.yearStats.winless > 0 ? `-${entry.yearStats.winless}sg` : ''}
              </span>
            )}
          </div>
          {/* Medication — bottom-right corner, tiny */}
          {med && (
            <div style={{
              position:'absolute', bottom:1, right:2,
              fontSize:5.5, fontWeight:700, color:BLUE, lineHeight:1,
            }}>
              {med}
            </div>
          )}
        </div>

        {/* ── PANEL 3: Yunta ── */}
        <div style={{
          flexShrink:0, width:'10%',
          borderRight:`1px solid ${BLACK}`,
          padding:'1px 2px',
          display:'flex', flexDirection:'column', justifyContent:'center',
        }}>
          <div style={{ fontSize:6.5, fontWeight:700, color:BLACK, lineHeight:1.2,
            wordBreak:'break-word' }}>
            {jockeyFmt(entry.jockeyName)}
          </div>
          {entry.weightDeclared && (
            <div style={{ fontSize:9, fontWeight:900,
              fontFamily:'Arial Narrow, Arial, sans-serif', lineHeight:1, color:BLACK }}>
              {entry.weightDeclared}
            </div>
          )}
          {entry.implements && (
            <div style={{ fontSize:5.5, color:'#333', fontWeight:600, lineHeight:1.1 }}>
              {entry.implements}
            </div>
          )}
          {entry.trainerName && (
            <div style={{ fontSize:6, fontWeight:700, color:'#111', lineHeight:1.1,
              borderTop:'0.5px dotted #bbb', marginTop:1, paddingTop:1 }}>
              {trainerFmt(entry.trainerName)}
            </div>
          )}
        </div>

        {/* ── PANEL 3b: PP del día ── */}
        <div style={{
          flexShrink:0, width:'5%',
          borderRight:`1px solid ${BLACK}`,
          display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'center',
          padding:'1px 1px',
        }}>
          <div style={{ fontSize:13, fontWeight:900,
            fontFamily:'Arial Black, Arial Narrow, Arial, sans-serif',
            lineHeight:1, color:BLACK }}>
            {entry.postPosition}
          </div>
          <div style={{ fontSize:5, color:'#888', lineHeight:1 }}>pp</div>
        </div>

        {/* ── PANEL 4: Retrospecto ── */}
        <Panel4 entry={entry} maxH={maxH} />

      </div>
    </div>
  );
}

// ─── Race header ──────────────────────────────────────────────────────────────

function RaceHeader({ race, trackName }: { race: RaceItem; trackName: string }) {
  const annualLabel = race.annualRaceNumber ? `C${String(race.annualRaceNumber).padStart(3,'0')}` : null;
  const prize = race.prizePool?.usd > 0
    ? `US$ ${race.prizePool.usd.toLocaleString()}`
    : race.prizePool?.bs > 0
    ? `Bs. ${race.prizePool.bs.toLocaleString('es-VE')}`
    : null;
  const games = race.games.map(g => g.replace(/_/g,' ')).join(' · ');

  return (
    <div style={{
      display:'flex', alignItems:'stretch',
      borderBottom:`2px solid ${BLACK}`, borderTop:`2px solid ${BLACK}`,
      background: CYAN,
      printColorAdjust:'exact', WebkitPrintColorAdjust:'exact',
    } as React.CSSProperties}>
      <div style={{ flexShrink:0, minWidth:48,
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        padding:'2px 6px', borderRight:`1.5px solid rgba(0,0,0,0.3)` }}>
        <div style={{ fontSize:20, fontWeight:900, fontFamily:'Arial Black,Arial,sans-serif',
          lineHeight:1, color:BLACK }}>
          {race.raceNumber}<span style={{ fontSize:10 }}>ª</span>
        </div>
        <div style={{ fontSize:6, fontWeight:700, color:'rgba(0,0,0,0.65)',
          letterSpacing:'0.05em', textTransform:'uppercase' }}>Carrera</div>
        {annualLabel && <div style={{ fontSize:5.5, color:'rgba(0,0,0,0.55)', fontFamily:'monospace' }}>{annualLabel}</div>}
        {race.scheduledTime && <div style={{ fontSize:6.5, color:'rgba(0,0,0,0.75)', fontWeight:700 }}>{race.scheduledTime}</div>}
      </div>

      <div style={{ flexShrink:0,
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        padding:'2px 10px', borderRight:`1.5px solid rgba(0,0,0,0.3)` }}>
        <div style={{ fontSize:26, fontWeight:900, fontFamily:'Arial Black,Arial,sans-serif',
          lineHeight:1, color:BLACK }}>{race.distance}</div>
        <div style={{ fontSize:7, fontWeight:700, color:'rgba(0,0,0,0.65)',
          textTransform:'uppercase', letterSpacing:'0.08em' }}>MTS</div>
      </div>

      <div style={{ flex:1, padding:'2px 5px', display:'flex', flexDirection:'column', justifyContent:'center' }}>
        {(prize || games) && (
          <div style={{ fontSize:7.5, fontWeight:900, color:BLACK, lineHeight:1.2 }}>
            {prize && <span>Premio: {prize}</span>}
            {prize && games && <span style={{ fontWeight:400, color:'rgba(0,0,0,0.6)', margin:'0 4px' }}>·</span>}
            {games && <span style={{ fontWeight:600, color:'rgba(0,0,0,0.8)' }}>{games}</span>}
          </div>
        )}
        {race.conditions && (
          <div style={{ fontSize:6.5, fontWeight:600, color:'rgba(0,0,0,0.75)', lineHeight:1.3 }}>
            {race.conditions}
          </div>
        )}
      </div>

      <div style={{ flexShrink:0, width:72,
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        background:RED, padding:'3px 4px',
        printColorAdjust:'exact', WebkitPrintColorAdjust:'exact' } as React.CSSProperties}>
        <DHLogo size={26} />
        <div style={{ fontSize:6, fontWeight:900, color:YELLOW,
          letterSpacing:'0.05em', textTransform:'uppercase',
          textAlign:'center', fontFamily:'Arial Narrow,Arial,sans-serif',
          lineHeight:1.1, marginTop:1 }}>
          DESAFÍO<br/>HÍPICO
        </div>
        <div style={{ fontSize:5.5, color:'rgba(255,224,0,0.7)', textAlign:'center', marginTop:1 }}>
          {trackName}
        </div>
      </div>
    </div>
  );
}

// ─── Compact brand bar (pages 2+) ─────────────────────────────────────────────

function CompactBrandBar({ meeting }: { meeting: MeetingData }) {
  return (
    <div style={{
      background:RED, display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'2px 8px', marginBottom:2,
      printColorAdjust:'exact', WebkitPrintColorAdjust:'exact',
    } as React.CSSProperties}>
      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
        <DHLogo size={22} />
        <span style={{ fontSize:11, fontWeight:900, color:YELLOW,
          letterSpacing:'0.06em', fontFamily:'Arial Narrow,Arial,sans-serif' }}>
          DESAFÍO HÍPICO
        </span>
      </div>
      <span style={{ fontSize:8, fontWeight:700, color:'rgba(255,224,0,0.85)' }}>
        {meeting.trackName} · Reunión {meeting.meetingNumber}
      </span>
    </div>
  );
}

// ─── Favorites block ──────────────────────────────────────────────────────────

function FavoritesBlock({ raceId, picksByRace, tipsterName }: {
  raceId: string;
  picksByRace: Record<string, PicksForRace>;
  tipsterName: string;
}) {
  const picks = picksByRace[raceId];
  if (!picks || picks.marks.length === 0) return null;
  const sorted  = [...picks.marks].sort((a,b) => a.preferenceOrder - b.preferenceOrder);
  const dorsals = sorted.map(m => m.dorsalNumber ?? '?').join(' - ');
  const names   = sorted.map(m => m.horseName).join(' · ');

  return (
    <div style={{
      background:YELLOW, borderTop:`1.5px solid ${BLACK}`,
      padding:'1px 5px', display:'flex', alignItems:'baseline',
      flexWrap:'wrap', gap:'0 5px',
      printColorAdjust:'exact', WebkitPrintColorAdjust:'exact',
    } as React.CSSProperties}>
      <span style={{ fontSize:7.5, fontWeight:900, color:BLACK,
        fontFamily:'Arial Narrow,Arial,sans-serif' }}>Nuestros Favoritos:</span>
      <span style={{ fontSize:7.5, fontWeight:900, fontFamily:'monospace', color:RED }}>
        {dorsals}
      </span>
      <span style={{ fontSize:7, fontStyle:'italic', fontWeight:600, color:'#111' }}>{names}</span>
      <span style={{ fontSize:6, color:'#555', marginLeft:4 }}>· Por {tipsterName}</span>
      {picks.hasAiSource && (
        <span style={{ fontSize:5.5, color:'#666', display:'block', width:'100%' }}>
          * Picks extraídos por IA · pueden contener discrepancias con la fuente oficial INH/HINAVA
        </span>
      )}
    </div>
  );
}

// ─── Ad placeholder ───────────────────────────────────────────────────────────

function AdBlock({ entryCount }: { entryCount: number }) {
  const h = adHeight(entryCount);
  if (h <= 0) return null;
  return (
    <div style={{ height:h, margin:'2px 0', border:'1px dashed #ccc',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      background:LGRAY }}>
      <div style={{ fontSize:8, fontWeight:700, color:'#bbb',
        textTransform:'uppercase', letterSpacing:'0.1em' }}>Espacio Publicitario</div>
      <div style={{ fontSize:6.5, color:'#ccc', marginTop:1 }}>desafiohipico.com</div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function GacetaPrintTemplate({ meeting, races, tipster, picksByRace, config }: Props) {
  const tipsterName = tipster?.name ?? config.tipsterName ?? 'Experto DH';

  const meetingDateStr = new Date(meeting.date).toLocaleDateString('es-VE', {
    weekday:'long', day:'numeric', month:'long', year:'numeric', timeZone:'UTC',
  });

  return (
    <div className="hidden print:block" style={{
      fontFamily:'Arial Narrow, Arial, sans-serif',
      color:BLACK, background:WHITE, fontSize:8, lineHeight:1.2,
    }}>

      {/* Full page header — first page */}
      <div style={{
        background:RED, display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'5px 8px', marginBottom:4,
        printColorAdjust:'exact', WebkitPrintColorAdjust:'exact',
      } as React.CSSProperties}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <DHLogo size={42} />
          <div>
            <div style={{ fontSize:18, fontWeight:900, color:YELLOW,
              letterSpacing:'0.06em', textTransform:'uppercase',
              fontFamily:'Arial Narrow,Arial,sans-serif', lineHeight:1 }}>
              DESAFÍO HÍPICO
            </div>
            <div style={{ fontSize:8, color:'rgba(255,224,0,0.8)',
              letterSpacing:'0.12em', textTransform:'uppercase',
              borderBottom:`1px solid ${BLUE}`, paddingBottom:1, marginTop:2 }}>
              {meeting.trackName}
            </div>
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:10, fontWeight:700, color:YELLOW }}>
            {meeting.trackName} · Reunión {meeting.meetingNumber}
          </div>
          <div style={{ fontSize:7.5, color:'rgba(255,224,0,0.75)',
            textTransform:'capitalize', marginTop:1 }}>{meetingDateStr}</div>
          {config.mode !== 'public' && (
            <div style={{ fontSize:7, color:'rgba(255,224,0,0.85)', fontStyle:'italic', marginTop:1 }}>
              Cortesía de: <strong>{tipsterName}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Races */}
      {races.map((race, raceIdx) => {
        const isLastRace = raceIdx === races.length - 1;
        const ec  = race.entries.length;
        const mH  = maxHistRows(ec);
        const picks = picksByRace[race.raceId];

        return (
          <div key={race.raceId} style={{
            breakAfter: isLastRace ? 'auto' : 'page',
            pageBreakAfter: isLastRace ? 'auto' : 'always',
            border:`1px solid #888`, marginBottom:4,
          }}>
            {raceIdx > 0 && <CompactBrandBar meeting={meeting} />}
            <RaceHeader race={race} trackName={meeting.trackName} />
            <ColumnHeaderBar />
            <div>
              {race.entries.map(entry => {
                const pickMark = picks?.marks.find(m =>
                  m.dorsalNumber === entry.dorsalNumber ||
                  m.horseName.toUpperCase().trim() === entry.horseName.toUpperCase().trim()
                );
                return (
                  <EntryBlock
                    key={entry.dorsalNumber}
                    entry={entry}
                    maxH={mH}
                    isPick={!!pickMark}
                    pickOrder={pickMark?.preferenceOrder}
                  />
                );
              })}
            </div>
            <FavoritesBlock raceId={race.raceId} picksByRace={picksByRace} tipsterName={tipsterName} />
            <AdBlock entryCount={ec} />
            <div style={{ borderTop:`1px solid #ccc`, padding:'1px 6px',
              display:'flex', justifyContent:'space-between', alignItems:'center',
              background:LGRAY }}>
              <span style={{ fontSize:6, color:'#888', fontStyle:'italic' }}>
                Datos INH/HINAVA · desafiohipico.com · Distribución gratuita
              </span>
              <span style={{ fontSize:7, fontWeight:900, color:RED,
                fontFamily:'Arial Narrow,Arial,sans-serif' }}>
                ¡Suerte! y DESAFÍO HÍPICO
              </span>
            </div>
          </div>
        );
      })}

      {/* Final footer */}
      <div style={{ borderTop:`2px solid ${BLACK}`, marginTop:6, padding:'3px 6px',
        display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:6.5, color:'#555' }}>
          Generado por desafiohipico.com · Datos oficiales INH/HINAVA · Distribución gratuita
        </span>
        <span style={{ fontSize:9, fontWeight:900, color:RED,
          fontFamily:'Arial Narrow,Arial,sans-serif', letterSpacing:'0.04em' }}>
          ¡Suerte! y DESAFÍO HÍPICO
        </span>
      </div>
    </div>
  );
}
