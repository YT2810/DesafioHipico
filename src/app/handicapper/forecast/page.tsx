'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FORECAST_LABELS, ForecastLabel, FIJO_BONUS_POINTS } from '@/lib/constants';

const GOLD = '#D4AF37';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MeetingOption {
  id: string;
  meetingNumber: number;
  date: string;
  trackName: string;
}

interface RaceOption {
  id: string;
  raceNumber: number;
  distance: number;
  scheduledTime: string;
}

interface EntryOption {
  entryId: string;
  dorsal: number;
  horseName: string;
  jockeyName: string;
}

interface MarkForm {
  preferenceOrder: number;
  entryId: string;
  horseName: string;
  dorsalNumber: number;
  label: ForecastLabel | '';
  note: string;
}

const EMPTY_MARK = (order: number): MarkForm => ({
  preferenceOrder: order,
  entryId: '',
  horseName: '',
  dorsalNumber: 0,
  label: '',
  note: '',
});

const LABEL_CFG: Record<string, { color: string; border: string; emoji: string }> = {
  '':               { color: 'text-gray-500',   border: 'border-gray-700',   emoji: '' },
  'Línea':          { color: 'text-gray-300',   border: 'border-gray-600',   emoji: '📌' },
  'Casi Fijo':      { color: 'text-blue-300',   border: 'border-blue-700',   emoji: '🔵' },
  'Súper Especial': { color: 'text-yellow-300', border: 'border-yellow-600', emoji: '⭐' },
  'Buen Dividendo': { color: 'text-green-300',  border: 'border-green-700',  emoji: '💰' },
  'Batacazo':       { color: 'text-orange-300', border: 'border-orange-600', emoji: '🔥' },
};

const POINTS_BY_ORDER: Record<number, number> = { 1: 5, 2: 3, 3: 2, 4: 1, 5: 1 };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HandicapperForecastPage() {
  const [meetings, setMeetings] = useState<MeetingOption[]>([]);
  const [races, setRaces] = useState<RaceOption[]>([]);
  const [entries, setEntries] = useState<EntryOption[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState('');
  const [selectedRaceId, setSelectedRaceId] = useState('');
  const [marks, setMarks] = useState<MarkForm[]>([]);
  const [sortMode, setSortMode] = useState<'preference' | 'dorsal'>('preference');
  const [isVip, setIsVip] = useState(false);
  const [publish, setPublish] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMeetings, setLoadingMeetings] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [myForecasts, setMyForecasts] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/meetings/upcoming?limit=10')
      .then(r => r.json())
      .then(d => setMeetings(d.meetings ?? []))
      .catch(() => {})
      .finally(() => setLoadingMeetings(false));
  }, []);

  useEffect(() => {
    if (!selectedMeetingId) { setRaces([]); setSelectedRaceId(''); setEntries([]); return; }
    fetch(`/api/meetings/${selectedMeetingId}/races`)
      .then(r => r.json())
      .then(d => { setRaces(d.races ?? []); setSelectedRaceId(''); setEntries([]); setMarks([]); })
      .catch(() => {});
  }, [selectedMeetingId]);

  useEffect(() => {
    if (!selectedRaceId) { setEntries([]); setMarks([]); return; }
    setLoadingEntries(true);
    fetch(`/api/races/${selectedRaceId}/entries`)
      .then(r => r.json())
      .then(d => { setEntries(d.entries ?? []); setMarks([]); })
      .catch(() => {})
      .finally(() => setLoadingEntries(false));
  }, [selectedRaceId]);

  useEffect(() => {
    if (!selectedMeetingId) { setMyForecasts([]); return; }
    fetch(`/api/handicapper/forecast?meetingId=${selectedMeetingId}`)
      .then(r => r.json())
      .then(d => setMyForecasts(d.forecasts ?? []))
      .catch(() => {});
  }, [selectedMeetingId, success]);

  const selectedEntryIds = marks.map(m => m.entryId).filter(Boolean);

  function toggleEntry(entry: EntryOption) {
    const alreadyIdx = marks.findIndex(m => m.entryId === entry.entryId);
    if (alreadyIdx >= 0) {
      setMarks(prev => prev.filter((_, i) => i !== alreadyIdx).map((m, i) => ({ ...m, preferenceOrder: i + 1 })));
      return;
    }
    if (marks.length >= 5) return;
    setMarks(prev => [...prev, {
      preferenceOrder: prev.length + 1,
      entryId: entry.entryId,
      horseName: entry.horseName,
      dorsalNumber: entry.dorsal,
      label: '',
      note: '',
    }]);
  }

  function updateMarkLabel(idx: number, label: ForecastLabel | '') {
    setMarks(prev => prev.map((m, i) => i === idx ? { ...m, label } : m));
  }

  function updateMarkNote(idx: number, note: string) {
    setMarks(prev => prev.map((m, i) => i === idx ? { ...m, note } : m));
  }

  function removeMark(idx: number) {
    setMarks(prev => prev.filter((_, i) => i !== idx).map((m, i) => ({ ...m, preferenceOrder: i + 1 })));
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    setMarks(prev => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next.map((m, i) => ({ ...m, preferenceOrder: i + 1 }));
    });
  }

  function moveDown(idx: number) {
    setMarks(prev => {
      if (idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next.map((m, i) => ({ ...m, preferenceOrder: i + 1 }));
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedMeetingId || !selectedRaceId) {
      setError('Selecciona una reunión y una carrera.');
      return;
    }
    if (marks.length === 0) {
      setError('Selecciona al menos un ejemplar.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/handicapper/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId: selectedMeetingId,
          raceId: selectedRaceId,
          marks: marks.map(m => ({
            preferenceOrder: m.preferenceOrder,
            horseName: m.horseName,
            dorsalNumber: m.dorsalNumber || undefined,
            label: m.label,
            note: m.note.trim() || undefined,
          })),
          isVip,
          source: 'manual',
          publish,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al guardar.');

      setSuccess(
        data.isUpdate
          ? `✅ Pronóstico actualizado${data.notified > 0 ? ` · ${data.notified} seguidores notificados` : ''}`
          : `✅ Pronóstico guardado${publish ? (data.notified > 0 ? ` · ${data.notified} seguidores notificados` : ' · Publicado') : ' · Guardado como borrador'}`
      );
      setMarks([]);
      setSelectedRaceId('');
      setEntries([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }

  const selectedRace = races.find(r => r.id === selectedRaceId);
  const displayEntries = sortMode === 'dorsal'
    ? [...entries].sort((a, b) => a.dorsal - b.dorsal)
    : entries;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-gray-800 bg-gray-950/95 backdrop-blur px-4 py-3">
        <div className="mx-auto max-w-2xl flex items-center gap-3">
          <Link href="/" className="text-gray-500 hover:text-white text-lg leading-none shrink-0">←</Link>
          <div>
            <h1 className="text-base font-bold text-white">🎯 Subir Pronóstico</h1>
            <p className="text-xs text-gray-500">Panel de Handicapper</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-5 space-y-5">

        {/* ── Step 1: Meeting + Race ── */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold text-black" style={{ backgroundColor: GOLD }}>1</span>
            Selecciona Reunión y Carrera
          </h2>

          {/* Meeting */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">Reunión</label>
            {loadingMeetings ? (
              <div className="h-10 rounded-xl bg-gray-800 animate-pulse" />
            ) : (
              <select
                value={selectedMeetingId}
                onChange={e => setSelectedMeetingId(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-600 transition-colors"
              >
                <option value="">— Selecciona una reunión —</option>
                {meetings.map(m => (
                  <option key={m.id} value={m.id}>
                    R{m.meetingNumber} · {m.trackName} · {new Date(m.date).toLocaleDateString('es-VE')}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Race buttons */}
          {races.length > 0 && (
            <div>
              <label className="block text-xs text-gray-400 mb-2 font-medium">Carrera</label>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {races.map(race => {
                  const hasForecast = myForecasts.some((f: any) => f.raceId?._id === race.id || f.raceId === race.id);
                  const isSelected = selectedRaceId === race.id;
                  return (
                    <button
                      key={race.id}
                      type="button"
                      onClick={() => setSelectedRaceId(isSelected ? '' : race.id)}
                      className={`relative flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-xl border text-xs font-bold transition-all active:scale-95 ${
                        isSelected
                          ? 'text-black border-yellow-600'
                          : 'bg-gray-800 border-gray-700 text-white hover:border-gray-500'
                      }`}
                      style={isSelected ? { backgroundColor: GOLD } : {}}
                    >
                      <span className="text-sm font-extrabold">C{race.raceNumber}</span>
                      <span className={`text-xs ${isSelected ? 'text-black/60' : 'text-gray-600'}`}>
                        {race.distance}m
                      </span>
                      {hasForecast && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500 border border-gray-950" title="Ya tienes pronóstico" />
                      )}
                    </button>
                  );
                })}
              </div>
              {selectedRace && (
                <p className="text-xs text-gray-600 mt-2">
                  C{selectedRace.raceNumber} · {selectedRace.distance} mts · {selectedRace.scheduledTime}
                </p>
              )}
            </div>
          )}

          {selectedMeetingId && races.length === 0 && (
            <p className="text-xs text-gray-600 italic">Cargando carreras...</p>
          )}
        </section>

        {/* ── Step 2: Entry selection ── */}
        {selectedRaceId && (
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Entry picker */}
            <section className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold text-black" style={{ backgroundColor: GOLD }}>2</span>
                  Selecciona ejemplares ({marks.length}/5)
                </h2>
                {/* Sort toggle */}
                <div className="flex bg-gray-800 border border-gray-700 rounded-lg p-0.5 gap-0.5">
                  <button type="button" onClick={() => setSortMode('preference')}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${sortMode === 'preference' ? 'bg-gray-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                    Por orden
                  </button>
                  <button type="button" onClick={() => setSortMode('dorsal')}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${sortMode === 'dorsal' ? 'bg-gray-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                    Por dorsal
                  </button>
                </div>
              </div>

              <p className="text-xs text-gray-500">
                Toca para seleccionar en orden de preferencia. Máximo 5. Toca de nuevo para quitar.
              </p>

              {loadingEntries ? (
                <div className="grid grid-cols-2 gap-2">
                  {[1,2,3,4].map(i => <div key={i} className="h-14 rounded-xl bg-gray-800 animate-pulse" />)}
                </div>
              ) : entries.length === 0 ? (
                <p className="text-xs text-gray-600 italic text-center py-4">
                  No hay ejemplares cargados para esta carrera.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {displayEntries.map(entry => {
                    const markIdx = marks.findIndex(m => m.entryId === entry.entryId);
                    const isSelected = markIdx >= 0;
                    const isDisabled = !isSelected && marks.length >= 5;
                    const order = isSelected ? marks[markIdx].preferenceOrder : null;
                    return (
                      <button
                        key={entry.entryId}
                        type="button"
                        onClick={() => !isDisabled && toggleEntry(entry)}
                        disabled={isDisabled}
                        className={`relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all active:scale-95 ${
                          isSelected
                            ? 'border-yellow-600 bg-yellow-950/30'
                            : isDisabled
                            ? 'border-gray-800 bg-gray-900 opacity-40 cursor-not-allowed'
                            : 'border-gray-700 bg-gray-800 hover:border-gray-500'
                        }`}
                      >
                        {/* Dorsal badge */}
                        <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-extrabold ${
                          isSelected ? 'text-black' : 'text-white bg-gray-700'
                        }`} style={isSelected ? { backgroundColor: GOLD } : {}}>
                          {entry.dorsal}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                            {entry.horseName}
                          </p>
                          <p className="text-xs text-gray-600 truncate">{entry.jockeyName}</p>
                        </div>
                        {/* Preference order badge */}
                        {order !== null && (
                          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-950 border-2 border-yellow-600 flex items-center justify-center text-xs font-extrabold text-yellow-400">
                            {order}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ── Marks list with labels ── */}
            {marks.length > 0 && (
              <section className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold text-black" style={{ backgroundColor: GOLD }}>3</span>
                    Etiquetas y orden
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    {marks.length === 1 && marks[0].label === 'Línea'
                      ? <span className="text-yellow-400 font-bold">Fijo único = {FIJO_BONUS_POINTS}pts</span>
                      : <span>1ra=5 · 2da=3 · 3ra=2 · 4ta/5ta=1</span>
                    }
                  </div>
                </div>

                <div className="space-y-2">
                  {marks.map((mark, idx) => {
                    const cfg = LABEL_CFG[mark.label];
                    const isFijoUnico = marks.length === 1 && mark.label === 'Línea';
                    const pts = isFijoUnico ? FIJO_BONUS_POINTS : (POINTS_BY_ORDER[mark.preferenceOrder] ?? 1);
                    return (
                      <div key={mark.entryId} className={`rounded-xl border p-3 space-y-2 ${cfg.border} bg-gray-800/40`}>
                        {/* Horse header */}
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold text-black shrink-0" style={{ backgroundColor: GOLD }}>
                            {mark.preferenceOrder}
                          </span>
                          <span className="w-6 h-6 rounded-lg bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300 shrink-0">
                            {mark.dorsalNumber}
                          </span>
                          <span className="text-sm font-bold text-white flex-1 truncate">{mark.horseName}</span>
                          <span className={`text-xs font-mono shrink-0 ${isFijoUnico ? 'text-yellow-400 font-bold' : 'text-gray-600'}`}>{pts}pts</span>
                          {/* Move up/down */}
                          <div className="flex gap-1 shrink-0">
                            <button type="button" onClick={() => moveUp(idx)} disabled={idx === 0}
                              className="text-gray-600 hover:text-white disabled:opacity-20 text-sm leading-none transition-colors">↑</button>
                            <button type="button" onClick={() => moveDown(idx)} disabled={idx === marks.length - 1}
                              className="text-gray-600 hover:text-white disabled:opacity-20 text-sm leading-none transition-colors">↓</button>
                          </div>
                          <button type="button" onClick={() => removeMark(idx)}
                            className="text-gray-600 hover:text-red-400 text-sm transition-colors shrink-0">✕</button>
                        </div>

                        {/* Label buttons */}
                        <div className="flex gap-1.5 flex-wrap">
                          {FORECAST_LABELS.map(label => {
                            const lcfg = LABEL_CFG[label];
                            const sel = mark.label === label;
                            const wouldBeFijo = marks.length === 1 && label === 'Línea';
                            return (
                              <button key={label} type="button" onClick={() => updateMarkLabel(idx, label)}
                                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border transition-all ${
                                  sel ? `${lcfg.color} ${lcfg.border} bg-gray-700/80` : 'text-gray-600 border-gray-700 hover:text-gray-400'
                                }`}>
                                {lcfg.emoji} {label}
                                {wouldBeFijo && <span className="text-yellow-400 ml-0.5">★{FIJO_BONUS_POINTS}</span>}
                              </button>
                            );
                          })}
                        </div>

                        {/* Note */}
                        <input type="text" value={mark.note} onChange={e => updateMarkNote(idx, e.target.value)}
                          placeholder="Nota opcional"
                          maxLength={200}
                          className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-1.5 text-xs text-gray-400 placeholder-gray-700 focus:outline-none focus:border-yellow-600/50 transition-colors" />
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ── Step 4: Options ── */}
            <section className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold text-black" style={{ backgroundColor: GOLD }}>4</span>
                Opciones
              </h2>
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <div>
                  <p className="text-sm font-semibold text-white">Pronóstico VIP</p>
                  <p className="text-xs text-gray-500">Los usuarios necesitan Golds para ver este pronóstico</p>
                </div>
                <Toggle value={isVip} onChange={setIsVip} />
              </label>
              <div className="h-px bg-gray-800" />
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <div>
                  <p className="text-sm font-semibold text-white">Publicar ahora</p>
                  <p className="text-xs text-gray-500">Desactiva para guardar como borrador</p>
                </div>
                <Toggle value={publish} onChange={setPublish} />
              </label>
            </section>

            {error && (
              <div className="flex items-start gap-2 text-red-400 text-xs bg-red-950/40 border border-red-800/50 rounded-xl px-3 py-2.5">
                <span>⚠️</span><span>{error}</span>
              </div>
            )}
            {success && (
              <div className="flex items-start gap-2 text-green-400 text-xs bg-green-950/40 border border-green-800/50 rounded-xl px-3 py-2.5">
                <span>{success}</span>
              </div>
            )}

            <button type="submit" disabled={loading || marks.length === 0}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-black disabled:opacity-50 transition-opacity"
              style={{ backgroundColor: GOLD }}>
              {loading ? 'Guardando...' : publish ? '📤 Publicar pronóstico' : '💾 Guardar borrador'}
            </button>
          </form>
        )}

        {/* ── My forecasts for this meeting ── */}
        {myForecasts.length > 0 && (
          <section className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
            <h2 className="text-sm font-bold text-white">📋 Mis pronósticos en esta reunión</h2>
            <div className="space-y-2">
              {myForecasts.map((fc: any, i: number) => {
                const raceNum = fc.raceId?.raceNumber ?? '?';
                const published = fc.isPublished;
                return (
                  <div key={i} className="flex items-center gap-3 bg-gray-800/50 rounded-xl px-3 py-2.5">
                    <span
                      className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold text-black"
                      style={{ backgroundColor: GOLD }}
                    >
                      C{raceNum}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white">
                        {fc.marks?.length ?? 0} marca{fc.marks?.length !== 1 ? 's' : ''}
                        {fc.isVip && <span className="ml-1.5 text-xs font-bold" style={{ color: GOLD }}>VIP</span>}
                      </p>
                      <p className="text-xs text-gray-600 truncate">
                        {fc.marks?.slice(0,3).map((m: any) => m.horseName).join(' · ')}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                      published
                        ? 'text-green-400 bg-green-950/40 border-green-800/40'
                        : 'text-gray-500 bg-gray-800 border-gray-700'
                    }`}>
                      {published ? 'Publicado' : 'Borrador'}
                    </span>
                    <button
                      onClick={() => {
                        const raceId = fc.raceId?._id ?? fc.raceId ?? '';
                        setSelectedRaceId(raceId);
                        setMarks(fc.marks?.map((m: any) => ({
                          preferenceOrder: m.preferenceOrder,
                          entryId: m.entryId ?? '',
                          horseName: m.horseName,
                          dorsalNumber: m.dorsalNumber ?? 0,
                          label: m.label as ForecastLabel,
                          note: m.note ?? '',
                        })) ?? []);
                        setIsVip(fc.isVip ?? false);
                      }}
                      className="shrink-0 text-xs text-yellow-500 hover:text-yellow-300 font-semibold transition-colors"
                    >
                      Editar
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

      </main>
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`shrink-0 w-11 h-6 rounded-full border transition-all relative ${
        value ? 'border-yellow-600' : 'bg-gray-800 border-gray-700'
      }`}
      style={value ? { backgroundColor: GOLD } : {}}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
          value ? 'left-5' : 'left-0.5'
        }`}
      />
    </button>
  );
}
