'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const GOLD = '#D4AF37';

type Status = 'pending' | 'approved' | 'rejected';

interface TopUpItem {
  _id: string;
  referenceNumber: string;
  bank: string;
  amountBs: number;
  amountUsd: number;
  goldAmount: number;
  paymentDate: string;
  phone: string;
  legalId: string;
  receiptUrl?: string;
  status: Status;
  rejectionReason?: string;
  createdAt: string;
  reviewedAt?: string;
  userId?: { email?: string; phone?: string; legalId?: string; alias?: string };
}

const STATUS_CFG: Record<Status, { label: string; color: string; bg: string; border: string }> = {
  pending:  { label: 'Pendiente', color: 'text-yellow-400', bg: 'bg-yellow-950/40', border: 'border-yellow-700/50' },
  approved: { label: 'Aprobada',  color: 'text-green-400',  bg: 'bg-green-950/40',  border: 'border-green-700/50'  },
  rejected: { label: 'Rechazada', color: 'text-red-400',    bg: 'bg-red-950/40',    border: 'border-red-700/50'    },
};

export default function AdminTopUpPage() {
  const [filter, setFilter] = useState<Status | 'all'>('pending');
  const [items, setItems] = useState<TopUpItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TopUpItem | null>(null);
  const [rejReason, setRejReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [receiptOpen, setReceiptOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/topup?status=${filter}`);
      const data = await res.json();
      setItems(data.requests ?? []);
      setTotal(data.total ?? 0);
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
      const res = await fetch(`/api/admin/topup/${selected._id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, rejectionReason: rejReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error');
      setActionSuccess(
        action === 'approve'
          ? `✅ Aprobada — ${data.goldAmount} Golds acreditados`
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

  const pendingCount = filter === 'pending' ? total : undefined;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-gray-800 bg-gray-950/95 backdrop-blur px-4 py-3">
        <div className="mx-auto max-w-3xl flex items-center gap-3">
          <Link href="/" className="text-gray-500 hover:text-white text-lg leading-none shrink-0">←</Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-white">💰 Recargas — Panel Admin</h1>
            <p className="text-xs text-gray-500">Aprobar o rechazar solicitudes de Pago Móvil</p>
          </div>
          <button onClick={load} className="text-xs text-gray-500 hover:text-white px-2 py-1 rounded-lg border border-gray-800 hover:border-gray-600 transition-colors">
            ↻ Actualizar
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5 space-y-4">

        {/* Success banner */}
        {actionSuccess && (
          <div className="flex items-center gap-2 text-green-400 text-sm bg-green-950/40 border border-green-800/50 rounded-xl px-4 py-3">
            <span>{actionSuccess}</span>
            <button onClick={() => setActionSuccess('')} className="ml-auto text-green-700 hover:text-green-400">✕</button>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2">
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
                {s === 'pending' && total > 0 && filter !== 'pending' && (
                  <span className="ml-1.5 text-xs font-bold px-1.5 py-0.5 rounded-full text-black" style={{ backgroundColor: GOLD }}>
                    {total}
                  </span>
                )}
              </button>
            );
          })}
          <span className="ml-auto text-xs text-gray-600 self-center">{total} solicitud{total !== 1 ? 'es' : ''}</span>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-gray-900 animate-pulse" />)}
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

                  {/* Main row */}
                  <button onClick={() => { setSelected(isSelected ? null : item); setRejReason(''); setActionError(''); }}
                    className="w-full text-left px-4 py-3.5 hover:bg-gray-800/30 transition-colors">
                    <div className="flex items-start gap-3">
                      {/* Status dot */}
                      <div className={`mt-1 shrink-0 w-2.5 h-2.5 rounded-full border ${cfg.border}`}
                        style={{ backgroundColor: item.status === 'approved' ? '#22c55e' : item.status === 'rejected' ? '#ef4444' : GOLD }} />

                      <div className="flex-1 min-w-0 space-y-1">
                        {/* Row 1: ref + amount */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-white font-mono">#{item.referenceNumber}</span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full text-black" style={{ backgroundColor: GOLD }}>
                            {item.goldAmount} Golds
                          </span>
                          <span className="text-xs text-gray-500">${item.amountUsd} USD</span>
                          <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                            {cfg.label}
                          </span>
                        </div>
                        {/* Row 2: user info */}
                        <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500">
                          <span>{item.legalId}</span>
                          <span>·</span>
                          <span>{item.phone}</span>
                          <span>·</span>
                          <span>{item.bank}</span>
                          <span>·</span>
                          <span>{item.paymentDate}</span>
                        </div>
                        {/* Row 3: user account */}
                        {item.userId && (
                          <p className="text-xs text-gray-700">
                            Usuario: {item.userId.email ?? item.userId.alias ?? '—'}
                          </p>
                        )}
                        {item.rejectionReason && (
                          <p className="text-xs text-red-500 italic">Motivo: {item.rejectionReason}</p>
                        )}
                      </div>

                      {/* Receipt thumbnail */}
                      {item.receiptUrl && (
                        <img src={item.receiptUrl} alt="comprobante"
                          className="shrink-0 w-10 h-10 rounded-lg object-cover border border-gray-700" />
                      )}
                    </div>
                  </button>

                  {/* Expanded actions */}
                  {isSelected && item.status === 'pending' && (
                    <div className="border-t border-gray-800 px-4 py-4 space-y-3 bg-gray-900/80">
                      {/* Receipt full view */}
                      {item.receiptUrl && (
                        <div>
                          <button onClick={() => setReceiptOpen(o => !o)}
                            className="text-xs text-yellow-500 hover:text-yellow-300 font-semibold transition-colors">
                            {receiptOpen ? '▲ Ocultar comprobante' : '▼ Ver comprobante completo'}
                          </button>
                          {receiptOpen && (
                            <img src={item.receiptUrl} alt="comprobante completo"
                              className="mt-2 w-full max-h-72 object-contain rounded-xl border border-gray-700 bg-gray-800" />
                          )}
                        </div>
                      )}

                      {/* Payment details summary */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <Detail label="Referencia"  value={item.referenceNumber} />
                        <Detail label="Fecha pago"  value={item.paymentDate} />
                        <Detail label="Banco"       value={item.bank} />
                        <Detail label="Monto Bs."   value={item.amountBs.toLocaleString('es-VE')} />
                        <Detail label="Cédula"      value={item.legalId} />
                        <Detail label="Teléfono"    value={item.phone} />
                        <Detail label="Golds"       value={`${item.goldAmount} Golds`} highlight />
                        <Detail label="USD"         value={`$${item.amountUsd}`} />
                      </div>

                      {/* Rejection reason */}
                      <div>
                        <label className="block text-xs text-gray-400 mb-1 font-medium">
                          Motivo de rechazo <span className="text-gray-600">(requerido si rechazas)</span>
                        </label>
                        <input value={rejReason} onChange={e => setRejReason(e.target.value)}
                          placeholder="Ej: Referencia no encontrada en el sistema"
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
                          className="flex-1 py-2.5 rounded-xl text-sm font-bold text-black disabled:opacity-50 transition-opacity"
                          style={{ backgroundColor: GOLD }}>
                          {actionLoading ? 'Procesando...' : `✅ Aprobar ${item.goldAmount} Golds`}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Expanded view for non-pending */}
                  {isSelected && item.status !== 'pending' && (
                    <div className="border-t border-gray-800 px-4 py-3 bg-gray-900/80">
                      {item.receiptUrl && (
                        <div className="mb-3">
                          <button onClick={() => setReceiptOpen(o => !o)}
                            className="text-xs text-yellow-500 hover:text-yellow-300 font-semibold">
                            {receiptOpen ? '▲ Ocultar comprobante' : '▼ Ver comprobante'}
                          </button>
                          {receiptOpen && (
                            <img src={item.receiptUrl} alt="comprobante"
                              className="mt-2 w-full max-h-72 object-contain rounded-xl border border-gray-700 bg-gray-800" />
                          )}
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <Detail label="Referencia" value={item.referenceNumber} />
                        <Detail label="Fecha pago" value={item.paymentDate} />
                        <Detail label="Banco"      value={item.bank} />
                        <Detail label="Monto Bs."  value={item.amountBs.toLocaleString('es-VE')} />
                        <Detail label="Revisado"   value={item.reviewedAt ? new Date(item.reviewedAt).toLocaleDateString('es-VE') : '—'} />
                        {item.rejectionReason && <Detail label="Motivo" value={item.rejectionReason} />}
                      </div>
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
      <p className={`font-semibold text-xs ${highlight ? 'text-yellow-400' : 'text-white'}`}>{value}</p>
    </div>
  );
}
