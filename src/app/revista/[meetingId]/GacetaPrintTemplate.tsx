'use client';

/**
 * GacetaPrintTemplate — Estilo Gaceta Hípica · Branding Desafío Hípico
 *
 * Invisible en pantalla (hidden), visible solo al imprimir (print:block).
 *
 * Arquitectura por caballo: 4 paneles verticales (flex):
 *   Panel 1 (~5%)  : PP/Dorsal gigante — rojo con número dorado; ★ si es pick
 *   Panel 2 (~22%) : Datos del caballo (stud, nombre, pedigree, color, stats)
 *   Panel 3 (~13%) : Yunta — jinete, kg, implementos, entrenador
 *   Panel 4 (~60%) : Retrospecto — micro-tabla con últimas carreras + traqueos
 *
 * Un solo header de columnas por carrera (fuera de los horse rows → alineación perfecta).
 * Densidad: hasta 14 caballos por hoja A4.
 * Publicidad dinámica cuando hay < 14 caballos en la carrera.
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
/** Jinete: Apellido(s), Inicial. — sin truncar apellido */
function jockeyFmt(name: string): string {
  if (!name) return '—';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const last  = parts.slice(1).join(' ');
  return `${last}, ${first[0]}.`;
}
/** Entrenador: las dos últimas palabras del nombre */
function trainerFmt(name: string): string {
  if (!name) return '—';
  const p = name.trim().split(/\s+/);
  return p.slice(-2).join(' ');
}
/** maxHistory dinámico según cantidad de caballos */
function maxHist(n: number): number {
  if (n >= 13) return 3;
  if (n >= 9)  return 4;
  return 5;
}
/** Slot publicitario según caballos */
function adSlot(n: number): number {
  if (n <= 4)  return 110;
  if (n <= 6)  return 75;
  if (n <= 9)  return 42;
  if (n <= 11) return 20;
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

const COLS: { key: string; w: number; align: 'center'|'left'|'right' }[] = [
  { key:'Fec',         w:22,  align:'center' },
  { key:'Carr',        w:20,  align:'center' },
  { key:'Dist',        w:16,  align:'center' },
  { key:'PP',          w:13,  align:'center' }, // cyan bg
  { key:'800m',        w:12,  align:'center' },
  { key:'Lleg',        w:13,  align:'center' },
  { key:'Kg.Jin',      w:14,  align:'center' },
  { key:'Jinete',      w:38,  align:'left'   },
  { key:'Div',         w:13,  align:'center' },
  { key:'Ganador / 2°',w:54,  align:'left'   },
  { key:'Cpos',        w:18,  align:'center' },
  { key:'Serie',       w:30,  align:'left'   },
  { key:'Rat',         w:11,  align:'center' },
  { key:'T.G.',        w:22,  align:'center' },
  { key:'T.Ej.',       w:22,  align:'center' },
  { key:'Cont.',       w:0,   align:'left'   }, // flex remainder
];

// ─── Shared cell styles ───────────────────────────────────────────────────────

/** Base data cell — dark text, medium weight */
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

/** Header cell */
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

// ─── Column header bar (rendered ONCE per race, outside horse rows) ───────────

function ColumnHeaderBar() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'stretch',
      background: BLACK,
      printColorAdjust: 'exact',
      WebkitPrintColorAdjust: 'exact',
    } as React.CSSProperties}>
      {/* Panel 1 header */}
      <div style={{ flexShrink:0, width:32, display:'flex', alignItems:'center', justifyContent:'center',
        borderRight:`1px solid #444` }}>
        <span style={{ fontSize:6, fontWeight:700, color:YELLOW, letterSpacing:'0.05em' }}>PP</span>
      </div>
      {/* Panel 2 header */}
      <div style={{ flexShrink:0, width:'22%', borderRight:`1px solid #444`,
        padding:'1px 3px', display:'flex', alignItems:'center' }}>
        <span style={{ fontSize:6, fontWeight:700, color:WHITE, textTransform:'uppercase', letterSpacing:'0.05em' }}>
          Ejemplar / Stud
        </span>
      </div>
      {/* Panel 3 header */}
      <div style={{ flexShrink:0, width:'13%', borderRight:`1px solid #444`,
        padding:'1px 2px', display:'flex', alignItems:'center' }}>
        <span style={{ fontSize:6, fontWeight:700, color:WHITE, textTransform:'uppercase', letterSpacing:'0.05em' }}>
          Yunta / Kg
        </span>
      </div>
      {/* Panel 4 header — micro columns */}
      <div style={{ flex:1, overflow:'hidden' }}>
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

// ─── Single history data row ──────────────────────────────────────────────────

function HistoryRow({ h, isOdd }: { h: RaceHistoryItem; isOdd: boolean }) {
  const isWin = h.finishPosition === 1 && !h.isScratched;
  const isScr = h.isScratched;
  const bg    = isOdd ? LGRAY : WHITE;
  const cpos  = isWin
    ? '—'
    : (h.distanceMargin || h.diffVsFirst || '—');
  const ref   = isWin
    ? (h.secondName ?? '—')
    : (h.winnerName ?? '—');
  const refLabel = isWin ? '2°' : '';
  const serie = (h.conditions ?? '').slice(0, 14);

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
      {/* PP — cyan tint background */}
      <td style={{
        ...DC, textAlign:'center', fontWeight:700,
        background:`${CYAN}40`,
        printColorAdjust:'exact', WebkitPrintColorAdjust:'exact',
      } as React.CSSProperties}>
        {isScr ? 'R' : h.dorsalNumber}
      </td>
      {/* 800m */}
      <td style={{ ...DC, textAlign:'center', color:'#777' }}>—</td>
      {/* Lleg */}
      <td style={{
        ...DC, textAlign:'center', fontWeight: isWin ? 900 : 700,
        color: isWin ? '#6a4500' : (isScr ? '#999' : BLACK),
        textDecoration: isScr ? 'line-through' : 'none',
      }}>
        {posDisplay(h)}
      </td>
      {/* Kg.Jin — use h.weight from snapshot */}
      <td style={{ ...DC, textAlign:'center' }}>
        {h.weight || '—'}
      </td>
      {/* Jinete */}
      <td style={{ ...DC, textAlign:'left', color:'#111' }}>
        {jockeyFmt(h.jockeyName)}
      </td>
      {/* Div */}
      <td style={{ ...DC, textAlign:'center', color:'#777' }}>—</td>
      {/* Ganador / 2° */}
      <td style={{ ...DC, textAlign:'left',
        fontWeight: isWin ? 700 : 600,
        color: isWin ? '#6a4500' : BLACK,
        overflow:'hidden',
      }}>
        {refLabel && <span style={{ fontSize:5.5, color:'#777', marginRight:1 }}>{refLabel}:</span>}
        {ref.slice(0, 20)}
      </td>
      {/* Cpos */}
      <td style={{ ...DC, textAlign:'center', color:'#222' }}>{cpos}</td>
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

// ─── Panel 4: Retrospecto + Traqueos (self-contained) ────────────────────────

function Panel4({ entry, maxH }: { entry: EntryItem; maxH: number }) {
  const rows = entry.raceHistory.slice(0, maxH);

  // Workouts inline string — lives here, below the history table
  const workoutLine = entry.workouts.length > 0
    ? entry.workouts.slice(0, 5).map(w => {
        const t = ({ EP:'EP', ES:'ES', AP:'AP', galopo:'Gal', trote:'Trot' } as Record<string,string>)[w.workoutType] ?? w.workoutType ?? '';
        return `${fmtDate(w.workoutDate)} ${t} ${w.distance}m ${w.splits}${w.comment ? ` (${w.comment})` : ''}${w.daysRest ? ` ${w.daysRest}d` : ''}`;
      }).join(' · ')
    : null;

  return (
    <div style={{ flex:1, minWidth:0, padding:'1px 0 1px 2px', display:'flex', flexDirection:'column' }}>
      {rows.length === 0 ? (
        <span style={{ fontSize:6.5, color:'#888', fontStyle:'italic', padding:'2px' }}>Sin historial</span>
      ) : (
        <table style={{ width:'100%', borderCollapse:'collapse', tableLayout:'fixed' }}>
          <tbody>
            {rows.map((h, i) => (
              <HistoryRow key={i} h={h} isOdd={i % 2 === 0} />
            ))}
          </tbody>
        </table>
      )}
      {workoutLine && (
        <div style={{
          fontSize: 6,
          fontStyle: 'italic',
          fontWeight: 600,
          color: '#222',
          lineHeight: 1.15,
          borderTop: '0.5px dashed #ccc',
          padding: '0.5px 0 0 2px',
          marginTop: 1,
        }}>
          <span style={{ fontWeight:700, fontStyle:'normal', color:BLUE, marginRight:3 }}>Traq:</span>
          {workoutLine}
        </div>
      )}
    </div>
  );
}

// ─── Full entry (horse) block ─────────────────────────────────────────────────

function EntryBlock({
  entry, maxH, isPick, pickOrder,
}: {
  entry: EntryItem;
  maxH: number;
  isPick: boolean;
  pickOrder?: number;
}) {
  const scratched = entry.isScratched;
  const pedigree  = [entry.sire, entry.dam].filter(Boolean).join(' x ');

  return (
    <div style={{
      borderTop: '0.5px solid #aaa',
      breakInside: 'avoid',
      pageBreakInside: 'avoid',
      opacity: scratched ? 0.6 : 1,
    }}>
      <div style={{ display:'flex', alignItems:'stretch', minHeight:26 }}>

        {/* ── PANEL 1: PP number ── */}
        <div style={{
          flexShrink: 0,
          width: 32,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRight: `2px solid ${BLACK}`,
          // All PP boxes: RED bg + YELLOW text
          background: RED,
          printColorAdjust: 'exact',
          WebkitPrintColorAdjust: 'exact',
          padding: '1px 0',
          position: 'relative',
        } as React.CSSProperties}>
          {/* Star indicator for picks */}
          {isPick && pickOrder !== undefined && (
            <div style={{
              position: 'absolute', top: 1, right: 1,
              fontSize: 6, fontWeight: 900,
              color: YELLOW,
              lineHeight: 1,
            }}>★{pickOrder}</div>
          )}
          <div style={{
            fontSize: 20,
            fontWeight: 900,
            fontFamily: 'Arial Black, Arial Narrow, Arial, sans-serif',
            lineHeight: 1,
            color: YELLOW,
            textDecoration: scratched ? 'line-through' : 'none',
          }}>
            {entry.postPosition}
          </div>
          <div style={{ fontSize: 5.5, color: 'rgba(255,224,0,0.75)', lineHeight:1 }}>
            #{entry.dorsalNumber}
          </div>
        </div>

        {/* ── PANEL 2: Datos del caballo ── */}
        <div style={{
          flexShrink: 0,
          width: '22%',
          borderRight: `1px solid ${BLACK}`,
          padding: '1px 3px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center', // centers vertically when stud is missing
        }}>
          {/* Stud — only if present */}
          {entry.studName && (
            <div style={{ fontSize:5.5, color:'#444', lineHeight:1.1, fontStyle:'italic' }}>
              {entry.studName}
            </div>
          )}
          {/* Horse name */}
          <div style={{
            fontSize: 8.5,
            fontWeight: 900,
            fontFamily: 'Arial Narrow, Arial, sans-serif',
            textTransform: 'uppercase',
            letterSpacing: '0.01em',
            lineHeight: 1.1,
            color: scratched ? '#777' : BLACK,
            textDecoration: scratched ? 'line-through' : 'none',
          }}>
            {entry.horseName}
            {entry.nationality && entry.nationality !== 'VEN' && (
              <span style={{ fontSize:6, color:'#555', fontWeight:500 }}> ({entry.nationality})</span>
            )}
            {/* Badges inline with name */}
            {entry.medication && (
              <span style={{ fontSize:5.5, fontWeight:700, color:BLUE,
                border:`0.5px solid ${BLUE}`, borderRadius:2, padding:'0 1px', marginLeft:2 }}>
                {entry.medication}
              </span>
            )}
            {scratched && (
              <span style={{ fontSize:5.5, fontWeight:700, color:'#c00',
                border:'0.5px solid #c00', borderRadius:2, padding:'0 1px', marginLeft:2 }}>RET</span>
            )}
          </div>
          {/* Pedigree */}
          {pedigree && (
            <div style={{ fontSize:6, fontStyle:'italic', color:'#333', lineHeight:1.1 }}>
              {pedigree}
            </div>
          )}
          {/* Color / gender */}
          {(entry.color || entry.gender) && (
            <div style={{ fontSize:5.5, color:'#444', lineHeight:1.1 }}>
              {[entry.color, entry.gender].filter(Boolean).join(' · ')}
            </div>
          )}
          {/* Year stats */}
          {entry.yearStats && entry.yearStats.starts > 0 && (
            <div style={{ fontSize:5.5, fontWeight:700, color:'#222', lineHeight:1.1 }}>
              2026: {entry.yearStats.starts}c-{entry.yearStats.wins}g
              {entry.yearStats.winless > 0 ? `-${entry.yearStats.winless}sg` : ''}
            </div>
          )}
        </div>

        {/* ── PANEL 3: Yunta ── */}
        <div style={{
          flexShrink: 0,
          width: '13%',
          borderRight: `1px solid ${BLACK}`,
          padding: '1px 2px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}>
          {/* Jockey name */}
          <div style={{
            fontSize: 6.5,
            fontWeight: 700,
            color: BLACK,
            lineHeight: 1.2,
            wordBreak: 'break-word',
          }}>
            {jockeyFmt(entry.jockeyName)}
          </div>
          {/* Weight — large */}
          {entry.weightDeclared && (
            <div style={{
              fontSize: 9,
              fontWeight: 900,
              fontFamily: 'Arial Narrow, Arial, sans-serif',
              lineHeight: 1,
              color: BLACK,
            }}>
              {entry.weightDeclared}
            </div>
          )}
          {/* Implements */}
          {entry.implements && (
            <div style={{ fontSize:5.5, color:'#333', fontWeight:600, lineHeight:1.1 }}>
              {entry.implements}
            </div>
          )}
          {/* Trainer */}
          {entry.trainerName && (
            <div style={{
              fontSize: 6,
              fontWeight: 700,
              color: '#111',
              lineHeight: 1.1,
              borderTop: '0.5px dotted #bbb',
              marginTop: 1,
              paddingTop: 1,
            }}>
              {trainerFmt(entry.trainerName)}
            </div>
          )}
        </div>

        {/* ── PANEL 4: Retrospecto + Traqueos ── */}
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

      {/* Race number + time */}
      <div style={{
        flexShrink:0, minWidth:48,
        display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        padding:'2px 6px',
        borderRight:`1.5px solid rgba(0,0,0,0.3)`,
      }}>
        <div style={{ fontSize:20, fontWeight:900, fontFamily:'Arial Black,Arial,sans-serif',
          lineHeight:1, color:BLACK }}>
          {race.raceNumber}<span style={{ fontSize:10 }}>ª</span>
        </div>
        <div style={{ fontSize:6, fontWeight:700, color:'rgba(0,0,0,0.65)',
          letterSpacing:'0.05em', textTransform:'uppercase' }}>Carrera</div>
        {annualLabel && (
          <div style={{ fontSize:5.5, color:'rgba(0,0,0,0.55)', fontFamily:'monospace' }}>{annualLabel}</div>
        )}
        {race.scheduledTime && (
          <div style={{ fontSize:6.5, color:'rgba(0,0,0,0.75)', fontWeight:700 }}>{race.scheduledTime}</div>
        )}
      </div>

      {/* Distance — dominant center */}
      <div style={{
        flexShrink:0,
        display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        padding:'2px 10px',
        borderRight:`1.5px solid rgba(0,0,0,0.3)`,
      }}>
        <div style={{ fontSize:26, fontWeight:900, fontFamily:'Arial Black,Arial,sans-serif',
          lineHeight:1, color:BLACK }}>{race.distance}</div>
        <div style={{ fontSize:7, fontWeight:700, color:'rgba(0,0,0,0.65)',
          textTransform:'uppercase', letterSpacing:'0.08em' }}>MTS</div>
      </div>

      {/* Prize + conditions */}
      <div style={{ flex:1, padding:'2px 5px', display:'flex', flexDirection:'column', justifyContent:'center' }}>
        {(prize || games) && (
          <div style={{ fontSize:7.5, fontWeight:900, color:BLACK, lineHeight:1.2 }}>
            {prize && <span>Premio: {prize}</span>}
            {prize && games && <span style={{ fontWeight:400, color:'rgba(0,0,0,0.6)', margin:'0 5px' }}>·</span>}
            {games && <span style={{ fontWeight:600, color:'rgba(0,0,0,0.8)' }}>{games}</span>}
          </div>
        )}
        {race.conditions && (
          <div style={{ fontSize:6.5, fontWeight:600, color:'rgba(0,0,0,0.75)', lineHeight:1.3 }}>
            {race.conditions}
          </div>
        )}
      </div>

      {/* DH brand box */}
      <div style={{
        flexShrink:0, width:72,
        display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        background:RED, padding:'3px 4px',
        printColorAdjust:'exact', WebkitPrintColorAdjust:'exact',
      } as React.CSSProperties}>
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

// ─── Compact page header (for races on page 2+) ───────────────────────────────

function CompactBrandBar({ meeting }: { meeting: MeetingData }) {
  return (
    <div style={{
      background: RED,
      display:'flex', alignItems:'center', justifyContent:'space-between',
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
      background: YELLOW,
      borderTop:`1.5px solid ${BLACK}`,
      padding:'1px 5px',
      display:'flex', alignItems:'baseline', flexWrap:'wrap', gap:'0 5px',
      printColorAdjust:'exact', WebkitPrintColorAdjust:'exact',
    } as React.CSSProperties}>
      <span style={{ fontSize:7.5, fontWeight:900, color:BLACK,
        fontFamily:'Arial Narrow,Arial,sans-serif' }}>
        Nuestros Favoritos:
      </span>
      <span style={{ fontSize:7.5, fontWeight:900, fontFamily:'monospace', color:RED }}>
        {dorsals}
      </span>
      <span style={{ fontSize:7, fontStyle:'italic', fontWeight:600, color:'#111' }}>
        {names}
      </span>
      <span style={{ fontSize:6, color:'#555', marginLeft:4 }}>· Por {tipsterName}</span>
      {picks.hasAiSource && (
        <span style={{ fontSize:5.5, color:'#666', display:'block', width:'100%', marginTop:0 }}>
          * Picks extraídos por IA · pueden contener discrepancias con la fuente oficial INH/HINAVA
        </span>
      )}
    </div>
  );
}

// ─── Ad placeholder ───────────────────────────────────────────────────────────

function AdBlock({ entryCount }: { entryCount: number }) {
  const h = adSlot(entryCount);
  if (h <= 0) return null;
  return (
    <div style={{
      height: h, margin:'2px 0',
      border:'1px dashed #ccc',
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      background: LGRAY,
    }}>
      <div style={{ fontSize:8, fontWeight:700, color:'#bbb', textTransform:'uppercase', letterSpacing:'0.1em' }}>
        Espacio Publicitario
      </div>
      <div style={{ fontSize:6.5, color:'#ccc', marginTop:1 }}>
        desafiohipico.com
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
      fontFamily: 'Arial Narrow, Arial, sans-serif',
      color: BLACK,
      background: WHITE,
      fontSize: 8,
      lineHeight: 1.2,
    }}>

      {/* ── Full page header (first page only) ── */}
      <div style={{
        background: RED,
        display:'flex', alignItems:'center', justifyContent:'space-between',
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
            textTransform:'capitalize', marginTop:1 }}>
            {meetingDateStr}
          </div>
          {config.mode !== 'public' && (
            <div style={{ fontSize:7, color:'rgba(255,224,0,0.85)', fontStyle:'italic', marginTop:1 }}>
              Cortesía de: <strong>{tipsterName}</strong>
            </div>
          )}
        </div>
      </div>

      {/* ── Races ── */}
      {races.map((race, raceIdx) => {
        const isLastRace  = raceIdx === races.length - 1;
        const entryCount  = race.entries.length;
        const mH          = maxHist(entryCount);
        const picks       = picksByRace[race.raceId];

        return (
          <div key={race.raceId} style={{
            breakAfter: isLastRace ? 'auto' : 'page',
            pageBreakAfter: isLastRace ? 'auto' : 'always',
            border:`1px solid #888`,
            marginBottom: 4,
          }}>
            {/* Compact brand bar for pages 2+ */}
            {raceIdx > 0 && <CompactBrandBar meeting={meeting} />}

            <RaceHeader race={race} trackName={meeting.trackName} />

            {/* Column header bar — ONE per race, outside horse rows */}
            <ColumnHeaderBar />

            {/* Horse entries */}
            <div>
              {race.entries.map((entry) => {
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

            {/* Favorites */}
            <FavoritesBlock raceId={race.raceId} picksByRace={picksByRace} tipsterName={tipsterName} />

            {/* Advertising slot */}
            <AdBlock entryCount={entryCount} />

            {/* Race footer */}
            <div style={{
              borderTop:`1px solid #ccc`, padding:'1px 6px',
              display:'flex', justifyContent:'space-between', alignItems:'center',
              background: LGRAY,
            }}>
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

      {/* ── Final footer ── */}
      <div style={{
        borderTop:`2px solid ${BLACK}`, marginTop:6, padding:'3px 6px',
        display:'flex', justifyContent:'space-between', alignItems:'center',
      }}>
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
