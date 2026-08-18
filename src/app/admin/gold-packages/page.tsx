'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TOPUP_PACKAGES } from '@/lib/constants';

const GOLD = '#D4AF37';

export default function GoldPackagesPage() {
  const [prices, setPrices] = useState<Record<string, string>>({
    arranque: '',
    jinete: '',
    padrillo: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    fetch('/api/topup/packages')
      .then(r => r.json())
      .then(d => {
        if (d.packages?.length) {
          const map: Record<string, string> = {};
          d.packages.forEach((p: { id: string; priceBs: number }) => { map[p.id] = String(p.priceBs); });
          setPrices(map);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setMsg(''); setErr('');
    const overrides = Object.entries(prices).map(([id, val]) => ({
      id,
      priceBs: parseInt(val.replace(/\./g, '').replace(',', ''), 10),
    }));
    if (overrides.some(o => !o.priceBs || o.priceBs <= 0)) {
      setErr('Todos los precios deben ser mayores a 0.'); return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/site-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'goldPackagePrices', value: overrides }),
      });
      if (!res.ok) throw new Error('Error al guardar');
      setMsg('✅ Precios actualizados correctamente.');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 px-4 py-8">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-gray-500 hover:text-white text-sm">← Admin</Link>
          <h1 className="text-lg font-bold text-white">Precios Gold</h1>
        </div>

        <p className="text-xs text-gray-500">
          Los precios se aplican inmediatamente en el modal de recarga. Los Gold y la cantidad de cada paquete no cambian — solo el monto en Bs.
        </p>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 rounded-full border-2 border-yellow-600 border-t-transparent animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            {TOPUP_PACKAGES.map(pkg => (
              <div key={pkg.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">{pkg.label}</p>
                    <p className="text-xs text-gray-500">{pkg.golds} Gold · {pkg.badge ?? 'Sin badge'}</p>
                    <p className="text-[11px] text-gray-600 mt-0.5 italic">{pkg.description}</p>
                  </div>
                  {pkg.badge && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full text-black" style={{ backgroundColor: GOLD }}>
                      {pkg.badge}
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Precio en Bs</label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Bs</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={prices[pkg.id] ?? ''}
                      onChange={e => setPrices(prev => ({ ...prev, [pkg.id]: e.target.value }))}
                      className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-600"
                      placeholder={String(pkg.priceBs)}
                    />
                  </div>
                  {prices[pkg.id] && parseInt(prices[pkg.id]) > 0 && (
                    <p className="text-[11px] text-gray-600 mt-1">
                      {Math.round(parseInt(prices[pkg.id]) / pkg.golds).toLocaleString('es-VE')} Bs/Gold
                    </p>
                  )}
                </div>
              </div>
            ))}

            {msg && <p className="text-sm text-green-400">{msg}</p>}
            {err && <p className="text-sm text-red-400">{err}</p>}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-xl text-sm font-bold text-black disabled:opacity-40"
              style={{ backgroundColor: GOLD }}>
              {saving ? 'Guardando...' : '💾 Guardar precios'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
