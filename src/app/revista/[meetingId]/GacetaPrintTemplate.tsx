'use client';

/**
 * GacetaPrintTemplate
 *
 * Renders the "Gaceta Hípica" style PDF layout.
 * Invisible on screen (hidden), shows only when printing.
 *
 * Modes:
 *   public  – favorites from a randomly selected tipster
 *   tipster – authenticated handicapper sees their own picks
 *   premium – (future) Factor de Victoria
 */

// ─── Types (mirroring generateMeetingSnapshot output) ────────────────────────

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

const CYAN = '#00b4e4';
const BLACK = '#000000';

function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getUTCDate()).padStart(2, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function raceLabel(trackCode: string, annualRaceNumber: string | null, raceNumber: number): string {
  const clean = annualRaceNumber ? String(annualRaceNumber).replace(/^[a-zA-Z]+/, '') : null;
  return clean ? `${trackCode}${clean}` : `${trackCode}${raceNumber}`;
}

function jockeyAbbr(name: string): string {
  if (!name) return '—';
  const parts = name.trim().split(/\s+/);
  return parts[0].slice(0, 10) + (parts[1] ? ` ${parts[1].slice(0, 1)}.` : '');
}

function posLabel(h: RaceHistoryItem): string {
  if (h.isScratched) return 'R';
  if (!h.finishPosition) return '?';
  return `${h.finishPosition}°`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function HistoryRow({ h }: { h: RaceHistoryItem }) {
  const isWin = h.finishPosition === 1 && !h.isScratched;
  const pos = posLabel(h);
  const ref = isWin
    ? (h.secondName ? `2° ${h.secondName.slice(0, 14)}` : '—')
    : (h.winnerName ? `1° ${h.winnerName.slice(0, 14)}` : '—');
  const diff = isWin ? '—' : (h.diffVsFirst ?? h.distanceMargin ?? '—');

  return (
    <tr style={{ borderTop: '1px solid #e0e0e0', fontSize: '7px', fontFamily: 'Arial Narrow, Arial, sans-serif' }}>
      <td style={{ paddingRight: 3, color: '#555', whiteSpace: 'nowrap' }}>{shortDate(h.date)}</td>
      <td style={{ paddingRight: 3, fontFamily: 'monospace', color: '#444' }}>
        {raceLabel(h.trackCode, h.annualRaceNumber, h.raceNumber)}
      </td>
      <td style={{ paddingRight: 3, textAlign: 'center' }}>{h.distance}</td>
      <td style={{ paddingRight: 3, textAlign: 'center' }}>{h.dorsalNumber}</td>
      {/* 800m — no data */}
      <td style={{ paddingRight: 3, textAlign: 'center', color: '#aaa' }}>—</td>
      <td style={{ paddingRight: 3, fontWeight: isWin ? 800 : 400, color: isWin ? '#b7860a' : BLACK, textAlign: 'center' }}>
        {pos}
      </td>
      <td style={{ paddingRight: 3, fontFamily: 'monospace', color: '#777' }}>{h.winnerTime ?? '—'}</td>
      <td style={{ paddingRight: 3, fontFamily: 'monospace', fontWeight: isWin ? 800 : 400, color: isWin ? '#b7860a' : BLACK }}>
        {h.officialTime ?? '—'}
      </td>
      <td style={{ paddingRight: 3, color: '#666' }}>{diff}</td>
      <td style={{ paddingRight: 3, color: '#555', fontSize: '6.5px' }}>{jockeyAbbr(h.jockeyName)}</td>
      <td style={{ color: '#555', fontSize: '6.5px', maxWidth: 80, overflow: 'hidden', whiteSpace: 'nowrap' }}>{ref}</td>
    </tr>
  );
}

function WorkoutLine({ w }: { w: WorkoutItem }) {
  const LABELS: Record<string, string> = { EP: 'EP', ES: 'ES', AP: 'AP', galopo: 'GAL' };
  return (
    <div style={{ fontSize: '6.5px', color: '#555', fontStyle: 'italic', lineHeight: 1.3 }}>
      {LABELS[w.workoutType] ?? w.workoutType} · {shortDate(w.workoutDate)} · {w.distance}m
      {w.splits ? ` — ${w.splits}` : ''}
      {w.comment ? ` (${w.comment})` : ''}
    </div>
  );
}

function EntryRow({ entry }: { entry: EntryItem }) {
  const scratched = entry.isScratched;
  const pedigree = [entry.sire, entry.dam].filter(Boolean).join(' / ');

  return (
    <div style={{
      breakInside: 'avoid',
      pageBreakInside: 'avoid',
      borderBottom: '1px solid #ccc',
      padding: '3px 0',
      opacity: scratched ? 0.55 : 1,
    }}>
      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>

        {/* PP / Dorsal — big number */}
        <div style={{ width: 22, textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 900, fontFamily: 'Arial Narrow, Arial, sans-serif', lineHeight: 1 }}>
            {entry.postPosition}
          </div>
          <div style={{ fontSize: 8, color: '#777' }}>{entry.dorsalNumber}</div>
        </div>

        {/* Centre — horse info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Name line */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'baseline' }}>
            <span style={{
              fontSize: 9,
              fontWeight: 900,
              fontFamily: 'Arial Narrow, Arial, sans-serif',
              textDecoration: scratched ? 'line-through' : 'none',
              textTransform: 'uppercase',
            }}>
              {entry.horseName}
            </span>
            {scratched && (
              <span style={{ fontSize: 7, fontWeight: 700, color: '#c00', border: '1px solid #c00', padding: '0 2px', borderRadius: 2 }}>
                RET
              </span>
            )}
            {entry.medication && (
              <span style={{ fontSize: 6.5, color: '#1d4ed8', border: '1px solid #1d4ed8', padding: '0 2px', borderRadius: 2 }}>
                {entry.medication}
              </span>
            )}
            {entry.implements && (
              <span style={{ fontSize: 6.5, color: '#555' }}>{entry.implements}</span>
            )}
          </div>

          {/* Pedigree / color / stud */}
          {(pedigree || entry.color || entry.studName) && (
            <div style={{ fontSize: 7, color: '#555', marginTop: 1 }}>
              {entry.color && <span>{entry.color} · </span>}
              {pedigree && <span style={{ fontStyle: 'italic' }}>{pedigree}</span>}
              {entry.studName && <span style={{ color: '#888' }}> · {entry.studName}</span>}
            </div>
          )}

          {/* Jockey / Trainer */}
          <div style={{ fontSize: 7, color: '#333', marginTop: 1 }}>
            <span style={{ fontWeight: 700 }}>J:</span> {entry.jockeyName || '—'}
            <span style={{ marginLeft: 6, fontWeight: 700 }}>Ent:</span> {entry.trainerName || '—'}
            {entry.yearStats && entry.yearStats.starts > 0 && (
              <span style={{ marginLeft: 8, color: '#666' }}>
                2026: {entry.yearStats.starts}-{entry.yearStats.wins}
                {entry.yearStats.winless > 0 && ` (${entry.yearStats.winless})`}
              </span>
            )}
          </div>

          {/* Race history table */}
          {entry.raceHistory.length > 0 && (
            <div style={{ marginTop: 3 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ fontSize: '6px', color: '#999', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ textAlign: 'left', paddingRight: 3 }}>Fecha</th>
                    <th style={{ textAlign: 'left', paddingRight: 3 }}>Carr</th>
                    <th style={{ textAlign: 'center', paddingRight: 3 }}>Dist</th>
                    <th style={{ textAlign: 'center', paddingRight: 3 }}>PP</th>
                    <th style={{ textAlign: 'center', paddingRight: 3 }}>800m</th>
                    <th style={{ textAlign: 'center', paddingRight: 3 }}>Lleg</th>
                    <th style={{ textAlign: 'left', paddingRight: 3 }}>T.G.</th>
                    <th style={{ textAlign: 'left', paddingRight: 3 }}>T.Ej</th>
                    <th style={{ textAlign: 'left', paddingRight: 3 }}>Cpos</th>
                    <th style={{ textAlign: 'left', paddingRight: 3 }}>Jin</th>
                    <th style={{ textAlign: 'left' }}>Gan/2°</th>
                  </tr>
                </thead>
                <tbody>
                  {entry.raceHistory.map((h, i) => <HistoryRow key={i} h={h} />)}
                </tbody>
              </table>
            </div>
          )}

          {/* Workouts */}
          {entry.workouts.length > 0 && (
            <div style={{ marginTop: 2, paddingLeft: 4, borderLeft: '2px solid #d0e8ff' }}>
              {entry.workouts.map((w, i) => <WorkoutLine key={i} w={w} />)}
            </div>
          )}
        </div>

        {/* Right — weight */}
        <div style={{ flexShrink: 0, textAlign: 'right', minWidth: 32 }}>
          <div style={{ fontSize: 12, fontWeight: 900, fontFamily: 'Arial Narrow, Arial, sans-serif' }}>
            {entry.weightDeclared || '—'}
          </div>
          <div style={{ fontSize: 6.5, color: '#888' }}>kg</div>
        </div>
      </div>
    </div>
  );
}

function FavoritesBlock({
  raceId,
  picksByRace,
  tipsterName,
}: {
  raceId: string;
  picksByRace: Record<string, PicksForRace>;
  tipsterName: string;
}) {
  const picks = picksByRace[raceId];
  if (!picks || picks.marks.length === 0) return null;

  const sorted = [...picks.marks].sort((a, b) => a.preferenceOrder - b.preferenceOrder);
  const dorsals = sorted.map(m => m.dorsalNumber ?? '?').join(' - ');
  const names = sorted.map(m => m.horseName).join(' — ');

  return (
    <div style={{
      marginTop: 4,
      padding: '4px 6px',
      border: '1px solid #555',
      borderRadius: 2,
      background: '#f8f8f8',
      breakInside: 'avoid',
      pageBreakInside: 'avoid',
    }}>
      <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
        Favoritos de {tipsterName}: <span style={{ letterSpacing: 0, fontFamily: 'monospace' }}>{dorsals}</span>
      </div>
      <div style={{ fontSize: 8, fontWeight: 700, fontStyle: 'italic' }}>{names}</div>
      {picks.hasAiSource && (
        <div style={{ fontSize: 6, color: '#888', marginTop: 2 }}>
          * Picks extraídos automáticamente por IA. Pueden contener discrepancias con la fuente original (INH/HINAVA).
        </div>
      )}
    </div>
  );
}

function RaceSection({
  race,
  meeting,
  tipsterName,
  picksByRace,
  isLast,
}: {
  race: RaceItem;
  meeting: MeetingData;
  tipsterName: string;
  picksByRace: Record<string, PicksForRace>;
  isLast: boolean;
}) {
  const annualLabel = race.annualRaceNumber
    ? `${meeting.trackCode}${String(race.annualRaceNumber).padStart(3, '0')}`
    : null;

  const games = race.games.map(g => g.replace(/_/g, ' ')).join(' · ');

  return (
    <div style={{ breakAfter: isLast ? 'auto' : 'page', pageBreakAfter: isLast ? 'auto' : 'always' }}>

      {/* ── Cyan race header ── */}
      <div style={{
        background: CYAN,
        color: BLACK,
        padding: '4px 8px',
        printColorAdjust: 'exact',
        WebkitPrintColorAdjust: 'exact',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 8,
        marginBottom: 0,
      }}>
        {/* Left — race identity */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 900, fontFamily: 'Arial Narrow, Arial, sans-serif' }}>
              {race.raceNumber}ª CARRERA
            </span>
            {annualLabel && (
              <span style={{ fontSize: 9, fontWeight: 700 }}>· {annualLabel}</span>
            )}
            {race.scheduledTime && (
              <span style={{ fontSize: 9 }}>· {race.scheduledTime}</span>
            )}
          </div>
          {(race.prizePool.bs > 0 || race.prizePool.usd > 0) && (
            <div style={{ fontSize: 8, fontWeight: 700, marginTop: 1 }}>
              Premio:{' '}
              {race.prizePool.usd > 0 && `US$ ${race.prizePool.usd.toLocaleString()}`}
              {race.prizePool.bs > 0 && race.prizePool.usd > 0 && ' / '}
              {race.prizePool.bs > 0 && `Bs. ${race.prizePool.bs.toLocaleString('es-VE')}`}
            </div>
          )}
          {race.conditions && (
            <div style={{ fontSize: 7, marginTop: 1 }}>{race.conditions}</div>
          )}
        </div>

        {/* Right — distance + games */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 900, fontFamily: 'Arial Narrow, Arial, sans-serif' }}>
            {race.distance} MTS
          </div>
          {games && (
            <div style={{ fontSize: 7, fontWeight: 700, marginTop: 1 }}>{games}</div>
          )}
        </div>
      </div>

      {/* ── Column headers ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '22px 1fr 38px',
        fontSize: 6.5,
        fontWeight: 700,
        textTransform: 'uppercase',
        color: '#777',
        letterSpacing: '0.05em',
        padding: '2px 0',
        borderBottom: '1px solid #333',
        marginBottom: 1,
      }}>
        <span style={{ textAlign: 'center' }}>PP</span>
        <span>Ejemplar</span>
        <span style={{ textAlign: 'right' }}>Kg</span>
      </div>

      {/* ── Entries ── */}
      <div>
        {race.entries.map(entry => (
          <EntryRow key={entry.dorsalNumber} entry={entry} />
        ))}
      </div>

      {/* ── Favorites block ── */}
      <FavoritesBlock
        raceId={race.raceId}
        picksByRace={picksByRace}
        tipsterName={tipsterName}
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function GacetaPrintTemplate({ meeting, races, tipster, picksByRace, config }: Props) {
  const brandName = config.brandName ?? 'Desafío Hípico';
  const brandUrl = config.brandUrl ?? 'desafiohipico.com';
  const tipsterName = tipster?.name ?? config.tipsterName ?? 'Experto';

  const meetingDate = new Date(meeting.date).toLocaleDateString('es-VE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });

  return (
    <div className="hidden print:block" style={{ fontFamily: 'Arial Narrow, Arial, sans-serif', color: BLACK, background: '#fff', position: 'relative' }}>

      {/* Watermark — diagonal, very faint */}
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
      }}>
        <div style={{
          transform: 'rotate(-35deg)',
          fontSize: 48,
          fontWeight: 900,
          color: 'rgba(0,0,0,0.04)',
          whiteSpace: 'nowrap',
          userSelect: 'none',
          letterSpacing: 4,
          textTransform: 'uppercase',
        }}>
          {brandUrl} · {brandUrl} · {brandUrl}
        </div>
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* ── Page header ── */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          borderBottom: '2px solid #000',
          paddingBottom: 4,
          marginBottom: 6,
        }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: -0.5, textTransform: 'uppercase' }}>
              Revista Hípica Digital
            </div>
            <div style={{ fontSize: 9, color: '#555', marginTop: 1, textTransform: 'capitalize' }}>
              {meeting.trackName} · Reunión {meeting.meetingNumber} · {meetingDate}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#b7860a' }}>{brandUrl}</div>
            <div style={{ fontSize: 8, color: '#888' }}>Datos oficiales INH/HINAVA</div>
            {config.mode === 'tipster' && (
              <div style={{ fontSize: 8, color: '#555', fontStyle: 'italic', marginTop: 2 }}>
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

        {/* ── Footer ── */}
        <div style={{
          borderTop: '1px solid #ccc',
          marginTop: 12,
          paddingTop: 6,
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 8,
          color: '#aaa',
        }}>
          <span>Generado por {brandName} · {brandUrl} · Datos oficiales INH/HINAVA</span>
          <span>Distribución gratuita · {new Date().toLocaleDateString('es-VE')}</span>
        </div>
      </div>
    </div>
  );
}
