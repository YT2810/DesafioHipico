'use client';

/**
 * GacetaPrintTemplate — Revista Americana format
 *
 * Invisible on screen (hidden print:block), shows only when printing.
 * Replicates the American racing-form (Daily Racing Form) dense format
 * with Desafío Hípico branding: red / yellow / blue.
 */

// ─── Brand ────────────────────────────────────────────────────────────────────
const RED    = '#C0392B';
const YELLOW = '#FFE000';
const BLUE   = '#4169E1';
const BLACK  = '#000000';
const WHITE  = '#FFFFFF';
const LGRAY  = '#f5f5f5';
const DGRAY  = '#555555';

// ─── Types (mirror generateMeetingSnapshot output) ───────────────────────────

interface RaceHistoryItem {
  date: string;
  annualRaceNumber: string | null;
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getUTCDate()).padStart(2, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function shortYear(iso: string): string {
  const d = new Date(iso);
  return String(d.getUTCFullYear()).slice(2);
}

function trackRace(h: RaceHistoryItem): string {
  const n = h.annualRaceNumber ? String(h.annualRaceNumber).replace(/^[a-zA-Z]+/, '') : String(h.raceNumber);
  return `${h.trackCode}${n}`;
}

function posLabel(h: RaceHistoryItem): string {
  if (h.isScratched) return 'R';
  if (!h.finishPosition) return '?';
  return String(h.finishPosition);
}

function jAbbr(name: string, maxLen = 12): string {
  if (!name) return '—';
  const parts = name.trim().split(/\s+/);
  const abbr = parts.length > 1
    ? `${parts[parts.length - 1]}, ${parts[0].slice(0, 1)}.`
    : parts[0];
  return abbr.slice(0, maxLen);
}

// ─── DH Logo (inline SVG) ────────────────────────────────────────────────────

function DHLogo({ size = 32 }: { size?: number }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" style={{ display: 'block' }}>
      {/* Hexagon */}
      <polygon
        points="50,4 93,27 93,73 50,96 7,73 7,27"
        fill={RED} stroke={BLUE} strokeWidth="6"
      />
      {/* DH text */}
      <text
        x="50" y="62"
        textAnchor="middle"
        fontFamily="Arial Narrow, Arial, sans-serif"
        fontWeight="900"
        fontSize="38"
        fill={YELLOW}
        letterSpacing="-1"
      >DH</text>
    </svg>
  );
}

// ─── History columns header (rendered ONCE per race) ─────────────────────────

const COL_STYLE: React.CSSProperties = {
  fontSize: 6.5,
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.03em',
  color: WHITE,
  background: BLACK,
  padding: '1px 2px',
  whiteSpace: 'nowrap' as const,
  textAlign: 'center' as const,
  borderRight: `1px solid ${DGRAY}`,
};

function HistoryHeader() {
  return (
    <tr>
      <th style={{ ...COL_STYLE, textAlign: 'left', width: 26 }}>Fec</th>
      <th style={{ ...COL_STYLE, width: 32 }}>Carr</th>
      <th style={{ ...COL_STYLE, width: 28 }}>Dist</th>
      <th style={{ ...COL_STYLE, width: 18 }}>PP</th>
      <th style={{ ...COL_STYLE, width: 18 }}>800m</th>
      <th style={{ ...COL_STYLE, width: 18 }}>Lleg</th>
      <th style={{ ...COL_STYLE, width: 34 }}>T.G.</th>
      <th style={{ ...COL_STYLE, width: 34 }}>T.Ej.</th>
      <th style={{ ...COL_STYLE, width: 22 }}>Cpos</th>
      <th style={{ ...COL_STYLE, width: 60 }}>Jinete</th>
      <th style={{ ...COL_STYLE }}>Ganador / 2°</th>
    </tr>
  );
}

// ─── Single history data row ──────────────────────────────────────────────────

const CELL: React.CSSProperties = {
  fontSize: 7,
  fontFamily: 'Arial Narrow, Arial, sans-serif',
  padding: '0 2px',
  borderRight: `1px solid #ddd`,
  whiteSpace: 'nowrap' as const,
  lineHeight: '1.15',
};

function HistoryDataRow({ h, isOdd }: { h: RaceHistoryItem; isOdd: boolean }) {
  const isWin = h.finishPosition === 1 && !h.isScratched;
  const pos = posLabel(h);
  const reference = isWin
    ? (h.secondName ? h.secondName.slice(0, 18) : '—')
    : (h.winnerName ? h.winnerName.slice(0, 18) : '—');
  const diff = isWin ? '—' : (h.diffVsFirst ?? h.distanceMargin ?? '—');

  return (
    <tr style={{ background: isOdd ? LGRAY : WHITE }}>
      <td style={{ ...CELL, color: DGRAY }}>{shortDate(h.date)}/{shortYear(h.date)}</td>
      <td style={{ ...CELL, textAlign: 'center', fontFamily: 'monospace', fontSize: 6.5 }}>{trackRace(h)}</td>
      <td style={{ ...CELL, textAlign: 'center' }}>{h.distance}</td>
      <td style={{ ...CELL, textAlign: 'center', color: DGRAY }}>{h.dorsalNumber}</td>
      <td style={{ ...CELL, textAlign: 'center', color: '#aaa' }}>—</td>
      <td style={{
        ...CELL, textAlign: 'center',
        fontWeight: isWin ? 900 : 400,
        color: isWin ? '#8a6000' : BLACK,
      }}>{pos}{h.isScratched ? '' : '°'}</td>
      <td style={{ ...CELL, fontFamily: 'monospace', fontSize: 6.5, color: DGRAY }}>{h.winnerTime ?? '—'}</td>
      <td style={{
        ...CELL, fontFamily: 'monospace', fontSize: 6.5,
        fontWeight: isWin ? 900 : 400,
        color: isWin ? '#8a6000' : BLACK,
      }}>{h.officialTime ?? '—'}</td>
      <td style={{ ...CELL, textAlign: 'center' }}>{diff}</td>
      <td style={{ ...CELL, fontSize: 6.5, color: DGRAY }}>{jAbbr(h.jockeyName)}</td>
      <td style={{ ...CELL, fontSize: 6.5 }}>{reference}</td>
    </tr>
  );
}

// ─── Single entry (horse) row ─────────────────────────────────────────────────

function EntryRow({ entry, isFirst }: { entry: EntryItem; isFirst: boolean }) {
  const scratched = entry.isScratched;
  const pedigree = [entry.sire, entry.dam].filter(Boolean).join(' / ');

  // Workouts — all inline in one string
  const workoutLine = entry.workouts.length > 0
    ? entry.workouts.map(w => {
        const label: Record<string, string> = { EP: 'EP', ES: 'ES', AP: 'AP', galopo: 'Gal' };
        return `${shortDate(w.workoutDate)} ${label[w.workoutType] ?? w.workoutType} ${w.distance}m ${w.splits}${w.comment ? ` (${w.comment})` : ''}`;
      }).join(' · ')
    : null;

  return (
    <div style={{
      breakInside: 'avoid',
      pageBreakInside: 'avoid',
      borderTop: isFirst ? 'none' : `1px solid #bbb`,
      marginTop: isFirst ? 0 : 2,
      paddingTop: isFirst ? 0 : 2,
      opacity: scratched ? 0.55 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>

        {/* ── PP / Dorsal column ── */}
        <div style={{
          flexShrink: 0,
          width: 34,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingTop: 1,
          borderRight: `2px solid ${BLACK}`,
          paddingRight: 2,
          marginRight: 5,
        }}>
          <div style={{
            fontSize: 28,
            fontWeight: 900,
            fontFamily: 'Arial Black, Arial Narrow, Arial, sans-serif',
            lineHeight: 1,
            color: scratched ? '#999' : BLACK,
            textDecoration: scratched ? 'line-through' : 'none',
          }}>
            {entry.postPosition}
          </div>
          <div style={{ fontSize: 7, color: '#888', marginTop: 1 }}>#{entry.dorsalNumber}</div>
        </div>

        {/* ── Horse info + history ── */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Name line */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 10,
              fontWeight: 900,
              fontFamily: 'Arial Narrow, Arial, sans-serif',
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
              textDecoration: scratched ? 'line-through' : 'none',
            }}>
              {entry.horseName}
            </span>
            {scratched && (
              <span style={{ fontSize: 7, fontWeight: 700, color: '#c00', border: '1px solid #c00', padding: '0 2px', borderRadius: 2 }}>RET</span>
            )}
            {entry.medication && (
              <span style={{ fontSize: 6.5, color: BLUE, fontWeight: 700, border: `1px solid ${BLUE}`, padding: '0 2px', borderRadius: 2 }}>{entry.medication}</span>
            )}
            {entry.implements && (
              <span style={{ fontSize: 6.5, color: DGRAY }}>{entry.implements}</span>
            )}
            {entry.yearStats && entry.yearStats.starts > 0 && (
              <span style={{ fontSize: 6.5, color: '#888', marginLeft: 4 }}>
                2026: {entry.yearStats.starts}c-{entry.yearStats.wins}g
              </span>
            )}
          </div>

          {/* Pedigree / color / stud */}
          <div style={{ fontSize: 7, color: DGRAY, lineHeight: 1.2, marginTop: 0 }}>
            {entry.color && <span>{entry.color} · </span>}
            {pedigree && <span style={{ fontStyle: 'italic' }}>{pedigree}</span>}
            {entry.studName && <span style={{ color: '#888' }}> · {entry.studName}</span>}
          </div>

          {/* Jockey / Trainer / Weight */}
          <div style={{ fontSize: 7, color: '#333', lineHeight: 1.2 }}>
            <span style={{ fontWeight: 700 }}>{entry.jockeyName || '—'}</span>
            {entry.weightDeclared && <span style={{ color: DGRAY }}> · {entry.weightDeclared} kg</span>}
            {entry.trainerName && <span style={{ color: '#666' }}> · Ent: {entry.trainerName}</span>}
          </div>

          {/* History table — no thead here, shared thead is above first horse */}
          {entry.raceHistory.length > 0 && (
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              marginTop: 1,
              tableLayout: 'fixed',
            }}>
              {isFirst && (
                <thead>
                  <HistoryHeader />
                </thead>
              )}
              <tbody>
                {entry.raceHistory.map((h, i) => (
                  <HistoryDataRow key={i} h={h} isOdd={i % 2 === 0} />
                ))}
              </tbody>
            </table>
          )}

          {/* Workouts — all inline */}
          {workoutLine && (
            <div style={{
              fontSize: 6.5,
              fontStyle: 'italic',
              color: '#666',
              lineHeight: 1.2,
              marginTop: 1,
              borderLeft: `2px solid ${BLUE}`,
              paddingLeft: 3,
            }}>
              {workoutLine}
            </div>
          )}
        </div>

        {/* ── Odds column (right edge) ── */}
        <div style={{ flexShrink: 0, width: 26, textAlign: 'center', paddingLeft: 2, borderLeft: `1px solid #ccc` }}>
          <div style={{ fontSize: 9, fontWeight: 900, fontFamily: 'Arial Narrow, Arial, sans-serif', color: BLACK }}>
            {entry.weightDeclared || '—'}
          </div>
          <div style={{ fontSize: 6, color: '#999' }}>kg</div>
        </div>
      </div>
    </div>
  );
}

// ─── Favorites block ──────────────────────────────────────────────────────────

function FavoritesBlock({
  raceId, picksByRace, tipsterName,
}: {
  raceId: string;
  picksByRace: Record<string, PicksForRace>;
  tipsterName: string;
}) {
  const picks = picksByRace[raceId];
  if (!picks || picks.marks.length === 0) return null;

  const sorted = [...picks.marks].sort((a, b) => a.preferenceOrder - b.preferenceOrder);
  const dorsals = sorted.map(m => m.dorsalNumber ?? '?').join(' - ');
  const names = sorted.map(m => m.horseName).join(' · ');

  return (
    <div style={{
      marginTop: 3,
      padding: '2px 6px',
      background: YELLOW,
      borderTop: `1.5px solid ${BLACK}`,
      breakInside: 'avoid',
    }}>
      <span style={{ fontSize: 7.5, fontWeight: 900, fontFamily: 'Arial Narrow, Arial, sans-serif', color: BLACK }}>
        Favoritos de {tipsterName}:
      </span>{' '}
      <span style={{ fontSize: 7.5, fontFamily: 'monospace', fontWeight: 700, color: RED }}>{dorsals}</span>
      {' — '}
      <span style={{ fontSize: 7.5, fontStyle: 'italic', color: BLACK }}>{names}</span>
      {picks.hasAiSource && (
        <span style={{ fontSize: 6, color: '#666', display: 'block', marginTop: 1 }}>
          * Picks por IA · pueden contener discrepancias con la fuente oficial (INH/HINAVA)
        </span>
      )}
    </div>
  );
}

// ─── Race section ─────────────────────────────────────────────────────────────

function RaceSection({
  race, meeting, tipsterName, picksByRace, isLast,
}: {
  race: RaceItem;
  meeting: MeetingData;
  tipsterName: string;
  picksByRace: Record<string, PicksForRace>;
  isLast: boolean;
}) {
  const annualLabel = race.annualRaceNumber
    ? `C${String(race.annualRaceNumber).padStart(3, '0')}`
    : null;
  const prize = race.prizePool.usd > 0
    ? `Purse: US$ ${race.prizePool.usd.toLocaleString()}`
    : race.prizePool.bs > 0
    ? `Premio: Bs. ${race.prizePool.bs.toLocaleString('es-VE')}`
    : '';
  const games = race.games.map(g => g.replace(/_/g, ' ')).join(' · ');

  return (
    <div style={{
      breakAfter: isLast ? 'auto' : 'page',
      pageBreakAfter: isLast ? 'auto' : 'always',
      border: `1px solid #999`,
      marginBottom: 4,
    }}>

      {/* ── Race header ── */}
      <div style={{
        display: 'flex',
        alignItems: 'stretch',
        borderBottom: `2px solid ${BLACK}`,
      }}>
        {/* Left — race identity */}
        <div style={{
          flex: 1,
          padding: '3px 6px',
          borderRight: `1px solid #bbb`,
        }}>
          {/* Race number */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{
              fontSize: 16,
              fontWeight: 900,
              fontFamily: 'Arial Black, Arial, sans-serif',
              color: BLACK,
              lineHeight: 1,
            }}>
              {race.raceNumber}
              <span style={{ fontSize: 10 }}>ª</span>
            </span>
            <span style={{ fontSize: 8, fontWeight: 700, color: DGRAY }}>CARRERA</span>
            {annualLabel && (
              <span style={{ fontSize: 8, color: '#888', fontFamily: 'monospace' }}>· {annualLabel}</span>
            )}
          </div>
          {/* Prize + games */}
          {(prize || games) && (
            <div style={{ fontSize: 7.5, fontWeight: 700, color: BLACK, marginTop: 1 }}>
              {prize}
              {prize && games ? ' · ' : ''}
              {games && <span style={{ color: RED }}>{games}</span>}
            </div>
          )}
          {/* Conditions */}
          {race.conditions && (
            <div style={{ fontSize: 7, color: DGRAY, marginTop: 1, lineHeight: 1.3 }}>
              {race.conditions}
            </div>
          )}
        </div>

        {/* Center — distance (big) */}
        <div style={{
          flexShrink: 0,
          width: 80,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2px 4px',
          borderRight: `1px solid #bbb`,
        }}>
          <div style={{
            fontSize: 28,
            fontWeight: 900,
            fontFamily: 'Arial Black, Arial, sans-serif',
            lineHeight: 1,
            color: BLACK,
          }}>
            {race.distance}
          </div>
          <div style={{ fontSize: 7, fontWeight: 700, color: DGRAY, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            metros
          </div>
          {race.scheduledTime && (
            <div style={{ fontSize: 7.5, color: DGRAY, marginTop: 2 }}>{race.scheduledTime}</div>
          )}
        </div>

        {/* Right — DH logo + placeholder stats */}
        <div style={{
          flexShrink: 0,
          width: 110,
          background: RED,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '3px 4px',
          printColorAdjust: 'exact',
          WebkitPrintColorAdjust: 'exact',
        } as React.CSSProperties}>
          <DHLogo size={30} />
          <div style={{
            fontSize: 7.5,
            fontWeight: 900,
            color: YELLOW,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            marginTop: 2,
            textAlign: 'center',
            fontFamily: 'Arial Narrow, Arial, sans-serif',
          }}>
            DESAFÍO HÍPICO
          </div>
          <div style={{ fontSize: 6, color: 'rgba(255,224,0,0.7)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Revista Americana
          </div>
        </div>
      </div>

      {/* ── Entries ── */}
      <div style={{ padding: '2px 4px' }}>
        {race.entries.map((entry, idx) => (
          <EntryRow key={entry.dorsalNumber} entry={entry} isFirst={idx === 0} />
        ))}
      </div>

      {/* ── Favorites ── */}
      <FavoritesBlock raceId={race.raceId} picksByRace={picksByRace} tipsterName={tipsterName} />

      {/* ── Race footer brand ── */}
      <div style={{
        borderTop: `1px solid #ccc`,
        padding: '1px 6px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: LGRAY,
      }}>
        <span style={{ fontSize: 6.5, color: '#888', fontStyle: 'italic' }}>
          Datos oficiales INH/HINAVA · desafiohipico.com
        </span>
        <span style={{ fontSize: 6.5, fontWeight: 700, color: RED, fontFamily: 'Arial Narrow, Arial, sans-serif' }}>
          ¡Suerte! y DESAFÍO HÍPICO
        </span>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function GacetaPrintTemplate({ meeting, races, tipster, picksByRace, config }: Props) {
  const tipsterName = tipster?.name ?? config.tipsterName ?? 'Experto';

  const meetingDate = new Date(meeting.date).toLocaleDateString('es-VE', {
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

      {/* ── Page header — red band ── */}
      <div style={{
        background: RED,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 10px',
        marginBottom: 6,
        printColorAdjust: 'exact',
        WebkitPrintColorAdjust: 'exact',
      } as React.CSSProperties}>
        {/* Left — logo + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <DHLogo size={44} />
          <div>
            <div style={{
              fontSize: 20,
              fontWeight: 900,
              color: YELLOW,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              fontFamily: 'Arial Narrow, Arial, sans-serif',
              lineHeight: 1,
            }}>
              DESAFÍO HÍPICO
            </div>
            <div style={{
              fontSize: 9,
              color: 'rgba(255,224,0,0.8)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              borderBottom: `1px solid ${BLUE}`,
              paddingBottom: 1,
              marginTop: 2,
            }}>
              Revista Americana
            </div>
          </div>
        </div>

        {/* Right — meeting info */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: YELLOW }}>
            {meeting.trackName} · Reunión {meeting.meetingNumber}
          </div>
          <div style={{ fontSize: 8, color: 'rgba(255,224,0,0.75)', textTransform: 'capitalize', marginTop: 1 }}>
            {meetingDate}
          </div>
          {config.mode === 'tipster' && (
            <div style={{ fontSize: 8, color: 'rgba(255,224,0,0.85)', fontStyle: 'italic', marginTop: 2 }}>
              Cortesía de: <strong>{tipsterName}</strong>
            </div>
          )}
        </div>
      </div>

      {/* ── Race sections ── */}
      {races.map((race, idx) => (
        <RaceSection
          key={race.raceId}
          race={race}
          meeting={meeting}
          tipsterName={tipsterName}
          picksByRace={picksByRace}
          isLast={idx === races.length - 1}
        />
      ))}

      {/* ── Final footer ── */}
      <div style={{
        borderTop: `2px solid ${BLACK}`,
        marginTop: 8,
        padding: '4px 6px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 7, color: '#888' }}>
          Generado por desafiohipico.com · Datos oficiales INH/HINAVA · Distribución gratuita
        </span>
        <span style={{
          fontSize: 9,
          fontWeight: 900,
          color: RED,
          fontFamily: 'Arial Narrow, Arial, sans-serif',
          letterSpacing: '0.05em',
        }}>
          ¡Suerte! y DESAFÍO HÍPICO
        </span>
      </div>
    </div>
  );
}
