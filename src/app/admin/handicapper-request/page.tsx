'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const GOLD = '#D4AF37';
type Status = 'pending' | 'approved' | 'rejected';

interface HReqItem {
  _id: string;
  pseudonym: string;
  bio?: string;
  status: Status;
  rejectionReason?: string;
  createdAt: string;
  reviewedAt?: string;
  userId?: { email?: string; alias?: string; phone?: string; createdAt?: string };
}

const STATUS_CFG: Record<Status, { label: string; color: string; bg: string; border: string }> = {
  pending:  { label: 'Pendiente', color: 'text-yellow-400', bg: 'bg-yellow-950/40', border: 'border-yellow-700/50' },
  approved: { label: 'Aprobada',  color: 'text-green-400',  bg: 'bg-green-950/40',  border: 'border-green-700/50'  },
  rejected: { label: 'Rechazada', color: 'text-red-400',    bg: 'bg-red-950/40',    border: 'border-red-700/50'    },
};

export default function AdminHandicapperRequestPage() {
  const [filter, setFilter] = useState<Status | 'all'>('pending');
  const [items, setItems] = useState<HReqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<HReqItem | null>(null);
  const [rejReason, setRejReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/handicapper-request?status=${filter}`);
      const data = await res.json();
      setItems(data.requests ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function handleAction(action: 'approve' | 'reject') {
    if (!selected) return;
    if (action === 'reject' && !rejReason.trim()) {
      setActionError('Escribe el motivo del rechazo.');
      return;
    }
    setActionLoading(true);
    setActionError('');
    setActionSuccess('');
    try {
      const res = await fetch(`/api/admin/handicapper-request/${selected._id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, rejectionReason: rejReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error');
      setActionSuccess(
        action === 'approve'
          ? `✅ Aprobado — ${selected.pseudonym} ahora es Handicapper`
          : '🚫 Solicitud rechazada'
      );
      setSelected(null);
      setRejReason('');
      load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="sticky top-0 z-20 border-b border-gray-800 bg-gray-950/95 backdrop-blur px-4 py-3">
        <div className="mx-auto max-w-2xl flex items-center gap-3">
          <Link href="/perfil" className="text-gray-500 hover:text-white text-lg leading-none shrink-0">←</Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-white">🎯 Solicitudes Handicapper</h1>
            <p className="text-xs text-gray-500">Aprobar o rechazar solicitudes de rol</p>
          </div>
          <button onClick={load} className="text-xs text-gray-500 hover:text-white px-2 py-1 rounded-lg border border-gray-800 hover:border-gray-600 transition-colors">
            ↻
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-5 space-y-4">

        {actionSuccess && (
          <div className="flex items-center gap-2 text-green-400 text-sm bg-green-950/40 border border-green-800/50 rounded-xl px-4 py-3">
            <span>{actionSuccess}</span>
            <button onClick={() => setActionSuccess('')} className="ml-auto text-green-700 hover:text-green-400">✕</button>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {(['pending', 'approved', 'rejected', 'all'] as const).map(s => {
            const cfg = s !== 'all' ? STATUS_CFG[s] : null;
            return (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  filter === s
                    ? cfg ? `${cfg.color} ${cfg.bg} ${cfg.border}` : 'text-white bg-gray-800 border-gray-600'
                    : 'text-gray-500 bg-gray-900 border-gray-800 hover:border-gray-600'
                }`}>
                {s === 'all' ? 'Todas' : STATUS_CFG[s].label}
              </button>
            );
          })}
          <span className="ml-auto text-xs text-gray-600 self-center">{items.length} solicitud{items.length !== 1 ? 'es' : ''}</span>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-gray-900 animate-pulse" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-gray-700">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-sm">No hay solicitudes {filter !== 'all' ? STATUS_CFG[filter as Status]?.label.toLowerCase() : ''}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => {
              const cfg = STATUS_CFG[item.status];
              const isSelected = selected?._id === item._id;
              return (
                <div key={item._id}
                  className={`rounded-2xl border bg-gray-900 overflow-hidden transition-all ${isSelected ? 'border-yellow-700/60' : 'border-gray-800'}`}>

                  <button onClick={() => { setSelected(isSelected ? null : item); setRejReason(''); setActionError(''); }}
                    className="w-full text-left px-4 py-3.5 hover:bg-gray-800/30 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-extrabold text-black"
                        style={{ backgroundColor: GOLD }}>
                        {item.pseudonym[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-white">{item.pseudonym}</span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {item.userId?.email ?? item.userId?.alias ?? '—'}
                        </p>
                        {item.bio && <p className="text-xs text-gray-600 line-clamp-1 italic">"{item.bio}"</p>}
                        <p className="text-xs text-gray-700">
                          {new Date(item.createdAt).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <span className="text-gray-600 text-xs shrink-0">{isSelected ? '▲' : '▼'}</span>
                    </div>
                  </button>

                  {/* Expanded */}
                  {isSelected && (
                    <div className="border-t border-gray-800 px-4 py-4 space-y-3 bg-gray-900/80">
                      {/* User details */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <Detail label="Seudónimo" value={item.pseudonym} highlight />
                        <Detail label="Email" value={item.userId?.email ?? '—'} />
                        {item.userId?.phone && <Detail label="Teléfono" value={item.userId.phone} />}
                        <Detail label="Solicitud" value={new Date(item.createdAt).toLocaleDateString('es-VE')} />
                      </div>

                      {item.bio && (
                        <div className="bg-gray-800/50 rounded-xl px-3 py-2.5">
                          <p className="text-xs text-gray-500 mb-1">Presentación</p>
                          <p className="text-xs text-gray-300 leading-relaxed">{item.bio}</p>
                        </div>
                      )}

                      {item.status === 'pending' && (
                        <>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1 font-medium">
                              Motivo de rechazo <span className="text-gray-600">(requerido si rechazas)</span>
                            </label>
                            <input value={rejReason} onChange={e => setRejReason(e.target.value)}
                              placeholder="Ej: No cumple los requisitos mínimos"
                              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600 transition-colors" />
                          </div>

                          {actionError && (
                            <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/40 rounded-xl px-3 py-2">⚠️ {actionError}</p>
                          )}

                          <div className="flex gap-3">
                            <button onClick={() => handleAction('reject')} disabled={actionLoading}
                              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-red-400 bg-red-950/30 border border-red-800/50 hover:bg-red-950/50 disabled:opacity-50 transition-colors">
                              {actionLoading ? '...' : '🚫 Rechazar'}
                            </button>
                            <button onClick={() => handleAction('approve')} disabled={actionLoading}
                              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-black disabled:opacity-50"
                              style={{ backgroundColor: GOLD }}>
                              {actionLoading ? 'Procesando...' : '✅ Aprobar'}
                            </button>
                          </div>
                        </>
                      )}

                      {item.status !== 'pending' && (
                        <div className={`rounded-xl border px-3 py-2.5 ${cfg.bg} ${cfg.border}`}>
                          <p className={`text-xs font-semibold ${cfg.color}`}>
                            {item.status === 'approved' ? '✅ Aprobado — ya tiene rol handicapper' : `❌ Rechazado${item.rejectionReason ? `: ${item.rejectionReason}` : ''}`}
                          </p>
                          {item.reviewedAt && (
                            <p className="text-xs text-gray-600 mt-0.5">
                              {new Date(item.reviewedAt).toLocaleDateString('es-VE')}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function Detail({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-gray-800/50 rounded-lg px-2.5 py-2">
      <p className="text-gray-600 text-xs mb-0.5">{label}</p>
      <p className={`font-semibold text-xs truncate ${highlight ? 'text-yellow-400' : 'text-white'}`}>{value}</p>
    </div>
  );
}
