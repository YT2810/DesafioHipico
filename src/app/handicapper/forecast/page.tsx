'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FORECAST_LABELS, ForecastLabel } from '@/lib/constants';

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

interface MarkForm {
  preferenceOrder: number;
  horseName: string;
  dorsalNumber: string;
  label: ForecastLabel;
  note: string;
}

const EMPTY_MARK = (order: number): MarkForm => ({
  preferenceOrder: order,
  horseName: '',
  dorsalNumber: '',
  label: 'Línea',
  note: '',
});

const LABEL_CFG: Record<ForecastLabel, { color: string; border: string; emoji: string; pts: string }> = {
  'Línea':          { color: 'text-gray-300',   border: 'border-gray-600',   emoji: '📌', pts: '' },
  'Casi Fijo':      { color: 'text-blue-300',   border: 'border-blue-700',   emoji: '🔵', pts: '(8pts si es 1ra)' },
  'Súper Especial': { color: 'text-yellow-300', border: 'border-yellow-600', emoji: '⭐', pts: '' },
  'Buen Dividendo': { color: 'text-green-300',  border: 'border-green-700',  emoji: '💰', pts: '' },
  'Batacazo':       { color: 'text-orange-300', border: 'border-orange-600', emoji: '🔥', pts: '' },
};

const POINTS_BY_ORDER: Record<number, number> = { 1: 5, 2: 3, 3: 2, 4: 1, 5: 1 };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HandicapperForecastPage() {
  const [meetings, setMeetings] = useState<MeetingOption[]>([]);
  const [races, setRaces] = useState<RaceOption[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState('');
  const [selectedRaceId, setSelectedRaceId] = useState('');
  const [marks, setMarks] = useState<MarkForm[]>([EMPTY_MARK(1)]);
  const [isVip, setIsVip] = useState(false);
  const [publish, setPublish] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMeetings, setLoadingMeetings] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [myForecasts, setMyForecasts] = useState<any[]>([]);

  // Load upcoming meetings
  useEffect(() => {
    fetch('/api/meetings/upcoming?limit=10')
      .then(r => r.json())
      .then(d => setMeetings(d.meetings ?? []))
      .catch(() => {})
      .finally(() => setLoadingMeetings(false));
  }, []);

  // Load races when meeting changes
  useEffect(() => {
    if (!selectedMeetingId) { setRaces([]); setSelectedRaceId(''); return; }
    fetch(`/api/meetings/${selectedMeetingId}/races`)
      .then(r => r.json())
      .then(d => { setRaces(d.races ?? []); setSelectedRaceId(''); })
      .catch(() => {});
  }, [selectedMeetingId]);

  // Load my forecasts for this meeting
  useEffect(() => {
    if (!selectedMeetingId) { setMyForecasts([]); return; }
    fetch(`/api/handicapper/forecast?meetingId=${selectedMeetingId}`)
      .then(r => r.json())
      .then(d => setMyForecasts(d.forecasts ?? []))
      .catch(() => {});
  }, [selectedMeetingId, success]);

  function addMark() {
    if (marks.length >= 5) return;
    setMarks(prev => [...prev, EMPTY_MARK(prev.length + 1)]);
  }

  function removeMark(idx: number) {
    if (marks.length <= 1) return;
    setMarks(prev => prev.filter((_, i) => i !== idx).map((m, i) => ({ ...m, preferenceOrder: i + 1 })));
  }

  function updateMark(idx: number, field: keyof MarkForm, value: string) {
    setMarks(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedMeetingId || !selectedRaceId) {
      setError('Selecciona una reunión y una carrera.');
      return;
    }

    const validMarks = marks.filter(m => m.horseName.trim());
    if (validMarks.length === 0) {
      setError('Agrega al menos una marca con nombre del ejemplar.');
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
          marks: validMarks.map(m => ({
            preferenceOrder: m.preferenceOrder,
            horseName: m.horseName.trim().toUpperCase(),
            dorsalNumber: m.dorsalNumber ? parseInt(m.dorsalNumber) : undefined,
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
      // Reset marks
      setMarks([EMPTY_MARK(1)]);
      setSelectedRaceId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }

  const selectedRace = races.find(r => r.id === selectedRaceId);

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

        {/* ── Step 2: Marks ── */}
        {selectedRaceId && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <section className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold text-black" style={{ backgroundColor: GOLD }}>2</span>
                  Marcas ({marks.length}/5)
                </h2>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>1ra=5pts</span>
                  <span>·</span>
                  <span className="text-blue-400">Fijo=8pts</span>
                  <span>·</span>
                  <span>2da=3pts</span>
                  <span>·</span>
                  <span>3ra=2pts</span>
                </div>
              </div>

              <div className="space-y-3">
                {marks.map((mark, idx) => (
                  <MarkRow
                    key={idx}
                    mark={mark}
                    idx={idx}
                    canRemove={marks.length > 1}
                    onChange={(field, val) => updateMark(idx, field, val)}
                    onRemove={() => removeMark(idx)}
                  />
                ))}
              </div>

              {marks.length < 5 && (
                <button
                  type="button"
                  onClick={addMark}
                  className="w-full py-2.5 rounded-xl border border-dashed border-gray-700 text-xs font-semibold text-gray-500 hover:border-yellow-700/50 hover:text-yellow-400 transition-colors"
                >
                  + Agregar marca ({marks.length + 1}ra preferencia)
                </button>
              )}
            </section>

            {/* ── Step 3: Options ── */}
            <section className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold text-black" style={{ backgroundColor: GOLD }}>3</span>
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

            {/* Errors / Success */}
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-black disabled:opacity-50 transition-opacity"
              style={{ backgroundColor: GOLD }}
            >
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
                        setSelectedRaceId(fc.raceId?._id ?? fc.raceId ?? '');
                        setMarks(fc.marks?.map((m: any) => ({
                          preferenceOrder: m.preferenceOrder,
                          horseName: m.horseName,
                          dorsalNumber: m.dorsalNumber?.toString() ?? '',
                          label: m.label as ForecastLabel,
                          note: m.note ?? '',
                        })) ?? [EMPTY_MARK(1)]);
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

// ─── Mark Row ─────────────────────────────────────────────────────────────────

function MarkRow({ mark, idx, canRemove, onChange, onRemove }: {
  mark: MarkForm;
  idx: number;
  canRemove: boolean;
  onChange: (field: keyof MarkForm, value: string) => void;
  onRemove: () => void;
}) {
  const cfg = LABEL_CFG[mark.label];
  const isFijo = mark.preferenceOrder === 1 && mark.label === 'Casi Fijo';
  const pts = isFijo ? 8 : (POINTS_BY_ORDER[mark.preferenceOrder] ?? 1);

  return (
    <div className={`rounded-xl border p-3 space-y-2.5 ${cfg.border} bg-gray-800/30`}>
      {/* Row header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300">
            {mark.preferenceOrder}
          </span>
          <span className={`text-xs font-semibold ${cfg.color}`}>
            {mark.preferenceOrder === 1 ? '1ra preferencia' :
             mark.preferenceOrder === 2 ? '2da preferencia' :
             mark.preferenceOrder === 3 ? '3ra preferencia' :
             mark.preferenceOrder === 4 ? '4ta preferencia' : '5ta preferencia'}
          </span>
          <span className="text-xs text-gray-600 font-mono">{pts}pts</span>
          {isFijo && <span className="text-xs font-bold text-blue-300 bg-blue-900/40 border border-blue-700/40 px-1.5 py-0.5 rounded-full">FIJO</span>}
        </div>
        {canRemove && (
          <button type="button" onClick={onRemove} className="text-gray-600 hover:text-red-400 text-sm transition-colors">✕</button>
        )}
      </div>

      {/* Horse name + dorsal */}
      <div className="flex gap-2">
        <input
          type="text"
          value={mark.horseName}
          onChange={e => onChange('horseName', e.target.value)}
          placeholder="Nombre del ejemplar"
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600 transition-colors uppercase"
        />
        <input
          type="number"
          value={mark.dorsalNumber}
          onChange={e => onChange('dorsalNumber', e.target.value)}
          placeholder="Nº"
          min="1"
          max="20"
          className="w-16 bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600 transition-colors text-center"
        />
      </div>

      {/* Label selector */}
      <div className="flex gap-1.5 flex-wrap">
        {FORECAST_LABELS.map(label => {
          const lcfg = LABEL_CFG[label];
          const selected = mark.label === label;
          return (
            <button
              key={label}
              type="button"
              onClick={() => onChange('label', label)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                selected
                  ? `${lcfg.color} ${lcfg.border} bg-gray-700/80`
                  : 'text-gray-600 border-gray-700 hover:border-gray-600 hover:text-gray-400'
              }`}
            >
              {lcfg.emoji} {label}
              {label === 'Casi Fijo' && mark.preferenceOrder === 1 && (
                <span className="text-blue-400 font-bold ml-0.5">★</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Note */}
      <input
        type="text"
        value={mark.note}
        onChange={e => onChange('note', e.target.value)}
        placeholder="Nota opcional (ej: viene de buena forma)"
        maxLength={200}
        className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-1.5 text-xs text-gray-400 placeholder-gray-700 focus:outline-none focus:border-yellow-600/50 transition-colors"
      />
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
