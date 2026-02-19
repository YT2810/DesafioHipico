'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const GOLD = '#D4AF37';
const ALL_ROLES = ['customer', 'handicapper', 'admin', 'staff'] as const;
type Role = typeof ALL_ROLES[number];

interface UserItem {
  _id: string;
  email?: string;
  alias?: string;
  fullName?: string;
  telegramId?: string;
  roles: Role[];
  balance: { golds: number };
  createdAt: string;
}

const ROLE_CFG: Record<Role, { color: string; bg: string; border: string }> = {
  customer:    { color: 'text-gray-400',   bg: 'bg-gray-800',        border: 'border-gray-700'   },
  handicapper: { color: 'text-yellow-400', bg: 'bg-yellow-950/40',   border: 'border-yellow-700/50' },
  staff:       { color: 'text-blue-400',   bg: 'bg-blue-950/40',     border: 'border-blue-700/50'   },
  admin:       { color: 'text-red-400',    bg: 'bg-red-950/40',      border: 'border-red-700/50'    },
};

export default function AdminUsersPage() {
  const [query, setQuery] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<UserItem | null>(null);
  const [editRoles, setEditRoles] = useState<Role[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveErr, setSaveErr] = useState('');

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(debouncedQ)}`);
      const data = await res.json();
      setUsers(data.users ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedQ]);

  useEffect(() => { load(); }, [load]);

  function openUser(u: UserItem) {
    setSelected(u);
    setEditRoles([...u.roles]);
    setSaveMsg('');
    setSaveErr('');
  }

  function toggleRole(role: Role) {
    setEditRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  }

  async function handleSaveRoles() {
    if (!selected) return;
    setSaving(true);
    setSaveMsg('');
    setSaveErr('');
    try {
      const res = await fetch(`/api/admin/users/${selected._id}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roles: editRoles }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error');
      setSaveMsg('✅ Roles actualizados');
      setUsers(prev => prev.map(u => u._id === selected._id ? { ...u, roles: editRoles } : u));
      setSelected(prev => prev ? { ...prev, roles: editRoles } : null);
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="sticky top-0 z-20 border-b border-gray-800 bg-gray-950/95 backdrop-blur px-4 py-3">
        <div className="mx-auto max-w-3xl flex items-center gap-3">
          <Link href="/perfil" className="text-gray-500 hover:text-white text-lg leading-none shrink-0">←</Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-white">👥 Gestión de Usuarios</h1>
            <p className="text-xs text-gray-500">{total} usuario{total !== 1 ? 's' : ''} registrados</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5 space-y-4">

        {/* Search */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 text-sm">🔍</span>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por email, nombre, alias o Telegram ID..."
            className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600 transition-colors"
          />
        </div>

        {/* User list */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => <div key={i} className="h-16 rounded-2xl bg-gray-900 animate-pulse" />)}
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-gray-700">
            <p className="text-4xl mb-3">👤</p>
            <p className="text-sm">No se encontraron usuarios</p>
          </div>
        ) : (
          <div className="space-y-2">
            {users.map(u => {
              const isSelected = selected?._id === u._id;
              return (
                <div key={u._id}
                  className={`rounded-2xl border bg-gray-900 overflow-hidden transition-all ${isSelected ? 'border-yellow-700/60' : 'border-gray-800'}`}>

                  <button
                    onClick={() => isSelected ? setSelected(null) : openUser(u)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-800/30 transition-colors">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold text-black shrink-0"
                        style={{ backgroundColor: GOLD }}>
                        {(u.alias ?? u.email ?? 'U')[0].toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-white truncate">{u.alias ?? u.email ?? `tg:${u.telegramId}`}</span>
                          {u.email && <span className="text-xs text-gray-600 truncate">{u.email}</span>}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {u.roles.map(r => (
                            <span key={r} className={`text-xs px-1.5 py-0.5 rounded-full border font-semibold ${ROLE_CFG[r].color} ${ROLE_CFG[r].bg} ${ROLE_CFG[r].border}`}>
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold" style={{ color: GOLD }}>🪙 {u.balance?.golds ?? 0}</p>
                        <p className="text-xs text-gray-700">{new Date(u.createdAt).toLocaleDateString('es-VE')}</p>
                      </div>
                    </div>
                  </button>

                  {/* Expanded role editor */}
                  {isSelected && (
                    <div className="border-t border-gray-800 px-4 py-4 space-y-4 bg-gray-900/80">
                      <div>
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-3">Asignar roles</p>
                        <div className="flex gap-2 flex-wrap">
                          {ALL_ROLES.map(role => {
                            const active = editRoles.includes(role);
                            const cfg = ROLE_CFG[role];
                            return (
                              <button
                                key={role}
                                onClick={() => toggleRole(role)}
                                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                                  active
                                    ? `${cfg.color} ${cfg.bg} ${cfg.border}`
                                    : 'text-gray-600 bg-gray-800 border-gray-700 hover:border-gray-600'
                                }`}>
                                {active ? '✓ ' : ''}{role}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* User details */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {u.email && (
                          <div className="bg-gray-800/50 rounded-lg px-2.5 py-2 col-span-2">
                            <p className="text-gray-600 mb-0.5">Email</p>
                            <p className="text-white font-mono">{u.email}</p>
                          </div>
                        )}
                        {u.fullName && (
                          <div className="bg-gray-800/50 rounded-lg px-2.5 py-2">
                            <p className="text-gray-600 mb-0.5">Nombre</p>
                            <p className="text-white">{u.fullName}</p>
                          </div>
                        )}
                        {u.telegramId && (
                          <div className="bg-gray-800/50 rounded-lg px-2.5 py-2">
                            <p className="text-gray-600 mb-0.5">Telegram ID</p>
                            <p className="text-white font-mono">{u.telegramId}</p>
                          </div>
                        )}
                        <div className="bg-gray-800/50 rounded-lg px-2.5 py-2">
                          <p className="text-gray-600 mb-0.5">Saldo</p>
                          <p className="font-bold" style={{ color: GOLD }}>{u.balance?.golds ?? 0} Golds</p>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg px-2.5 py-2">
                          <p className="text-gray-600 mb-0.5">Registrado</p>
                          <p className="text-white">{new Date(u.createdAt).toLocaleDateString('es-VE')}</p>
                        </div>
                      </div>

                      {saveErr && <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/40 rounded-xl px-3 py-2">⚠️ {saveErr}</p>}
                      {saveMsg && <p className="text-xs text-green-400 bg-green-950/40 border border-green-800/40 rounded-xl px-3 py-2">{saveMsg}</p>}

                      <button
                        onClick={handleSaveRoles}
                        disabled={saving}
                        className="w-full py-2.5 rounded-xl text-sm font-bold text-black disabled:opacity-50 transition-opacity"
                        style={{ backgroundColor: GOLD }}>
                        {saving ? 'Guardando...' : 'Guardar roles'}
                      </button>
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
