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
const RED        = '#C0392B';
const YELLOW     = '#FFE000';
const BLUE       = '#4169E1';
const CYAN       = '#00b4e4';   // pick highlight (Panel 1)
const CYAN_LIGHT = '#4DD8F0';   // race header background — lighter/airy
const BLACK      = '#000000';
const WHITE      = '#FFFFFF';
const LGRAY      = '#f5f5f5';

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
  tipster: { id: string; name: string; youtubeUrl?: string | null } | null;
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

/**
 * Jinete: muestra el primer apellido + inicial del nombre.
 * Formato DB asumido: "APELLIDO1 [APELLIDO2] NOMBRE"
 * Ej: "LUGO FRANKLIN" → "LUGO,F."
 *     "PEREZ GARCIA JUAN" → "PEREZ,J."
 */
function jockeyFmt(name: string): string {
  if (!name) return '—';
  const p = name.trim().split(/\s+/);
  if (p.length === 1) return p[0];
  const surname  = p[0];                  // primer apellido
  const initial  = p[p.length - 1]?.[0];  // inicial del nombre (última palabra)
  return initial ? `${surname},${initial}.` : surname;
}

/** Entrenador: primer apellido */
function trainerFmt(name: string): string {
  if (!name) return '—';
  return name.trim().split(/\s+/)[0];
}

/**
 * Abreviaciones de cuerpos/distancias venezolanas.
 * "Pescuezo"→"Pzo" · "Cabeza"→"Cza" · "Nariz"→"Nrz"
 * "Medio cuerpo"→"½c" · "N cuerpos"→"Nc" · fracciones "3 1/2"→"3½"
 */
function cposAbbr(val: string | null | undefined): string {
  if (!val) return '—';
  const v = val.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (v === '—' || v === '-' || v === '') return '—';
  if (v.includes('PESC'))  return 'Pzo';
  if (v.includes('CABEZ')) return 'Cza';
  if (v.includes('NARIZ') || v.includes('NAR')) return 'Nrz';
  if (v.includes('MEDIO') || v.match(/^1\/2|^½/)) return '½c';
  if (v.includes('LARGO') || v.includes('LARG')) {
    const n = val.match(/(\d+)/);
    return n ? `${n[1]}Lg` : 'Lg';
  }
  // fracciones: "3 1/2" → "3½", "1 3/4" → "1¾", "1 1/4" → "1¼"
  let result = val.trim()
    .replace(/\s*1\/4/g, '¼').replace(/\s*1\/2/g, '½').replace(/\s*3\/4/g, '¾');
  // "N cuerpos" / "N c." → "Nc"
  result = result.replace(/\s*(cuerpos?|c\.)/gi, 'c');
  return result.trim().slice(0, 6) || '—';
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
 * Series abbreviation — Venezuelan horse racing (turf VEN).
 *
 * Format: <tipo><calificación>/<edad>   e.g. g1/4a · per/3a · g1y2/5a
 *
 * Tipos de calificación:
 *   per · g1 · g1y2 · g2 · g2y3 · g3 · g3-4 · g4 · g4y5
 *   g5 · g5+ · g6 · g6+
 *
 * Clásicos / Copa / GP: iniciales del nombre (+ /GI,/GII,/GIII si aplica)
 *   — clásico pendiente de lista oficial; por ahora genera iniciales automáticas
 */
function seriesAbbr(conditions: string): string {
  if (!conditions) return '';
  const raw = conditions.trim();
  const c = raw.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // ── Clásico / Copa / Gran Premio ─────────────────────────────────────────
  const clsM = raw.match(/cl[aá]sico\s+(.+)/i);
  if (clsM) {
    // Extract initials of significant words (skip articles/prepositions)
    const skip = new Set(['DE','DEL','LA','EL','LOS','LAS','Y','A','EN','CON','AL']);
    const words = clsM[1].trim().replace(/\./g,'').split(/\s+/);
    const initials = words
      .filter(w => !skip.has(w.toUpperCase()) && w.length > 0)
      .map(w => w[0].toUpperCase())
      .join('');
    // Grade detection
    const gradeM = c.match(/GRADO\s+(I{1,3}|[123])/);
    const grade = gradeM
      ? `/G${{ '1':'I','2':'II','3':'III','I':'I','II':'II','III':'III' }[gradeM[1]] ?? gradeM[1]}`
      : '';
    return `${initials}${grade}`.slice(0, 14);
  }
  const copaM = raw.match(/copa\s+(.+)/i);
  if (copaM) {
    const skip = new Set(['DE','DEL','LA','EL','LOS','LAS','Y']);
    const words = copaM[1].trim().replace(/\./g,'').split(/\s+/);
    const initials = words.filter(w => !skip.has(w.toUpperCase())).map(w => w[0].toUpperCase()).join('');
    return `Copa${initials}`.slice(0, 12);
  }
  const gpM = raw.match(/gran\s+premio\s+(.+)/i);
  if (gpM) {
    const words = gpM[1].trim().split(/\s+/);
    const initials = words.map(w => w[0].toUpperCase()).join('');
    return `GP${initials}`.slice(0, 10);
  }

  // ── Age suffix (/Xa or /Xa+) ─────────────────────────────────────────────
  const ageYmas = c.match(/(\d)\s*AN[NO]S?\s+Y\s+MA/);
  const ageDe   = c.match(/DE\s+(\d)\s*AN[NO]S?/);
  let ageSuffix = '';
  if (ageYmas)    ageSuffix = `/${ageYmas[1]}a+`;
  else if (ageDe) ageSuffix = `/${ageDe[1]}a`;

  // ── Qualification code ───────────────────────────────────────────────────
  let qual = '';

  // Ganadoras de N y M (ranges and pairs)
  if      (c.match(/GANAD\w+\s+DE\s+1\s+Y\s+2/))  qual = 'g1y2';
  else if (c.match(/GANAD\w+\s+DE\s+2\s+Y\s+3/))  qual = 'g2y3';
  else if (c.match(/GANAD\w+\s+DE\s+3\s+Y\s+4/))  qual = 'g3-4';
  else if (c.match(/GANAD\w+\s+DE\s+4\s+Y\s+5/))  qual = 'g4y5';
  else if (c.match(/GANAD\w+\s+DE\s+[56]\s+[OA]\s+M/)) qual = 'g5+'; // "6 o más" / "5 y más"
  else if (c.match(/GANAD\w+\s+DE\s+6\s+Y\s+M/)
        || c.match(/GANAD\w+\s+DE\s+6\s+O\s+M/))  qual = 'g6+';
  else if (c.match(/GANAD\w+\s+DE\s+5\s+Y\s+M/)
        || c.match(/GANAD\w+\s+DE\s+5\s+O\s+M/))  qual = 'g5+';
  else {
    const gN = c.match(/GANAD\w+\s+DE\s+([1-9])/);
    if (gN) qual = `g${gN[1]}`;
  }

  // Perdedoras (no ganadoras)
  if (!qual && c.includes('PERDED')) qual = 'per';
  if (!qual && c.includes('NO GANAD')) qual = 'per';
  if (!qual && (c.includes('DEBUT') || c.includes('NO GANAD'))) qual = 'deb';

  // Handicap / Reclamo / Allowance
  if (!qual && c.includes('HANDICAP')) qual = 'hcp';
  if (!qual && c.includes('RECLAM'))   qual = 'rcl';
  if (!qual && (c.includes('ALLOWANCE') || c.includes('ALW'))) qual = 'alw';

  if (qual) return `${qual}${ageSuffix}`.slice(0, 14);

  // Fallback: first meaningful word truncated
  return raw.replace(/^PARA\s+/i,'').slice(0, 12);
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
  { key:'Fec',          w:28,  align:'center' }, // wider: "16-09/26" needs 8 chars
  { key:'Carr',         w:20,  align:'center' },
  { key:'Dist',         w:16,  align:'center' },
  { key:'PP',           w:13,  align:'center' }, // cyan tint — PP histórico
  { key:'400m',         w:10,  align:'center' },
  { key:'800m',         w:10,  align:'center' },
  { key:'Lleg',         w:13,  align:'center' },
  { key:'Kg.Jin',       w:14,  align:'center' },
  { key:'Jinete',       w:55,  align:'left'   }, // wider: apellido+inicial must fit
  { key:'Div',          w:10,  align:'center' },
  { key:'Ganador / 2°', w:88,  align:'left'   }, // wider — names need space
  { key:'Cpos',         w:22,  align:'center' }, // Pzo/Cza/½c — slightly wider
  { key:'Serie',        w:32,  align:'left'   },
  { key:'Rat',          w:8,   align:'center' },
  { key:'T.G.',         w:22,  align:'center' },
  { key:'T.Ej.',        w:22,  align:'center' },
  { key:'Cont.',        w:0,   align:'left'   }, // flex remainder — narrows as others grow
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

// ─── ColGroup: shared column widths for header + data tables ──────────────────
//
// Used in both ColumnHeaderBar and Panel4. Must reference the same COLS array.
// With table-layout:fixed + colgroup, browsers use exactly these widths on both
// tables, guaranteeing pixel-perfect alignment across all horse rows.
function ColGroup() {
  return (
    <colgroup>
      {COLS.map((c, i) => (
        <col key={i} style={{ width: c.w > 0 ? c.w : 'auto' }} />
      ))}
    </colgroup>
  );
}

// ─── Column header bar (ONE per race, outside horse rows) ─────────────────────

function ColumnHeaderBar() {
  // boxSizing:'border-box' on every panel ensures borders are included in declared widths,
  // matching EntryBlock panels exactly → perfect column alignment.
  const hPanelBase: React.CSSProperties = {
    boxSizing: 'border-box',
    flexShrink: 0,
  };
  return (
    <div style={{
      display:'flex', alignItems:'stretch',
      background: BLACK,
      printColorAdjust:'exact', WebkitPrintColorAdjust:'exact',
    } as React.CSSProperties}>
      {/* N° */}
      <div style={{ ...hPanelBase, width:32, display:'flex', alignItems:'center',
        justifyContent:'center', borderRight:`1px solid #444` }}>
        <span style={{ fontSize:6, fontWeight:700, color:YELLOW }}>N°</span>
      </div>
      {/* Caballo */}
      <div style={{ ...hPanelBase, width:'22%', borderRight:`1px solid #444`,
        padding:'1px 3px', display:'flex', alignItems:'center' }}>
        <span style={{ fontSize:6, fontWeight:700, color:WHITE, textTransform:'uppercase',
          letterSpacing:'0.05em' }}>Ejemplar / Stud</span>
      </div>
      {/* Yunta — 8% */}
      <div style={{ ...hPanelBase, width:'8%', borderRight:`1px solid #444`,
        padding:'1px 2px', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <span style={{ fontSize:6, fontWeight:700, color:WHITE, textTransform:'uppercase',
          letterSpacing:'0.05em' }}>Yunta</span>
      </div>
      {/* PP del día — 3%, red bg */}
      <div style={{ ...hPanelBase, width:'3%', borderRight:`1px solid #444`,
        padding:'1px 1px', display:'flex', alignItems:'center', justifyContent:'center',
        background: RED,
        printColorAdjust:'exact', WebkitPrintColorAdjust:'exact' } as React.CSSProperties}>
        <span style={{ fontSize:5.5, fontWeight:700, color:YELLOW }}>PP</span>
      </div>
      {/* Retrospecto columns */}
      <div style={{ ...hPanelBase, flex:1, overflow:'hidden', padding: P4_PADDING }}>
        <table style={{ width:'100%', borderCollapse:'collapse', tableLayout:'fixed' }}>
          <ColGroup />
          <thead>
            <tr>
              {COLS.map(c => (
                <th key={c.key} style={{
                  ...HC,
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
  const cposRaw = isWin ? null : (h.distanceMargin || h.diffVsFirst || null);
  const cpos    = cposAbbr(cposRaw);
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
    <div style={{ boxSizing:'border-box', flex:1, minWidth:0, padding: P4_PADDING, display:'flex', flexDirection:'column' }}>
      {rows.length === 0 ? (
        <span style={{ fontSize:6.5, color:'#888', fontStyle:'italic', padding:'1px 2px' }}>
          Sin historial
        </span>
      ) : (
        <table style={{ width:'100%', borderCollapse:'collapse', tableLayout:'fixed' }}>
          <ColGroup />
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

  // Panel 1 colors: CYAN (Gaceta style) for picks, white for regular horses
  const panel1Bg     = isPick ? CYAN  : WHITE;
  const panel1Num    = isPick ? BLACK : BLACK; // black on both — cyan has good contrast
  const panel1Star   = isPick ? '#005a72' : BLACK; // darker cyan shade for the ★ on CYAN bg
  const panel1Border = isPick ? `2px solid ${CYAN}` : `2px solid #ccc`;

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

        {/* ── PANEL 1: N° gualdrapa — CYAN si es pick (Gaceta style), blanco si normal ── */}
        <div style={{
          boxSizing:'border-box', flexShrink:0, width:32,
          display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'center',
          borderRight: panel1Border,
          background: panel1Bg,
          printColorAdjust:'exact', WebkitPrintColorAdjust:'exact',
          padding:'1px 0', position:'relative',
        } as React.CSSProperties}>
          {isPick && pickOrder !== undefined && (
            <div style={{
              position:'absolute', top:1, right:1,
              fontSize:6, fontWeight:900, color: panel1Star, lineHeight:1,
            }}>★{pickOrder}</div>
          )}
          <div style={{
            fontSize:20, fontWeight:900,
            fontFamily:'Arial Black, Arial Narrow, Arial, sans-serif',
            lineHeight:1, color: panel1Num,
            textDecoration: scratched ? 'line-through' : 'none',
          }}>
            {entry.dorsalNumber}
          </div>
          {scratched && (
            <div style={{ fontSize:5, fontWeight:700, color:'#555', lineHeight:1 }}>RET</div>
          )}
        </div>

        {/* ── PANEL 2: Datos del caballo ── */}
        <div style={{
          boxSizing:'border-box', flexShrink:0, width:'22%',
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

        {/* ── PANEL 3: Yunta — 8%, centrada ── */}
        <div style={{
          boxSizing:'border-box', flexShrink:0, width:'8%',
          borderRight:`1px solid ${BLACK}`,
          padding:'1px 2px',
          display:'flex', flexDirection:'column',
          justifyContent:'center', alignItems:'center',
          textAlign:'center',
        }}>
          <div style={{ fontSize:6.5, fontWeight:700, color:BLACK, lineHeight:1.2,
            wordBreak:'break-word', textAlign:'center' }}>
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

        {/* ── PANEL 3b: PP del día — 3%, gris neutro (dato puro, sin énfasis de color) ── */}
        <div style={{
          boxSizing:'border-box', flexShrink:0, width:'3%',
          borderRight:`1px solid ${BLACK}`,
          display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'center',
          padding:'1px 0',
          background: '#e8e8e8',
        }}>
          <div style={{ fontSize:11, fontWeight:900,
            fontFamily:'Arial Black, Arial Narrow, Arial, sans-serif',
            lineHeight:1, color:'#111' }}>
            {entry.postPosition}
          </div>
          <div style={{ fontSize:5, color:'#777', lineHeight:1 }}>pp</div>
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
      background: CYAN_LIGHT,
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

function FavoritesBlock({ raceId, picksByRace, tipsterName, tipsterYoutubeUrl }: {
  raceId: string;
  picksByRace: Record<string, PicksForRace>;
  tipsterName: string;
  tipsterYoutubeUrl?: string | null;
}) {
  const picks = picksByRace[raceId];
  if (!picks || picks.marks.length === 0) return null;
  const sorted  = [...picks.marks].sort((a,b) => a.preferenceOrder - b.preferenceOrder);
  const dorsals = sorted.map(m => m.dorsalNumber ?? '?').join(' - ');
  const names   = sorted.map(m => m.horseName).join(' · ');

  return (
    <div style={{
      background: RED, borderTop:`2px solid ${BLACK}`,
      padding:'2px 5px',
      printColorAdjust:'exact', WebkitPrintColorAdjust:'exact',
    } as React.CSSProperties}>
      {/* Fila principal: título + dorsales + nombres */}
      <div style={{ display:'flex', alignItems:'baseline', flexWrap:'wrap', gap:'0 5px' }}>
        <span style={{ fontSize:8, fontWeight:900, color:YELLOW,
          fontFamily:'Arial Narrow,Arial,sans-serif', letterSpacing:'0.03em' }}>
          Pronóstico de {tipsterName}:
        </span>
        <span style={{ fontSize:8, fontWeight:900, fontFamily:'monospace', color:YELLOW }}>
          {dorsals}
        </span>
        <span style={{ fontSize:7.5, fontStyle:'italic', fontWeight:700, color:YELLOW }}>
          {names}
        </span>
      </div>
      {/* Fila disclaimer */}
      <div style={{ fontSize:5.5, color:'rgba(255,255,255,0.75)', marginTop:1, lineHeight:1.2 }}>
        {picks.hasAiSource
          ? `* Transcritos con IA desde canal público de YouTube${tipsterYoutubeUrl ? ` (${tipsterYoutubeUrl})` : ''} · Pueden existir errores de transcripción · Verifica con la fuente original`
          : `* Pronóstico personal de ${tipsterName}`
        }
      </div>
    </div>
  );
}

// ─── Ad placeholder ───────────────────────────────────────────────────────────

function AdBlock({ entryCount }: { entryCount: number }) {
  const h = adHeight(entryCount);
  if (h <= 0) return null;

  // Large ad (≥90px): full CTA
  if (h >= 90) return (
    <div style={{ height:h, margin:'2px 0', border:`1px solid ${RED}`,
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      gap:3, background:'#fff8f8', padding:'4px 8px' }}>
      <div style={{ fontSize:10, fontWeight:900, color:RED,
        fontFamily:'Arial Narrow,Arial,sans-serif', letterSpacing:'0.04em',
        textTransform:'uppercase', textAlign:'center' }}>
        🏇 Pronósticos · Estadísticas · Factor de Victoria
      </div>
      <div style={{ fontSize:8, color:'#444', textAlign:'center', lineHeight:1.3 }}>
        Accede gratis a los análisis de los mejores expertos hípicos de Venezuela.
        <br/>Regístrate en <strong style={{ color:RED }}>desafiohipico.com</strong> y sube tu nivel.
      </div>
      <div style={{ fontSize:7, color:'#888', fontStyle:'italic' }}>
        Picks verificados · Estadísticas de eficacia · Picks históricos
      </div>
    </div>
  );

  // Medium ad (≥45px): compact CTA
  if (h >= 45) return (
    <div style={{ height:h, margin:'2px 0', border:`1px solid ${RED}`,
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      gap:2, background:'#fff8f8', padding:'3px 8px' }}>
      <div style={{ fontSize:9, fontWeight:900, color:RED,
        fontFamily:'Arial Narrow,Arial,sans-serif', textAlign:'center' }}>
        Pronósticos de expertos · <span style={{ color:'#111' }}>desafiohipico.com</span>
      </div>
      <div style={{ fontSize:7, color:'#555', textAlign:'center' }}>
        Regístrate gratis · Estadísticas · Factor de Victoria
      </div>
    </div>
  );

  // Small ad: tagline only
  return (
    <div style={{ height:h, margin:'2px 0', border:`1px solid #ddd`,
      display:'flex', alignItems:'center', justifyContent:'center',
      background:'#fafafa' }}>
      <div style={{ fontSize:7, fontWeight:700, color:RED,
        fontFamily:'Arial Narrow,Arial,sans-serif' }}>
        desafiohipico.com · Pronósticos · Estadísticas · Factor de Victoria
      </div>
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
      {/* Force background color preservation in all PDF renderers */}
      <style>{`
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
        }
      `}</style>

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
            <FavoritesBlock
              raceId={race.raceId}
              picksByRace={picksByRace}
              tipsterName={tipsterName}
              tipsterYoutubeUrl={tipster?.youtubeUrl}
            />
            <AdBlock entryCount={ec} />
            {/* Per-race footer — red band */}
            <div style={{
              background:RED, padding:'1px 6px',
              display:'flex', justifyContent:'space-between', alignItems:'center',
              printColorAdjust:'exact', WebkitPrintColorAdjust:'exact',
            } as React.CSSProperties}>
              <span style={{ fontSize:6, color:'rgba(255,224,0,0.75)', fontStyle:'italic' }}>
                desafiohipico.com · Datos INH/HINAVA · Distribución gratuita
              </span>
              <span style={{ fontSize:7, fontWeight:900, color:YELLOW,
                fontFamily:'Arial Narrow,Arial,sans-serif', letterSpacing:'0.03em' }}>
                Ya corrió · ya ganó · ya cobró
              </span>
            </div>
          </div>
        );
      })}

      {/* Final footer — red band + disclaimer */}
      <div style={{
        background:RED, marginTop:4, padding:'3px 6px',
        printColorAdjust:'exact', WebkitPrintColorAdjust:'exact',
      } as React.CSSProperties}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:2 }}>
          <span style={{ fontSize:8, fontWeight:900, color:YELLOW,
            fontFamily:'Arial Narrow,Arial,sans-serif', letterSpacing:'0.04em' }}>
            Ya corrió · ya ganó · ya cobró
          </span>
          <span style={{ fontSize:8, fontWeight:900, color:YELLOW,
            fontFamily:'Arial Narrow,Arial,sans-serif' }}>
            desafiohipico.com
          </span>
        </div>
        {/* 3-layer disclaimer */}
        <div style={{ fontSize:5.5, color:'rgba(255,255,255,0.75)', lineHeight:1.35, borderTop:'1px solid rgba(255,255,255,0.2)', paddingTop:2 }}>
          <span style={{ fontWeight:700, color:'rgba(255,255,255,0.9)' }}>Datos: </span>
          Tomados de publicaciones públicas del INH/HINAVA y procesados automáticamente con IA. Pueden existir discrepancias con la fuente oficial.
          {'  '}
          <span style={{ fontWeight:700, color:'rgba(255,255,255,0.9)' }}>Pronósticos: </span>
          Transcritos con IA desde canales públicos de YouTube de sus autores. Desafío Hípico no garantiza su exactitud ni se responsabiliza por errores de transcripción.
          {'  '}
          <span style={{ fontWeight:700, color:'rgba(255,255,255,0.9)' }}>Apuestas: </span>
          Esta publicación es informativa. Las decisiones de apuesta son responsabilidad exclusiva del apostador.
        </div>
      </div>
    </div>
  );
}
