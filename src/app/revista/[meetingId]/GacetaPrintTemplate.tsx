'use client';

/**
 * GacetaPrintTemplate — Estilo Gaceta Hípica con branding Desafío Hípico
 *
 * Invisible en pantalla (hidden), visible solo al imprimir (print:block).
 *
 * Arquitectura por caballo: 4 paneles verticales (flex):
 *   Panel 1 (~5%)  : PP/Dorsal gigante — fondo cyan si es pick del tipster
 *   Panel 2 (~22%) : Datos del caballo (stud, nombre, pedigree, color, stats)
 *   Panel 3 (~10%) : Yunta — jinete, kg, implementos, entrenador
 *   Panel 4 (~63%) : Retrospecto — micro-tabla con últimas carreras
 *   [full width]   : Traqueos inline
 *
 * Densidad: hasta 14 caballos por hoja A4.
 * Si hay < 14 caballos, el espacio sobrante se llena con bloque publicitario.
 */

import React from 'react';

// ─── Brand colors ─────────────────────────────────────────────────────────────
const RED    = '#C0392B';
const YELLOW = '#FFE000';
const BLUE   = '#4169E1';
const CYAN   = '#00b4e4';
const BLACK  = '#000000';
const WHITE  = '#FFFFFF';
const LGRAY  = '#f7f7f7';

// ─── Types (mirror generateMeetingSnapshot output) ───────────────────────────

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
  return `${String(d.getUTCDate()).padStart(2, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function fmtYear(iso: string): string {
  return String(new Date(iso).getUTCFullYear()).slice(2);
}

function raceCode(h: RaceHistoryItem): string {
  const n = h.annualRaceNumber ?? h.raceNumber;
  return `${h.trackCode}${String(n).replace(/^[a-zA-Z]+/, '')}`;
}

function jockeyShort(name: string): string {
  if (!name) return '—';
  const p = name.trim().split(/\s+/);
  return p.length > 1
    ? `${p[p.length - 1]},${p[0][0]}.`
    : p[0].slice(0, 10);
}

function posDisplay(h: RaceHistoryItem): string {
  if (h.isScratched) return 'R';
  if (!h.finishPosition) return '?';
  return `${h.finishPosition}°`;
}

/** How many history rows to show based on total entries in the race */
function maxHistoryRows(entryCount: number): number {
  if (entryCount >= 13) return 3;
  if (entryCount >= 9)  return 4;
  return 5; // snapshot already caps at 4-5 upstream
}

/** Advertising slot height based on available space */
function adSlot(entryCount: number): 'xl' | 'lg' | 'md' | 'sm' | null {
  if (entryCount <= 4)  return 'xl';
  if (entryCount <= 6)  return 'lg';
  if (entryCount <= 9)  return 'md';
  if (entryCount <= 11) return 'sm';
  return null;
}

// ─── DH Logo SVG ──────────────────────────────────────────────────────────────

function DHLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block', flexShrink: 0 }}>
      <polygon points="50,4 93,27 93,73 50,96 7,73 7,27" fill={RED} stroke={BLUE} strokeWidth="5" />
      <text x="50" y="63" textAnchor="middle" fontFamily="Arial Narrow,Arial,sans-serif"
        fontWeight="900" fontSize="36" fill={YELLOW} letterSpacing="-1">DH</text>
    </svg>
  );
}

// ─── Base cell styles ─────────────────────────────────────────────────────────

const CELL: React.CSSProperties = {
  fontSize: 6.5,
  fontFamily: 'Arial Narrow, Arial, sans-serif',
  lineHeight: 1.1,
  padding: '0 1px',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  borderRight: '0.5px solid #ccc',
  verticalAlign: 'middle',
};

const CELL_H: React.CSSProperties = {
  ...CELL,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.02em',
  fontSize: 6,
  color: WHITE,
  background: BLACK,
  padding: '1px',
  textAlign: 'center',
  printColorAdjust: 'exact',
  WebkitPrintColorAdjust: 'exact',
} as React.CSSProperties;

// History column definitions
const HIST_COLS: { key: string; w: number; align?: 'center' | 'left' | 'right' }[] = [
  { key: 'Fec',     w: 22, align: 'center' },
  { key: 'Carr',    w: 20, align: 'center' },
  { key: 'Dist',    w: 16, align: 'center' },
  { key: 'PP',      w: 12, align: 'center' }, // cyan background
  { key: '800m',    w: 12, align: 'center' },
  { key: 'Lleg',    w: 12, align: 'center' },
  { key: 'Kg.Jin',  w: 14, align: 'center' },
  { key: 'Jinete',  w: 36, align: 'left'   },
  { key: 'Div',     w: 12, align: 'center' },
  { key: 'Ganador / 2°', w: 52, align: 'left' },
  { key: 'Cpos',    w: 18, align: 'center' },
  { key: 'Serie',   w: 30, align: 'left'   },
  { key: 'Rat',     w: 12, align: 'center' },
  { key: 'T.G.',    w: 22, align: 'center' },
  { key: 'T.Ej.',   w: 22, align: 'center' },
  { key: 'Cont.',   w: 0,  align: 'left'   }, // flex-grow remainder
];

// ─── History header row (rendered ONCE per race) ──────────────────────────────

function HistoryHeaderRow() {
  return (
    <tr>
      {HIST_COLS.map((col) => (
        <th key={col.key} style={{
          ...CELL_H,
          width: col.w > 0 ? col.w : undefined,
          textAlign: col.align ?? 'center',
        }}>
          {col.key}
        </th>
      ))}
    </tr>
  );
}

// ─── Single history data row ──────────────────────────────────────────────────

function HistoryRow({ h, isOdd }: { h: RaceHistoryItem; isOdd: boolean }) {
  const isWin = h.finishPosition === 1 && !h.isScratched;
  const isScr = h.isScratched;
  const bg = isOdd ? LGRAY : WHITE;

  const cpos = isWin
    ? '—'
    : (h.distanceMargin || h.diffVsFirst || '—');

  const ref = isWin
    ? (h.secondName ? h.secondName.slice(0, 18) : '—')
    : (h.winnerName ? h.winnerName.slice(0, 18) : '—');

  const serieShort = (h.conditions ?? '').slice(0, 14);

  return (
    <tr style={{ background: bg }}>
      {/* FECHA */}
      <td style={{ ...CELL, textAlign: 'center', color: '#555' }}>
        {fmtDate(h.date)}/{fmtYear(h.date)}
      </td>
      {/* CARR */}
      <td style={{ ...CELL, textAlign: 'center', fontFamily: 'monospace', fontSize: 6 }}>
        {raceCode(h)}
      </td>
      {/* DIST */}
      <td style={{ ...CELL, textAlign: 'center' }}>{h.distance}</td>
      {/* PP — cyan shaded */}
      <td style={{
        ...CELL, textAlign: 'center',
        background: `${CYAN}33`,
        fontWeight: 700,
        printColorAdjust: 'exact',
        WebkitPrintColorAdjust: 'exact',
      } as React.CSSProperties}>
        {isScr ? 'R' : h.dorsalNumber}
      </td>
      {/* 800m — no data */}
      <td style={{ ...CELL, textAlign: 'center', color: '#aaa' }}>—</td>
      {/* LLEG */}
      <td style={{
        ...CELL, textAlign: 'center',
        fontWeight: isWin ? 900 : 600,
        color: isWin ? '#7a5000' : (isScr ? '#999' : BLACK),
        textDecoration: isScr ? 'line-through' : 'none',
      }}>
        {posDisplay(h)}
      </td>
      {/* Kg.Jin — no data individual */}
      <td style={{ ...CELL, textAlign: 'center', color: '#aaa' }}>—</td>
      {/* Jinete */}
      <td style={{ ...CELL, textAlign: 'left', color: '#333' }}>
        {jockeyShort(h.jockeyName)}
      </td>
      {/* Div — no data */}
      <td style={{ ...CELL, textAlign: 'center', color: '#aaa' }}>—</td>
      {/* Ganador / 2° */}
      <td style={{
        ...CELL, textAlign: 'left',
        fontStyle: isWin ? 'normal' : 'normal',
        color: isWin ? '#7a5000' : '#222',
        overflow: 'hidden',
      }}>
        {isWin ? <span style={{ fontSize: 6, color: '#666' }}>2°: </span> : null}
        {ref}
      </td>
      {/* Cpos */}
      <td style={{ ...CELL, textAlign: 'center', color: '#555' }}>{cpos}</td>
      {/* Serie */}
      <td style={{ ...CELL, textAlign: 'left', color: '#666', fontSize: 5.5 }}>
        {serieShort}
      </td>
      {/* Rating */}
      <td style={{ ...CELL, textAlign: 'center', color: '#aaa' }}>—</td>
      {/* T.G. */}
      <td style={{
        ...CELL, textAlign: 'center', fontFamily: 'monospace', fontSize: 6,
        color: isWin ? '#7a5000' : '#555',
      }}>
        {h.winnerTime ?? '—'}
      </td>
      {/* T.Ej. */}
      <td style={{
        ...CELL, textAlign: 'center', fontFamily: 'monospace', fontSize: 6,
        fontWeight: isWin ? 900 : 400,
        color: isWin ? '#7a5000' : '#333',
      }}>
        {isWin ? (h.winnerTime ?? '—') : (h.officialTime ?? '—')}
      </td>
      {/* Cont. */}
      <td style={{ ...CELL, textAlign: 'left', color: '#888', fontSize: 5.5 }}></td>
    </tr>
  );
}

// ─── Panel 4: Retrospecto ─────────────────────────────────────────────────────

function Panel4({ entry, maxHist, showHeader }: {
  entry: EntryItem;
  maxHist: number;
  showHeader: boolean;
}) {
  const rows = entry.raceHistory.slice(0, maxHist);

  return (
    <div style={{
      flex: 1,
      minWidth: 0,
      padding: '1px 0 1px 2px',
      overflow: 'hidden',
    }}>
      {rows.length === 0 ? (
        <span style={{ fontSize: 6.5, color: '#aaa', fontStyle: 'italic' }}>Sin historial</span>
      ) : (
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          tableLayout: 'fixed',
        }}>
          {showHeader && (
            <thead><HistoryHeaderRow /></thead>
          )}
          <tbody>
            {rows.map((h, i) => (
              <HistoryRow key={i} h={h} isOdd={i % 2 === 0} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Full entry (horse) block ─────────────────────────────────────────────────

function EntryBlock({
  entry, isFirst, maxHist, isPick, pickOrder,
}: {
  entry: EntryItem;
  isFirst: boolean;
  maxHist: number;
  isPick: boolean;
  pickOrder?: number;
}) {
  const scratched = entry.isScratched;

  // Pedigree string
  const pedigree = [entry.sire, entry.dam].filter(Boolean).join(' x ');

  // Workouts inline string
  const workoutLine = entry.workouts.length > 0
    ? entry.workouts
        .slice(0, 5)
        .map(w => {
          const label: Record<string, string> = { EP: 'EP', ES: 'ES', AP: 'AP', galopo: 'Gal', trote: 'Trot' };
          const t = label[w.workoutType] ?? w.workoutType ?? '';
          return `${fmtDate(w.workoutDate)} ${t} ${w.distance}m ${w.splits}${w.comment ? ` (${w.comment})` : ''}${w.daysRest ? ` ${w.daysRest}d` : ''}`;
        })
        .join(' · ')
    : null;

  const borderTop = isFirst ? '0.5px solid #999' : '0.5px solid #bbb';

  return (
    <div style={{
      borderTop,
      breakInside: 'avoid',
      pageBreakInside: 'avoid',
      opacity: scratched ? 0.55 : 1,
    }}>
      {/* ── 4 panel flex row ── */}
      <div style={{ display: 'flex', alignItems: 'stretch', minHeight: 28 }}>

        {/* PANEL 1: PP number */}
        <div style={{
          flexShrink: 0,
          width: 28,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRight: `1.5px solid ${BLACK}`,
          background: isPick ? CYAN : WHITE,
          printColorAdjust: 'exact',
          WebkitPrintColorAdjust: 'exact',
          padding: '1px 0',
        } as React.CSSProperties}>
          <div style={{
            fontSize: 22,
            fontWeight: 900,
            fontFamily: 'Arial Black, Arial Narrow, Arial, sans-serif',
            lineHeight: 1,
            color: isPick ? WHITE : BLACK,
            textDecoration: scratched ? 'line-through' : 'none',
          }}>
            {entry.postPosition}
          </div>
          {isPick && pickOrder !== undefined && (
            <div style={{
              fontSize: 5.5,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.9)',
              letterSpacing: '0.05em',
            }}>
              FAV{pickOrder}
            </div>
          )}
          <div style={{ fontSize: 5.5, color: isPick ? 'rgba(255,255,255,0.75)' : '#888', lineHeight: 1 }}>
            #{entry.dorsalNumber}
          </div>
        </div>

        {/* PANEL 2: Datos del caballo */}
        <div style={{
          flexShrink: 0,
          width: '22%',
          borderRight: `1px solid ${BLACK}`,
          padding: '1px 3px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
        }}>
          {/* Stud */}
          {entry.studName && (
            <div style={{ fontSize: 6, color: '#666', lineHeight: 1.1, fontStyle: 'italic' }}>
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
            color: scratched ? '#999' : BLACK,
            textDecoration: scratched ? 'line-through' : 'none',
          }}>
            {entry.horseName}
            {entry.nationality && entry.nationality !== 'VEN' && (
              <span style={{ fontSize: 6, color: '#888', fontWeight: 400 }}> ({entry.nationality})</span>
            )}
          </div>
          {/* Pedigree */}
          {pedigree && (
            <div style={{ fontSize: 6, fontStyle: 'italic', color: '#555', lineHeight: 1.1 }}>
              {pedigree}
            </div>
          )}
          {/* Color / gender */}
          <div style={{ fontSize: 6, color: '#666', lineHeight: 1.1 }}>
            {[entry.color, entry.gender].filter(Boolean).join(' · ')}
          </div>
          {/* Year stats */}
          {entry.yearStats && entry.yearStats.starts > 0 && (
            <div style={{ fontSize: 6, color: '#444', lineHeight: 1.1 }}>
              2026: {entry.yearStats.starts}c · {entry.yearStats.wins}g
              {entry.yearStats.winless > 0 && ` · ${entry.yearStats.winless}sg`}
            </div>
          )}
        </div>

        {/* PANEL 3: Yunta */}
        <div style={{
          flexShrink: 0,
          width: '10%',
          borderRight: `1px solid ${BLACK}`,
          padding: '1px 2px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
        }}>
          {/* Jockey */}
          <div style={{
            fontSize: 7,
            fontWeight: 700,
            fontFamily: 'Arial Narrow, Arial, sans-serif',
            lineHeight: 1.15,
            color: BLACK,
          }}>
            {jockeyShort(entry.jockeyName)}
          </div>
          {/* Weight */}
          {entry.weightDeclared && (
            <div style={{
              fontSize: 10,
              fontWeight: 900,
              fontFamily: 'Arial Narrow, Arial, sans-serif',
              lineHeight: 1,
              color: BLACK,
            }}>
              {entry.weightDeclared}
            </div>
          )}
          {/* Medication */}
          {entry.medication && (
            <div style={{ fontSize: 6, color: BLUE, fontWeight: 700, lineHeight: 1.1 }}>
              {entry.medication}
            </div>
          )}
          {/* Implements */}
          {entry.implements && (
            <div style={{ fontSize: 6, color: '#555', lineHeight: 1.1 }}>{entry.implements}</div>
          )}
          {/* Trainer */}
          {entry.trainerName && (
            <div style={{
              fontSize: 6,
              fontWeight: 700,
              color: '#333',
              lineHeight: 1.1,
              borderTop: '0.5px dotted #ccc',
              marginTop: 1,
              paddingTop: 1,
            }}>
              {entry.trainerName.split(' ').slice(-1)[0]}
            </div>
          )}
        </div>

        {/* PANEL 4: Retrospecto */}
        <Panel4 entry={entry} maxHist={maxHist} showHeader={isFirst} />

      </div>

      {/* Workouts — full width, below panels */}
      {workoutLine && (
        <div style={{
          fontSize: 6,
          fontStyle: 'italic',
          color: '#555',
          lineHeight: 1.2,
          padding: '0 3px 1px 32px',
          borderTop: '0.5px dashed #ddd',
          background: '#fafafa',
        }}>
          <span style={{ fontWeight: 700, color: BLUE, fontSize: 5.5, marginRight: 3 }}>Traq:</span>
          {workoutLine}
        </div>
      )}
    </div>
  );
}

// ─── Race header ──────────────────────────────────────────────────────────────

function RaceHeader({ race }: { race: RaceItem }) {
  const annualLabel = race.annualRaceNumber
    ? `C${String(race.annualRaceNumber).padStart(3, '0')}`
    : null;
  const usdPrize = race.prizePool?.usd > 0
    ? `US$ ${race.prizePool.usd.toLocaleString()}`
    : race.prizePool?.bs > 0
    ? `Bs. ${race.prizePool.bs.toLocaleString('es-VE')}`
    : null;
  const games = race.games.map(g => g.replace(/_/g, ' ')).join(' · ');

  return (
    <div style={{
      display: 'flex',
      alignItems: 'stretch',
      borderBottom: `2px solid ${BLACK}`,
      borderTop: `2px solid ${BLACK}`,
      background: CYAN,
      printColorAdjust: 'exact',
      WebkitPrintColorAdjust: 'exact',
    } as React.CSSProperties}>

      {/* Race number */}
      <div style={{
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2px 6px',
        borderRight: `1.5px solid rgba(0,0,0,0.3)`,
        minWidth: 46,
      }}>
        <div style={{
          fontSize: 22,
          fontWeight: 900,
          fontFamily: 'Arial Black, Arial, sans-serif',
          lineHeight: 1,
          color: BLACK,
        }}>
          {race.raceNumber}<span style={{ fontSize: 12 }}>ª</span>
        </div>
        <div style={{ fontSize: 6.5, fontWeight: 700, color: 'rgba(0,0,0,0.65)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Carrera
        </div>
        {annualLabel && (
          <div style={{ fontSize: 6, color: 'rgba(0,0,0,0.55)', fontFamily: 'monospace' }}>{annualLabel}</div>
        )}
        {race.scheduledTime && (
          <div style={{ fontSize: 6.5, color: 'rgba(0,0,0,0.7)', fontWeight: 700 }}>{race.scheduledTime}</div>
        )}
      </div>

      {/* Distance — center, dominant */}
      <div style={{
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2px 10px',
        borderRight: `1.5px solid rgba(0,0,0,0.3)`,
      }}>
        <div style={{
          fontSize: 26,
          fontWeight: 900,
          fontFamily: 'Arial Black, Arial, sans-serif',
          lineHeight: 1,
          color: BLACK,
        }}>
          {race.distance}
        </div>
        <div style={{ fontSize: 7, fontWeight: 700, color: 'rgba(0,0,0,0.65)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          MTS
        </div>
      </div>

      {/* Conditions + prize + games */}
      <div style={{ flex: 1, padding: '2px 5px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {usdPrize && (
          <div style={{ fontSize: 8, fontWeight: 900, color: BLACK, lineHeight: 1.2 }}>
            Premio: {usdPrize}
            {games && <span style={{ fontSize: 7, fontWeight: 400, color: 'rgba(0,0,0,0.65)', marginLeft: 6 }}>{games}</span>}
          </div>
        )}
        {race.conditions && (
          <div style={{ fontSize: 6.5, color: 'rgba(0,0,0,0.75)', lineHeight: 1.3 }}>
            {race.conditions}
          </div>
        )}
      </div>

      {/* DH Logo box */}
      <div style={{
        flexShrink: 0,
        width: 72,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: RED,
        padding: '3px 4px',
        printColorAdjust: 'exact',
        WebkitPrintColorAdjust: 'exact',
      } as React.CSSProperties}>
        <DHLogo size={28} />
        <div style={{
          fontSize: 6.5,
          fontWeight: 900,
          color: YELLOW,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          textAlign: 'center',
          fontFamily: 'Arial Narrow, Arial, sans-serif',
          lineHeight: 1.1,
          marginTop: 1,
        }}>
          DESAFÍO<br />HÍPICO
        </div>
      </div>
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

  const sorted = [...picks.marks].sort((a, b) => a.preferenceOrder - b.preferenceOrder);
  const dorsals = sorted.map(m => m.dorsalNumber ?? '?').join(' - ');
  const names   = sorted.map(m => m.horseName).join(' · ');

  return (
    <div style={{
      background: YELLOW,
      borderTop: `1.5px solid ${BLACK}`,
      padding: '1px 4px',
      display: 'flex',
      alignItems: 'baseline',
      flexWrap: 'wrap',
      gap: '0 4px',
      printColorAdjust: 'exact',
      WebkitPrintColorAdjust: 'exact',
    } as React.CSSProperties}>
      <span style={{ fontSize: 7.5, fontWeight: 900, color: BLACK, fontFamily: 'Arial Narrow, Arial, sans-serif' }}>
        Nuestros Favoritos:
      </span>
      <span style={{ fontSize: 7.5, fontWeight: 900, fontFamily: 'monospace', color: RED }}>
        {dorsals}
      </span>
      <span style={{ fontSize: 7, fontStyle: 'italic', color: '#333' }}>
        {names}
      </span>
      <span style={{ fontSize: 6.5, color: '#555', marginLeft: 6 }}>
        · Por {tipsterName}
      </span>
      {picks.hasAiSource && (
        <span style={{ fontSize: 5.5, color: '#777', display: 'block', width: '100%', marginTop: 0 }}>
          * Picks extraídos por IA · pueden contener discrepancias con la fuente oficial INH/HINAVA
        </span>
      )}
    </div>
  );
}

// ─── Advertising block (fills empty space when < 14 horses) ──────────────────

function AdBlock({ entryCount }: { entryCount: number }) {
  const slot = adSlot(entryCount);
  if (!slot) return null;

  const heights: Record<string, number> = { xl: 120, lg: 80, md: 48, sm: 24 };
  const h = heights[slot];

  return (
    <div style={{
      height: h,
      border: `1px dashed #bbb`,
      margin: '2px 0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: LGRAY,
      color: '#bbb',
    }}>
      <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        Espacio Publicitario
      </div>
      <div style={{ fontSize: 7, color: '#ccc', marginTop: 2 }}>
        Publicita aquí · desafiohipico.com
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function GacetaPrintTemplate({ meeting, races, tipster, picksByRace, config }: Props) {
  const tipsterName = tipster?.name ?? config.tipsterName ?? 'Experto DH';

  const meetingDateStr = new Date(meeting.date).toLocaleDateString('es-VE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });

  return (
    <div className="hidden print:block" style={{
      fontFamily: 'Arial Narrow, Arial, sans-serif',
      color: BLACK,
      background: WHITE,
      fontSize: 8,
      lineHeight: 1.2,
    }}>

      {/* ── Page header band ── */}
      <div style={{
        background: RED,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '5px 8px',
        marginBottom: 4,
        printColorAdjust: 'exact',
        WebkitPrintColorAdjust: 'exact',
      } as React.CSSProperties}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <DHLogo size={42} />
          <div>
            <div style={{
              fontSize: 18,
              fontWeight: 900,
              color: YELLOW,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              fontFamily: 'Arial Narrow, Arial, sans-serif',
              lineHeight: 1,
            }}>
              DESAFÍO HÍPICO
            </div>
            <div style={{
              fontSize: 8,
              color: 'rgba(255,224,0,0.8)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              borderBottom: `1px solid ${BLUE}`,
              paddingBottom: 1,
              marginTop: 1,
            }}>
              Revista Americana
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: YELLOW }}>
            {meeting.trackName} · Reunión {meeting.meetingNumber}
          </div>
          <div style={{ fontSize: 7.5, color: 'rgba(255,224,0,0.75)', textTransform: 'capitalize', marginTop: 1 }}>
            {meetingDateStr}
          </div>
          {config.mode !== 'public' && (
            <div style={{ fontSize: 7, color: 'rgba(255,224,0,0.85)', fontStyle: 'italic', marginTop: 1 }}>
              Cortesía de: <strong>{tipsterName}</strong>
            </div>
          )}
        </div>
      </div>

      {/* ── Races ── */}
      {races.map((race, raceIdx) => {
        const isLastRace = raceIdx === races.length - 1;
        const entryCount = race.entries.length;
        const maxHist = maxHistoryRows(entryCount);
        const picks = picksByRace[race.raceId];

        return (
          <div key={race.raceId} style={{
            breakAfter: isLastRace ? 'auto' : 'page',
            pageBreakAfter: isLastRace ? 'auto' : 'always',
            border: `1px solid #888`,
            marginBottom: 4,
          }}>
            <RaceHeader race={race} />

            {/* Entries */}
            <div style={{ padding: '0 0 0 0' }}>
              {race.entries.map((entry, eIdx) => {
                const pickMark = picks?.marks.find(m =>
                  m.dorsalNumber === entry.dorsalNumber ||
                  m.horseName.toUpperCase().trim() === entry.horseName.toUpperCase().trim()
                );
                return (
                  <EntryBlock
                    key={entry.dorsalNumber}
                    entry={entry}
                    isFirst={eIdx === 0}
                    maxHist={maxHist}
                    isPick={!!pickMark}
                    pickOrder={pickMark?.preferenceOrder}
                  />
                );
              })}
            </div>

            {/* Favorites */}
            <FavoritesBlock
              raceId={race.raceId}
              picksByRace={picksByRace}
              tipsterName={tipsterName}
            />

            {/* Ad slot if space available */}
            <AdBlock entryCount={entryCount} />

            {/* Race footer */}
            <div style={{
              borderTop: `1px solid #ccc`,
              padding: '1px 6px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: LGRAY,
            }}>
              <span style={{ fontSize: 6, color: '#999', fontStyle: 'italic' }}>
                Datos INH/HINAVA · desafiohipico.com · Distribución gratuita
              </span>
              <span style={{ fontSize: 7, fontWeight: 900, color: RED, fontFamily: 'Arial Narrow, Arial, sans-serif' }}>
                ¡Suerte! y DESAFÍO HÍPICO
              </span>
            </div>
          </div>
        );
      })}

      {/* ── Final footer ── */}
      <div style={{
        borderTop: `2px solid ${BLACK}`,
        marginTop: 6,
        padding: '3px 6px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 6.5, color: '#888' }}>
          Generado por desafiohipico.com · Datos oficiales INH/HINAVA · Distribución gratuita
        </span>
        <span style={{ fontSize: 9, fontWeight: 900, color: RED, fontFamily: 'Arial Narrow, Arial, sans-serif', letterSpacing: '0.04em' }}>
          ¡Suerte! y DESAFÍO HÍPICO
        </span>
      </div>

    </div>
  );
}
