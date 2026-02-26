'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { FORECAST_LABELS, ForecastLabel } from '@/lib/constants';

const GOLD = '#D4AF37';

interface MeetingOption { id: string; meetingNumber: number; date: string; trackName: string; }
interface RaceOption { id: string; raceNumber: number; distance: number; scheduledTime: string; }
interface EntryOption { entryId: string; dorsal: number; horseName: string; jockeyName: string; }
interface MarkForm { preferenceOrder: number; entryId: string; horseName: string; dorsalNumber: number; label: ForecastLabel | ''; note: string; }
interface HandicapperOption { _id: string; pseudonym: string; isGhost: boolean; isActive: boolean; }
interface RaceForecastState { raceId: string; raceNumber: number; marks: MarkForm[]; entries: EntryOption[]; loadingEntries: boolean; saved: boolean; }

const LABEL_CFG: Record<string, { color: string; border: string; emoji: string }> = {
  '':               { color: 'text-gray-500',   border: 'border-gray-700',   emoji: '' },
  'Línea':          { color: 'text-gray-300',   border: 'border-gray-600',   emoji: '📌' },
  'Casi Fijo':      { color: 'text-blue-300',   border: 'border-blue-700',   emoji: '🔵' },
  'Súper Especial': { color: 'text-yellow-300', border: 'border-yellow-600', emoji: '⭐' },
  'Buen Dividendo': { color: 'text-green-300',  border: 'border-green-700',  emoji: '💰' },
  'Batacazo':       { color: 'text-orange-300', border: 'border-orange-600', emoji: '🔥' },
};

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className={`shrink-0 w-11 h-6 rounded-full border transition-all relative ${value ? 'border-yellow-600' : 'bg-gray-800 border-gray-700'}`}
      style={value ? { backgroundColor: GOLD } : {}}>
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${value ? 'left-5' : 'left-0.5'}`} />
    </button>
  );
}

function StepBadge({ n }: { n: number }) {
  return (
    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold text-black shrink-0" style={{ backgroundColor: GOLD }}>{n}</span>
  );
}

function RaceMarkPanel({ raceState, onToggleEntry, onUpdateLabel, onRemoveMark, onMoveUp, onMoveDown }: {
  raceState: RaceForecastState;
  onToggleEntry: (e: EntryOption) => void;
  onUpdateLabel: (idx: number, label: ForecastLabel | '') => void;
  onRemoveMark: (idx: number) => void;
  onMoveUp: (idx: number) => void;
  onMoveDown: (idx: number) => void;
}) {
  const { entries, marks, loadingEntries } = raceState;
  const selectedIds = marks.map(m => m.entryId);

  if (loadingEntries) return <div className="grid grid-cols-2 gap-2">{[1,2,3,4].map(i => <div key={i} className="h-12 rounded-xl bg-gray-800 animate-pulse" />)}</div>;
  if (entries.length === 0) return <p className="text-xs text-gray-600 italic text-center py-3">Sin ejemplares cargados.</p>;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {[...entries].sort((a,b) => a.dorsal - b.dorsal).map(entry => {
          const markIdx = marks.findIndex(m => m.entryId === entry.entryId);
          const isSelected = markIdx >= 0;
          const isDisabled = !isSelected && marks.length >= 5;
          return (
            <button key={entry.entryId} type="button"
              onClick={() => !isDisabled && onToggleEntry(entry)}
              disabled={isDisabled}
              className={`relative flex items-center gap-2 px-2.5 py-2 rounded-xl border text-left transition-all active:scale-95 ${
                isSelected ? 'border-yellow-600 bg-yellow-950/30'
                : isDisabled ? 'border-gray-800 bg-gray-900 opacity-40 cursor-not-allowed'
                : 'border-gray-700 bg-gray-800 hover:border-gray-500'}`}>
              <span className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold ${isSelected ? 'text-black' : 'text-white bg-gray-700'}`}
                style={isSelected ? { backgroundColor: GOLD } : {}}>{entry.dorsal}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold truncate text-white">{entry.horseName}</p>
                <p className="text-xs text-gray-600 truncate">{entry.jockeyName}</p>
              </div>
              {isSelected && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-950 border-2 border-yellow-600 flex items-center justify-center text-xs font-extrabold text-yellow-400">
                  {marks[markIdx].preferenceOrder}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {marks.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-gray-800">
          {marks.map((mark, idx) => {
            const cfg = LABEL_CFG[mark.label];
            return (
              <div key={mark.entryId} className={`rounded-xl border p-2.5 space-y-2 ${cfg.border} bg-gray-800/40`}>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-extrabold text-black shrink-0" style={{ backgroundColor: GOLD }}>{mark.preferenceOrder}</span>
                  <span className="w-6 h-6 rounded-lg bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300 shrink-0">{mark.dorsalNumber}</span>
                  <span className="text-xs font-bold text-white flex-1 truncate">{mark.horseName}</span>
                  <div className="flex gap-1 shrink-0">
                    <button type="button" onClick={() => onMoveUp(idx)} disabled={idx === 0} className="text-gray-600 hover:text-white disabled:opacity-20 text-sm transition-colors">↑</button>
                    <button type="button" onClick={() => onMoveDown(idx)} disabled={idx === marks.length - 1} className="text-gray-600 hover:text-white disabled:opacity-20 text-sm transition-colors">↓</button>
                  </div>
                  <button type="button" onClick={() => onRemoveMark(idx)} className="text-gray-600 hover:text-red-400 text-sm transition-colors shrink-0">✕</button>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {FORECAST_LABELS.map(label => {
                    const lcfg = LABEL_CFG[label];
                    const sel = mark.label === label;
                    return (
                      <button key={label} type="button" onClick={() => onUpdateLabel(idx, label)}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold border transition-all ${sel ? `${lcfg.color} ${lcfg.border} bg-gray-700/80` : 'text-gray-600 border-gray-700 hover:text-gray-400'}`}>
                        {lcfg.emoji} {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminForecastPage() {
  const [meetings, setMeetings] = useState<MeetingOption[]>([]);
  const [races, setRaces] = useState<RaceOption[]>([]);
  const [handicappers, setHandicappers] = useState<HandicapperOption[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(true);
  const [loadingHandicappers, setLoadingHandicappers] = useState(true);
  const [selectedMeetingId, setSelectedMeetingId] = useState('');
  const [selectedHandicapperId, setSelectedHandicapperId] = useState('');
  const [publish, setPublish] = useState(true);
  const [isVip, setIsVip] = useState(false);
  const [raceStates, setRaceStates] = useState<Record<string, RaceForecastState>>({});
  const [activeRaceId, setActiveRaceId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ saved: number; skipped: number; errors: string[] } | null>(null);
  const [error, setError] = useState('');
  const [showGhostModal, setShowGhostModal] = useState(false);
  const [ghostPseudonym, setGhostPseudonym] = useState('');
  const [ghostBio, setGhostBio] = useState('');
  const [creatingGhost, setCreatingGhost] = useState(false);
  const [ghostError, setGhostError] = useState('');

  useEffect(() => {
    fetch('/api/meetings/upcoming?limit=10').then(r => r.json()).then(d => setMeetings(d.meetings ?? [])).catch(() => {}).finally(() => setLoadingMeetings(false));
    fetch('/api/admin/handicappers').then(r => r.json()).then(d => setHandicappers(d.profiles ?? [])).catch(() => {}).finally(() => setLoadingHandicappers(false));
  }, []);

  useEffect(() => {
    if (!selectedMeetingId) { setRaces([]); setRaceStates({}); setActiveRaceId(null); return; }
    fetch(`/api/meetings/${selectedMeetingId}/races`).then(r => r.json()).then(d => {
      setRaces(d.races ?? []); setRaceStates({}); setActiveRaceId(null); setSubmitResult(null); setError('');
    }).catch(() => {});
  }, [selectedMeetingId]);

  const loadEntries = useCallback(async (race: RaceOption) => {
    const raceId = race.id;
    setRaceStates(prev => ({ ...prev, [raceId]: prev[raceId] ? { ...prev[raceId], loadingEntries: true } : { raceId, raceNumber: race.raceNumber, marks: [], entries: [], loadingEntries: true, saved: false } }));
    try {
      const r = await fetch(`/api/races/${raceId}/entries`);
      const d = await r.json();
      setRaceStates(prev => ({ ...prev, [raceId]: { ...prev[raceId], entries: d.entries ?? [], loadingEntries: false } }));
    } catch {
      setRaceStates(prev => ({ ...prev, [raceId]: { ...prev[raceId], loadingEntries: false } }));
    }
  }, []);

  function openRace(race: RaceOption) {
    const raceId = race.id;
    if (activeRaceId === raceId) { setActiveRaceId(null); return; }
    setActiveRaceId(raceId);
    if (!raceStates[raceId]) loadEntries(race);
  }

  function toggleEntry(raceId: string, entry: EntryOption) {
    setRaceStates(prev => {
      const rs = prev[raceId];
      if (!rs) return prev;
      const alreadyIdx = rs.marks.findIndex(m => m.entryId === entry.entryId);
      const newMarks = alreadyIdx >= 0
        ? rs.marks.filter((_, i) => i !== alreadyIdx).map((m, i) => ({ ...m, preferenceOrder: i + 1 }))
        : rs.marks.length >= 5 ? rs.marks : [...rs.marks, { preferenceOrder: rs.marks.length + 1, entryId: entry.entryId, horseName: entry.horseName, dorsalNumber: entry.dorsal, label: '' as const, note: '' }];
      return { ...prev, [raceId]: { ...rs, marks: newMarks } };
    });
  }

  function updateMarkLabel(raceId: string, idx: number, label: ForecastLabel | '') {
    setRaceStates(prev => { const rs = prev[raceId]; if (!rs) return prev; return { ...prev, [raceId]: { ...rs, marks: rs.marks.map((m, i) => i === idx ? { ...m, label } : m) } }; });
  }
  function removeMark(raceId: string, idx: number) {
    setRaceStates(prev => { const rs = prev[raceId]; if (!rs) return prev; return { ...prev, [raceId]: { ...rs, marks: rs.marks.filter((_, i) => i !== idx).map((m, i) => ({ ...m, preferenceOrder: i + 1 })) } }; });
  }
  function moveUp(raceId: string, idx: number) {
    if (idx === 0) return;
    setRaceStates(prev => { const rs = prev[raceId]; if (!rs) return prev; const next = [...rs.marks]; [next[idx-1], next[idx]] = [next[idx], next[idx-1]]; return { ...prev, [raceId]: { ...rs, marks: next.map((m,i) => ({ ...m, preferenceOrder: i+1 })) } }; });
  }
  function moveDown(raceId: string, idx: number) {
    setRaceStates(prev => { const rs = prev[raceId]; if (!rs || idx >= rs.marks.length-1) return prev; const next = [...rs.marks]; [next[idx], next[idx+1]] = [next[idx+1], next[idx]]; return { ...prev, [raceId]: { ...rs, marks: next.map((m,i) => ({ ...m, preferenceOrder: i+1 })) } }; });
  }

  async function handleCreateGhost(e: React.FormEvent) {
    e.preventDefault();
    setGhostError('');
    if (!ghostPseudonym.trim()) { setGhostError('El pseudónimo es requerido.'); return; }
    setCreatingGhost(true);
    try {
      const res = await fetch('/api/admin/handicappers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pseudonym: ghostPseudonym.trim(), bio: ghostBio.trim() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al crear.');
      setHandicappers(prev => [...prev, { _id: data.profile._id, pseudonym: data.profile.pseudonym, isGhost: true, isActive: true }]);
      setSelectedHandicapperId(data.profile._id);
      setGhostPseudonym(''); setGhostBio(''); setShowGhostModal(false);
    } catch (err) { setGhostError(err instanceof Error ? err.message : 'Error'); }
    finally { setCreatingGhost(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSubmitResult(null);
    if (!selectedMeetingId) { setError('Selecciona una reunión.'); return; }
    if (!selectedHandicapperId) { setError('Selecciona un handicapper.'); return; }
    const forecastsToSend = Object.values(raceStates).filter(rs => rs.marks.length > 0).map(rs => ({
      raceId: rs.raceId,
      marks: rs.marks.map(m => ({ preferenceOrder: m.preferenceOrder, horseName: m.horseName, dorsalNumber: m.dorsalNumber || undefined, label: m.label, note: m.note.trim() || undefined })),
      isVip, source: 'manual',
    }));
    if (forecastsToSend.length === 0) { setError('Agrega marcas en al menos una carrera.'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/forecast/batch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ handicapperProfileId: selectedHandicapperId, meetingId: selectedMeetingId, publish, forecasts: forecastsToSend }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al guardar.');
      setSubmitResult({ saved: data.saved, skipped: data.skipped, errors: (data.results ?? []).filter((r: any) => !r.saved).map((r: any) => `${r.error}`) });
      setRaceStates(prev => { const next = { ...prev }; (data.results ?? []).forEach((r: any) => { if (r.saved && next[r.raceId]) next[r.raceId] = { ...next[r.raceId], saved: true }; }); return next; });
    } catch (err) { setError(err instanceof Error ? err.message : 'Error desconocido'); }
    finally { setSubmitting(false); }
  }

  const totalMarkedRaces = Object.values(raceStates).filter(rs => rs.marks.length > 0).length;
  const selectedHandicapper = handicappers.find(h => h._id === selectedHandicapperId);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="sticky top-0 z-20 border-b border-gray-800 bg-gray-950/95 backdrop-blur px-4 py-3">
        <div className="mx-auto max-w-3xl flex items-center gap-3">
          <Link href="/admin" className="text-gray-500 hover:text-white text-lg leading-none shrink-0">←</Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-white">📋 Pronósticos por Lote</h1>
            <p className="text-xs text-gray-500">Admin / Staff</p>
          </div>
          <Link href="/admin/intelligence" className="text-xs text-yellow-500 hover:text-yellow-300 font-semibold border border-yellow-800/50 rounded-lg px-2.5 py-1">🤖 IA</Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5 space-y-5">

        {/* Step 1 */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2"><StepBadge n={1} />Reunión y Handicapper</h2>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">Reunión</label>
            {loadingMeetings ? <div className="h-10 rounded-xl bg-gray-800 animate-pulse" /> : (
              <select value={selectedMeetingId} onChange={e => setSelectedMeetingId(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-600">
                <option value="">— Selecciona una reunión —</option>
                {meetings.map(m => <option key={m.id} value={m.id}>R{m.meetingNumber} · {m.trackName} · {new Date(m.date).toLocaleDateString('es-VE')}</option>)}
              </select>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-gray-400 font-medium">Handicapper</label>
              <button type="button" onClick={() => setShowGhostModal(true)} className="text-xs text-yellow-500 hover:text-yellow-300 font-semibold">+ Nuevo ghost</button>
            </div>
            {loadingHandicappers ? <div className="h-10 rounded-xl bg-gray-800 animate-pulse" /> : (
              <select value={selectedHandicapperId} onChange={e => setSelectedHandicapperId(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-600">
                <option value="">— Selecciona un handicapper —</option>
                {handicappers.map(h => <option key={h._id} value={h._id}>{h.pseudonym}{h.isGhost ? ' 👻' : ''}</option>)}
              </select>
            )}
            {selectedHandicapper && <p className="text-xs text-gray-600 mt-1.5">{selectedHandicapper.isGhost ? '👻 Ghost — sin cuenta propia' : '👤 Handicapper registrado'}</p>}
          </div>
          {selectedMeetingId && selectedHandicapperId && (
            <div className="flex gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer"><Toggle value={publish} onChange={setPublish} /><span className="text-xs text-gray-300 font-medium">Publicar ahora</span></label>
              <label className="flex items-center gap-2 cursor-pointer"><Toggle value={isVip} onChange={setIsVip} /><span className="text-xs text-gray-300 font-medium">VIP</span></label>
            </div>
          )}
        </section>

        {/* Step 2: races */}
        {races.length > 0 && selectedHandicapperId && (
          <section className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2"><StepBadge n={2} />Marcas por carrera</h2>
              {totalMarkedRaces > 0 && <span className="text-xs text-yellow-400 font-semibold">{totalMarkedRaces}/{races.length} carreras</span>}
            </div>
            <div className="space-y-2">
              {races.map(race => {
                const rs = raceStates[race.id];
                const isActive = activeRaceId === race.id;
                const marksCount = rs?.marks.length ?? 0;
                const isSaved = rs?.saved ?? false;
                return (
                  <div key={race.id} className="border border-gray-800 rounded-xl overflow-hidden">
                    <button type="button" onClick={() => openRace(race)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${isActive ? 'bg-gray-800' : 'bg-gray-900 hover:bg-gray-800/60'}`}>
                      <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold ${marksCount > 0 ? 'text-black' : 'bg-gray-800 text-gray-500'}`}
                        style={marksCount > 0 ? { backgroundColor: GOLD } : undefined}>
                        C{race.raceNumber}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">Carrera {race.raceNumber} <span className="text-xs text-gray-500 font-normal">{race.distance}m · {race.scheduledTime}</span></p>
                        {marksCount > 0 && <p className="text-xs text-gray-500 truncate">{rs?.marks.map(m => m.horseName).join(' · ')}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isSaved && <span className="text-xs text-green-400 font-semibold">✓</span>}
                        {marksCount > 0 && !isSaved && <span className="text-xs font-bold px-2 py-0.5 rounded-full text-black" style={{ backgroundColor: GOLD }}>{marksCount}</span>}
                        <span className={`text-gray-600 text-sm transition-transform ${isActive ? 'rotate-180' : ''}`}>▾</span>
                      </div>
                    </button>
                    {isActive && (
                      <div className="border-t border-gray-800 p-3">
                        <RaceMarkPanel
                          raceState={rs ?? { raceId: race.id, raceNumber: race.raceNumber, marks: [], entries: [], loadingEntries: false, saved: false }}
                          onToggleEntry={entry => toggleEntry(race.id, entry)}
                          onUpdateLabel={(idx, label) => updateMarkLabel(race.id, idx, label)}
                          onRemoveMark={idx => removeMark(race.id, idx)}
                          onMoveUp={idx => moveUp(race.id, idx)}
                          onMoveDown={idx => moveDown(race.id, idx)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Submit */}
        {totalMarkedRaces > 0 && (
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && <div className="flex items-start gap-2 text-red-400 text-xs bg-red-950/40 border border-red-800/50 rounded-xl px-3 py-2.5"><span>⚠️</span><span>{error}</span></div>}
            {submitResult && (
              <div className={`rounded-xl border px-3 py-2.5 text-xs space-y-1 ${submitResult.saved > 0 ? 'text-green-400 bg-green-950/40 border-green-800/50' : 'text-red-400 bg-red-950/40 border-red-800/50'}`}>
                <p className="font-bold">✅ {submitResult.saved} guardados · {submitResult.skipped} omitidos</p>
                {submitResult.errors.map((e, i) => <p key={i} className="text-red-400">{e}</p>)}
              </div>
            )}
            <button type="submit" disabled={submitting}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-black disabled:opacity-50 transition-opacity"
              style={{ backgroundColor: GOLD }}>
              {submitting ? 'Guardando...' : `${publish ? '📤 Publicar' : '💾 Guardar'} ${totalMarkedRaces} carrera${totalMarkedRaces !== 1 ? 's' : ''}`}
            </button>
          </form>
        )}
      </main>

      {/* Ghost modal */}
      {showGhostModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">👻 Nuevo handicapper ghost</h3>
              <button type="button" onClick={() => { setShowGhostModal(false); setGhostError(''); }} className="text-gray-500 hover:text-white text-lg">×</button>
            </div>
            <form onSubmit={handleCreateGhost} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Pseudónimo *</label>
                <input value={ghostPseudonym} onChange={e => setGhostPseudonym(e.target.value)} placeholder="Ej: Analiz Boscan"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-600" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Bio (opcional)</label>
                <input value={ghostBio} onChange={e => setGhostBio(e.target.value)} placeholder="Plataforma, descripción..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-600" />
              </div>
              {ghostError && <p className="text-xs text-red-400">{ghostError}</p>}
              <button type="submit" disabled={creatingGhost}
                className="w-full py-3 rounded-xl text-sm font-bold text-black disabled:opacity-50"
                style={{ backgroundColor: GOLD }}>
                {creatingGhost ? 'Creando...' : 'Crear ghost'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
