'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

const GOLD = '#D4AF37';

export interface TickerEntry {
  id: string;
  pseudonym: string;
  isGhost: boolean;
  e1: number | null;
  eGeneral: number;
  totalRaces: number;
  contactNumber?: string;
}

interface AudioItem {
  _id: string;
  title: string;
  description?: string;
  durationSecs?: number;
  priceGolds: number;
  isPublished: boolean;
  meetingId?: string;
}

interface DrawerProps {
  entry: TickerEntry | null;
  onClose: () => void;
  meetingId?: string;
}

function fmtDuration(secs?: number) {
  if (!secs) return null;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function HandicapperQuickDrawer({ entry, onClose, meetingId }: DrawerProps) {
  const [audios, setAudios] = useState<AudioItem[]>([]);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!entry) return;
    setAudios([]);
    setLoadingAudio(true);
    fetch(`/api/handicapper/${entry.id}/audios${meetingId ? `?meetingId=${meetingId}` : ''}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.audios) setAudios(d.audios); })
      .catch(() => {})
      .finally(() => setLoadingAudio(false));
  }, [entry?.id, meetingId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!entry) return null;

  const hasContact = !!entry.contactNumber;
  const waLink = entry.contactNumber
    ? `https://wa.me/${entry.contactNumber.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${entry.pseudonym}, vi tu perfil en DesafíoHípico y quiero consultar sobre tus pronósticos.`)}`
    : null;

  const e1Display = entry.e1 !== null ? `${entry.e1}%` : null;
  const eGDisplay = `${entry.eGeneral}%`;

  const effectivenessColor =
    (entry.e1 ?? entry.eGeneral) >= 70 ? 'text-green-400' :
    (entry.e1 ?? entry.eGeneral) >= 50 ? 'text-yellow-400' :
    'text-gray-300';

  return (
    <>
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer panel — slides in from right on md+, bottom sheet on mobile */}
      <div className="fixed inset-x-0 bottom-0 z-50 md:inset-x-auto md:right-0 md:top-0 md:bottom-0 md:w-[360px] flex flex-col bg-gray-950 border-t border-gray-800 md:border-t-0 md:border-l md:border-gray-800 rounded-t-2xl md:rounded-none shadow-2xl overflow-hidden animate-slide-up md:animate-slide-left">

        {/* Handle (mobile) */}
        <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-700" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-3 pb-4 md:pt-5 border-b border-gray-800 shrink-0">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black text-black shrink-0"
            style={{ backgroundColor: GOLD }}>
            {entry.pseudonym[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-black text-white truncate">{entry.pseudonym}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {entry.isGhost ? '🤖 Fuente procesada con IA' : '✅ Handicapper verificado'}
            </p>
          </div>
          <button onClick={onClose} className="shrink-0 w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition-colors text-sm">
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Stats */}
          {entry.totalRaces >= 5 ? (
            <div>
              <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold mb-2">Efectividad verificada</p>
              <div className="grid grid-cols-2 gap-2">
                {e1Display && (
                  <div className="bg-gray-900 border border-yellow-800/40 rounded-2xl px-4 py-3 flex flex-col items-center gap-0.5">
                    <span className={`text-2xl font-black ${effectivenessColor}`}>{e1Display}</span>
                    <span className="text-xs text-gray-500">E1 — 1ª marca</span>
                  </div>
                )}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 flex flex-col items-center gap-0.5">
                  <span className="text-2xl font-black text-white">{eGDisplay}</span>
                  <span className="text-xs text-gray-500">E-General</span>
                </div>
              </div>
              <p className="text-xs text-gray-700 text-center mt-1.5">{entry.totalRaces} carreras evaluadas con resultados INH</p>
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 text-center">
              <p className="text-xs text-gray-500">Aún en período de evaluación</p>
              <p className="text-xs text-gray-700 mt-0.5">Se necesitan al menos 5 carreras con resultados</p>
            </div>
          )}

          {/* Audios */}
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold mb-2">🎧 Audios disponibles</p>
            {loadingAudio ? (
              <div className="space-y-2">
                {[1,2].map(i => <div key={i} className="h-14 rounded-xl bg-gray-900 animate-pulse" />)}
              </div>
            ) : audios.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-center">
                <p className="text-xs text-gray-600">Sin audios publicados para hoy</p>
              </div>
            ) : (
              <div className="space-y-2">
                {audios.map(audio => (
                  <div key={audio._id} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center shrink-0 text-lg">
                      🎧
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{audio.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {audio.durationSecs && (
                          <span className="text-xs text-gray-600">{fmtDuration(audio.durationSecs)}</span>
                        )}
                        {audio.priceGolds === 0 ? (
                          <span className="text-xs font-bold text-green-400">Gratis</span>
                        ) : (
                          <span className="text-xs font-bold" style={{ color: GOLD }}>🪙 {audio.priceGolds} Golds</span>
                        )}
                      </div>
                    </div>
                    <Link
                      href={`/handicapper/${entry.id}/audio/${audio._id}`}
                      className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold text-black"
                      style={{ backgroundColor: GOLD }}
                    >
                      {audio.priceGolds === 0 ? 'Escuchar' : 'Comprar'}
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="space-y-2">
            <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold">Acciones</p>

            {/* WhatsApp CTA */}
            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-green-900/30 border border-green-800/50 hover:bg-green-900/50 transition-colors"
              >
                <span className="text-xl shrink-0">🟢</span>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-bold text-green-300">Contactar por WhatsApp</p>
                  <p className="text-xs text-green-700">Consulta sobre sus pronósticos</p>
                </div>
                <span className="text-green-600 text-sm shrink-0">↗</span>
              </a>
            )}

            {/* Ver perfil completo */}
            <Link
              href={`/handicapper/${entry.id}`}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-800 hover:border-yellow-700/50 transition-colors"
            >
              <span className="text-xl shrink-0">📊</span>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-bold text-white">Ver perfil completo</p>
                <p className="text-xs text-gray-600">Historial, estadísticas y pronósticos</p>
              </div>
              <span className="text-gray-600 text-sm shrink-0">›</span>
            </Link>

            {/* Ver pronósticos hoy */}
            <button
              onClick={onClose}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-black font-bold text-sm"
              style={{ backgroundColor: GOLD }}
            >
              <span className="text-xl shrink-0">🏇</span>
              <span className="flex-1 text-left text-sm font-bold">Ver líneas del 5y6 →</span>
            </button>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes slide-left {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
        .animate-slide-up  { animation: slide-up  0.28s cubic-bezier(.32,1,.36,1) both; }
        @media (min-width: 768px) {
          .animate-slide-up { animation: none; }
          .md\\:animate-slide-left { animation: slide-left 0.28s cubic-bezier(.32,1,.36,1) both; }
        }
      `}</style>
    </>
  );
}
