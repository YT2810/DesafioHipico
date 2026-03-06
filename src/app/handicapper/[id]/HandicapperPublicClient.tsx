'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import type { HandicapperStats } from '@/app/api/handicapper/[id]/stats/route';

const LABEL_COLORS: Record<string, string> = {
  'Línea':          'text-blue-400 bg-blue-950/40 border-blue-800/40',
  'Casi Fijo':      'text-yellow-400 bg-yellow-950/40 border-yellow-800/40',
  'Súper Especial': 'text-purple-400 bg-purple-950/40 border-purple-800/40',
  'Buen Dividendo': 'text-green-400 bg-green-950/40 border-green-800/40',
  'Batacazo':       'text-red-400 bg-red-950/40 border-red-800/40',
};
function labelCls(label: string) { return LABEL_COLORS[label] ?? 'text-gray-400 bg-gray-800 border-gray-700'; }

interface Mark { preferenceOrder: number; horseName: string; dorsalNumber?: number; label: string; }
interface RaceData { raceId: string; raceNumber: number; distance: number; scheduledTime: string; conditions: string; isVip: boolean; uploadedByRole?: string; marks: Mark[]; }
interface ProfileData {
  profile: { id: string; userId: string | null; pseudonym: string; bio: string | null; isGhost: boolean; stats: Record<string, number>; createdAt: string };
  meeting: { id: string; meetingNumber: number; date: string; trackName: string } | null;
  races: RaceData[];
}

function StatCard({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="flex flex-col items-center bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 gap-1">
      <span className={`text-2xl font-black ${accent ? 'text-yellow-400' : 'text-white'}`}>{value}</span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

export default function HandicapperPublicClient({ id, initialData }: { id: string; initialData: ProfileData | null }) {
  const { data: session } = useSession();
  const [sharing, setSharing] = useState(false);
  const [stats, setStats] = useState<HandicapperStats | null>(null);
  const data = initialData;

  useEffect(() => {
    fetch(`/api/handicapper/${id}/stats`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setStats(d); })
      .catch(() => {});
  }, [id]);

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-4">🏇</p>
          <p className="text-gray-400">Handicapper no encontrado</p>
          <Link href="/pronosticos" className="mt-4 inline-block text-yellow-400 hover:underline text-sm">← Ver todos los pronósticos</Link>
        </div>
      </div>
    );
  }

  const { profile, meeting, races } = data;
  const sessionUserId = (session?.user as any)?.id as string | undefined;
  const sessionRoles: string[] = (session?.user as any)?.roles ?? [];
  const isOwner = !!(sessionUserId && profile.userId && sessionUserId === profile.userId);
  const canShare = sessionRoles.includes('admin') || sessionRoles.includes('staff') || isOwner;

  const publicRaces = races.filter(r => !r.isVip && r.marks.length > 0);
  const vipCount = races.filter(r => r.isVip).length;

  const dateStr = meeting
    ? new Date(meeting.date).toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  async function handleShareCard() {
    if (sharing) return;
    setSharing(true);
    try {
      const url = `/api/og/handicapper?id=${id}`;
      const res = await fetch(url);
      const blob = await res.blob();
      const filename = `pronosticos-${profile.pseudonym.replace(/\s+/g, '-').toLowerCase()}.png`;
      const file = new File([blob], filename, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Pronósticos de ${profile.pseudonym}${meeting ? ` — ${meeting.trackName} Reunión ${meeting.meetingNumber}` : ''}`,
        });
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
      }
    } catch { /* cancelled */ }
    finally { setSharing(false); }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur border-b border-gray-900 px-4 py-3 flex items-center gap-3">
        <Link href="/pronosticos" className="text-gray-500 hover:text-white transition-colors text-sm">← Pronósticos</Link>
        <span className="text-gray-800">/</span>
        <span className="text-sm font-semibold text-gray-300 truncate">{profile.pseudonym}</span>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

        {/* Profile header */}
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-yellow-900/20 border border-yellow-800/30 flex items-center justify-center shrink-0">
            <span className="text-2xl font-black text-yellow-400">{profile.pseudonym[0].toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black text-white leading-tight">{profile.pseudonym}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {profile.isGhost ? '🤖 Procesado con IA' : '✅ Handicapper verificado'}
            </p>
            {profile.bio && <p className="text-sm text-gray-400 mt-1 leading-relaxed">{profile.bio}</p>}
          </div>
        </div>

        {/* Stats */}
        {stats && stats.totalRaces > 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold">Efectividad histórica</p>
            <div className="grid grid-cols-2 gap-2">
              {stats.e1 !== null && (
                <div className="bg-gray-900 border border-yellow-800/40 rounded-2xl px-4 py-3 flex flex-col items-center gap-1">
                  <span className="text-2xl font-black text-yellow-400">{stats.e1}%</span>
                  <span className="text-xs text-gray-500">E1 — Solo 1ª marca</span>
                </div>
              )}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 flex flex-col items-center gap-1">
                <span className="text-2xl font-black text-white">{stats.eGeneral}%</span>
                <span className="text-xs text-gray-500">E-General — Cualquier marca</span>
              </div>
              {stats.e1_2 !== null && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 flex flex-col items-center gap-1">
                  <span className="text-2xl font-black text-white">{stats.e1_2}%</span>
                  <span className="text-xs text-gray-500">E1-2 — Entre las 2 primeras</span>
                </div>
              )}
              {stats.e1_3 !== null && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 flex flex-col items-center gap-1">
                  <span className="text-2xl font-black text-white">{stats.e1_3}%</span>
                  <span className="text-xs text-gray-500">E1-3 — Entre las 3 primeras</span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-gray-600">{stats.totalRaces} carreras evaluadas{stats.orderedRaces < stats.totalRaces ? ` · ${stats.orderedRaces} con orden` : ''}</span>
              {stats.roi1st !== null && (
                <span className={`text-xs font-bold ${stats.roi1st >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ROI 1ª marca: {stats.roi1st >= 0 ? '+' : ''}{stats.roi1st}%
                </span>
              )}
            </div>
          </div>
        ) : stats && stats.totalRaces === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4 text-center">
            <p className="text-xs text-gray-600">Sin estadísticas aún — se calculan automáticamente cuando hay resultados oficiales</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl h-16" />
            ))}
          </div>
        )}

        {/* Meeting info + share */}
        {meeting && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Pronósticos de hoy</p>
                <p className="text-sm font-semibold text-white">{meeting.trackName} · Reunión {meeting.meetingNumber}</p>
                {dateStr && <p className="text-xs text-gray-500 mt-0.5 capitalize">{dateStr}</p>}
              </div>
              {canShare && (
                <button
                  onClick={handleShareCard}
                  disabled={sharing}
                  className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-yellow-500 hover:bg-yellow-400 text-black transition-colors disabled:opacity-50"
                >
                  {sharing
                    ? <><span className="w-3 h-3 rounded-full border-2 border-black border-t-transparent animate-spin" />Generando...</>
                    : <>📤 Compartir card</>
                  }
                </button>
              )}
            </div>
            {vipCount > 0 && (
              <p className="text-xs text-purple-400/70 mt-2">
                🔒 {vipCount} carrera{vipCount > 1 ? 's' : ''} VIP no incluida{vipCount > 1 ? 's' : ''} en la card
              </p>
            )}
          </div>
        )}

        {/* Races */}
        {publicRaces.length > 0 ? (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Marcas públicas</h2>
            {publicRaces.map(race => (
              <div key={race.raceId} className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden">
                {/* Race header */}
                <div className="px-4 py-2.5 border-b border-gray-800 flex items-center gap-2">
                  <span className="text-sm font-extrabold text-white">Carrera {race.raceNumber}</span>
                  {race.distance > 0 && <span className="text-xs text-gray-500">{race.distance} mts</span>}
                  {race.scheduledTime && <span className="text-xs text-gray-600">{race.scheduledTime}</span>}
                  <span className="ml-auto text-xs">
                    {race.uploadedByRole === 'handicapper' ? '✅' : race.uploadedByRole === 'staff' || race.uploadedByRole === 'admin' ? '📋' : '🤖'}
                  </span>
                </div>
                {/* Marks */}
                <div className="px-4 py-3 space-y-2">
                  {race.marks.map((mark, mi) => (
                    <div key={mi} className="flex items-center gap-2">
                      <span className="w-4 text-center text-xs font-bold text-gray-600">{mark.preferenceOrder}</span>
                      {mark.dorsalNumber != null && (
                        <span className="w-6 h-6 rounded flex items-center justify-center text-xs font-extrabold bg-gray-700 border border-gray-600 text-white shrink-0">
                          {mark.dorsalNumber}
                        </span>
                      )}
                      <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-lg border ${labelCls(mark.label)}`}>
                        {mark.label}
                      </span>
                      <span className="flex-1 text-sm text-white truncate">{mark.horseName}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-700">
            <p className="text-4xl mb-3">🏇</p>
            <p className="text-sm">Sin pronósticos públicos para hoy</p>
          </div>
        )}

        {/* VIP races teaser */}
        {vipCount > 0 && (
          <div className="rounded-2xl border border-purple-900/40 bg-purple-950/10 p-4 text-center">
            <p className="text-sm font-semibold text-purple-300">🔒 {vipCount} carrera{vipCount > 1 ? 's' : ''} VIP</p>
            <p className="text-xs text-purple-400/60 mt-1">Disponible en <Link href="/pronosticos" className="underline hover:text-purple-300">Pronósticos</Link></p>
          </div>
        )}

        {/* CTA for non-logged users */}
        {!session && (
          <div className="rounded-2xl border border-yellow-800/30 bg-yellow-950/10 p-5 text-center">
            <p className="text-base font-bold text-yellow-300 mb-1">Accede a todos los pronósticos</p>
            <p className="text-xs text-gray-500 mb-3">Regístrate gratis para ver las marcas completas y pronósticos VIP</p>
            <Link href="/auth/signin" className="inline-block px-5 py-2.5 rounded-xl text-sm font-bold bg-yellow-500 hover:bg-yellow-400 text-black transition-colors">
              Registrarse gratis
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
