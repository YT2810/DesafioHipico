'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { BcvStatus } from '../_hooks/useAdminStats';

const GOLD = '#D4AF37';

export default function ConfigTab({ bcv }: { bcv: BcvStatus | null }) {
  const [goldIdentifier, setGoldIdentifier] = useState('');
  const [goldAmount, setGoldAmount] = useState('');
  const [goldNote, setGoldNote] = useState('');
  const [goldMsg, setGoldMsg] = useState('');
  const [goldErr, setGoldErr] = useState('');
  const [goldLoading, setGoldLoading] = useState(false);
  const [bulkMsg, setBulkMsg] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [welcomeBonus, setWelcomeBonus] = useState<number>(15);
  const [welcomeBonusInput, setWelcomeBonusInput] = useState('15');
  const [welcomeBonusMsg, setWelcomeBonusMsg] = useState('');
  const [welcomeBonusLoading, setWelcomeBonusLoading] = useState(false);

  useEffect(() => {
    fetch('/api/admin/site-config?key=welcomeBonus')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.value != null) {
          setWelcomeBonus(d.value);
          setWelcomeBonusInput(String(d.value));
        }
      })
      .catch(() => {});
  }, []);

  async function handleSaveWelcomeBonus() {
    const val = parseInt(welcomeBonusInput);
    if (!val || val < 0) return;
    setWelcomeBonusLoading(true);
    setWelcomeBonusMsg('');
    try {
      const res = await fetch('/api/admin/site-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'welcomeBonus', value: val }),
      });
      if (!res.ok) throw new Error('Error al guardar');
      setWelcomeBonus(val);
      setWelcomeBonusMsg(`✅ Bono actualizado a ${val} Gold`);
    } catch (e: any) {
      setWelcomeBonusMsg(`⚠️ ${e.message}`);
    } finally {
      setWelcomeBonusLoading(false);
    }
  }

  async function handleAssignGold() {
    if (!goldIdentifier.trim() || !goldAmount) return;
    setGoldLoading(true);
    setGoldMsg('');
    setGoldErr('');
    try {
      const res = await fetch('/api/admin/users/gold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: goldIdentifier.trim(), amount: parseInt(goldAmount), note: goldNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGoldMsg(`✅ ${data.alias ?? data.email} → nuevo saldo: ${data.newBalance} Gold`);
      setGoldIdentifier('');
      setGoldAmount('');
      setGoldNote('');
    } catch (e: any) {
      setGoldErr(`⚠️ ${e.message}`);
    } finally {
      setGoldLoading(false);
    }
  }

  async function handleBulkWelcome() {
    if (!confirm(`¿Asignar ${welcomeBonus} Gold a todos los usuarios con saldo 0?`)) return;
    setBulkLoading(true);
    setBulkMsg('');
    try {
      const res = await fetch('/api/admin/users/gold/bulk-welcome', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBulkMsg(`✅ ${data.message}`);
    } catch (e: any) {
      setBulkMsg(`⚠️ ${e.message}`);
    } finally {
      setBulkLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Gestión de Gold</p>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-white">Asignar Gold a un usuario</p>
          <div className="flex gap-2 flex-wrap">
            <input
              type="text"
              placeholder="Email o alias"
              value={goldIdentifier}
              onChange={e => setGoldIdentifier(e.target.value)}
              className="flex-1 min-w-[160px] bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600"
            />
            <input
              type="number"
              placeholder="Cantidad"
              value={goldAmount}
              onChange={e => setGoldAmount(e.target.value)}
              className="w-28 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600"
            />
          </div>
          <input
            type="text"
            placeholder="Nota (opcional)"
            value={goldNote}
            onChange={e => setGoldNote(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600"
          />
          {goldMsg && <p className="text-xs text-green-400">{goldMsg}</p>}
          {goldErr && <p className="text-xs text-red-400">{goldErr}</p>}
          <button
            onClick={handleAssignGold}
            disabled={goldLoading || !goldIdentifier || !goldAmount}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-black disabled:opacity-40 transition-opacity"
            style={{ backgroundColor: GOLD }}>
            {goldLoading ? 'Asignando...' : 'Asignar Gold'}
          </button>
        </div>

        <div className="border-t border-gray-800 pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Bono de bienvenida</p>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full text-black" style={{ backgroundColor: GOLD }}>{welcomeBonus}G</span>
          </div>
          <p className="text-xs text-gray-500">Gold que reciben los nuevos usuarios al registrarse y en la bienvenida masiva.</p>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              value={welcomeBonusInput}
              onChange={e => setWelcomeBonusInput(e.target.value)}
              className="w-28 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600"
            />
            <button
              onClick={handleSaveWelcomeBonus}
              disabled={welcomeBonusLoading}
              className="px-4 py-2 rounded-xl text-sm font-bold text-black disabled:opacity-40"
              style={{ backgroundColor: GOLD }}>
              {welcomeBonusLoading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
          {welcomeBonusMsg && <p className="text-xs text-green-400">{welcomeBonusMsg}</p>}
        </div>

        <div className="border-t border-gray-800 pt-4">
          <p className="text-sm font-semibold text-white mb-1">Bienvenida masiva</p>
          <p className="text-xs text-gray-500 mb-3">Asigna <strong className="text-white">{welcomeBonus} Gold</strong> a todos los usuarios con saldo 0.</p>
          {bulkMsg && <p className="text-xs text-green-400 mb-2">{bulkMsg}</p>}
          <button
            onClick={handleBulkWelcome}
            disabled={bulkLoading}
            className="px-5 py-2.5 rounded-xl text-sm font-bold border border-yellow-700/60 text-yellow-400 hover:bg-yellow-950/40 disabled:opacity-40 transition-colors">
            {bulkLoading ? 'Procesando...' : `🎁 Dar ${welcomeBonus}G a todos (saldo 0)`}
          </button>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Tasa de Cambio BCV</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-extrabold text-white">{bcv?.rateVes?.toFixed(2) ?? '—'} Bs/USD</p>
            <p className="text-xs text-gray-500">
              {bcv?.updatedAt ? `Actualizado ${new Date(bcv.updatedAt).toLocaleString('es-VE')}` : 'Sin datos'}
              {bcv?.ageHours ? ` · hace ${bcv.ageHours.toFixed(1)}h` : ''}
            </p>
          </div>
          <Link href="/admin/exchange-rate"
            className="px-4 py-2 rounded-xl text-sm font-bold bg-blue-700 hover:bg-blue-600 text-white transition-colors">
            Actualizar
          </Link>
        </div>
      </div>
    </div>
  );
}
