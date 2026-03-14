'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

const GOLD = '#D4AF37';

interface AudioDetail {
  _id: string;
  title: string;
  description?: string;
  durationSecs?: number;
  priceGolds: number;
  fileUrl?: string; // only present if already purchased or free
  isPublished: boolean;
  handicapperId: { _id: string; pseudonym: string };
  meetingId?: { meetingNumber: number; date: string };
}

function fmtDuration(secs?: number) {
  if (!secs) return null;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function AudioPlayerClient({
  handicapperId,
  audioId,
}: {
  handicapperId: string;
  audioId: string;
}) {
  const { data: session, status } = useSession();
  const [audio, setAudio] = useState<AudioDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchased, setPurchased] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    fetch(`/api/handicapper/${handicapperId}/audios/${audioId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.audio) {
          setAudio(d.audio);
          // fileUrl present = already has access
          if (d.audio.fileUrl && d.audio.priceGolds === 0) setPurchased(true);
          if (d.purchased) setPurchased(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [handicapperId, audioId]);

  async function handlePurchase() {
    if (!session) return;
    setPurchasing(true);
    setError('');
    try {
      const res = await fetch(`/api/handicapper/${handicapperId}/audios/${audioId}/purchase`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al procesar la compra');
      setPurchased(true);
      setAudio(prev => prev ? { ...prev, fileUrl: data.fileUrl } : prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setPurchasing(false);
    }
  }

  function togglePlay() {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-yellow-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!audio) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-center px-4">
        <div>
          <p className="text-4xl mb-4">🎧</p>
          <p className="text-gray-400 mb-4">Audio no encontrado</p>
          <Link href={`/handicapper/${handicapperId}`} className="text-yellow-400 hover:underline text-sm">
            ← Ver perfil del experto
          </Link>
        </div>
      </div>
    );
  }

  const hasFreeAccess = audio.priceGolds === 0;
  const hasAccess = hasFreeAccess || purchased;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur border-b border-gray-900 px-4 py-3 flex items-center gap-3">
        <Link
          href={`/handicapper/${handicapperId}`}
          className="text-gray-500 hover:text-white transition-colors text-sm"
        >
          ← {audio.handicapperId?.pseudonym ?? 'Experto'}
        </Link>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* Audio card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          {/* Cover */}
          <div className="bg-gradient-to-br from-yellow-900/30 to-gray-900 px-6 pt-8 pb-6 flex flex-col items-center gap-3 text-center">
            <div className="w-20 h-20 rounded-2xl bg-yellow-900/20 border border-yellow-800/30 flex items-center justify-center text-4xl">
              🎧
            </div>
            <div>
              <h1 className="text-lg font-black text-white leading-tight">{audio.title}</h1>
              {audio.description && (
                <p className="text-sm text-gray-400 mt-1 leading-relaxed">{audio.description}</p>
              )}
              <div className="flex items-center justify-center gap-3 mt-2 flex-wrap">
                <span className="text-xs text-gray-500 font-semibold">{audio.handicapperId?.pseudonym}</span>
                {audio.meetingId && (
                  <span className="text-xs text-gray-600">
                    Reunión {audio.meetingId.meetingNumber} ·{' '}
                    {new Date(audio.meetingId.date).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', timeZone: 'UTC' })}
                  </span>
                )}
                {audio.durationSecs && (
                  <span className="text-xs text-gray-600">{fmtDuration(audio.durationSecs)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Player / Gate */}
          <div className="px-6 py-5 border-t border-gray-800">
            {hasAccess && audio.fileUrl ? (
              <div className="space-y-4">
                <audio
                  ref={audioRef}
                  src={audio.fileUrl}
                  onEnded={() => setPlaying(false)}
                  onPause={() => setPlaying(false)}
                  onPlay={() => setPlaying(true)}
                  className="hidden"
                />
                <button
                  onClick={togglePlay}
                  className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-black font-extrabold text-base transition-all active:scale-95"
                  style={{ backgroundColor: GOLD }}
                >
                  <span className="text-2xl">{playing ? '⏸' : '▶️'}</span>
                  {playing ? 'Pausar' : 'Reproducir'}
                </button>
                {hasFreeAccess && (
                  <p className="text-xs text-green-400 text-center">🎁 Este audio es gratuito</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Price display */}
                <div className="flex items-center justify-between bg-gray-800/60 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-xs text-gray-500">Precio</p>
                    <p className="text-xl font-black" style={{ color: GOLD }}>🪙 {audio.priceGolds} Golds</p>
                  </div>
                  {audio.durationSecs && (
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Duración</p>
                      <p className="text-base font-bold text-white">{fmtDuration(audio.durationSecs)}</p>
                    </div>
                  )}
                </div>

                {status === 'unauthenticated' ? (
                  <Link
                    href="/auth/signin"
                    className="block w-full py-4 rounded-2xl text-center text-black font-extrabold text-base"
                    style={{ backgroundColor: GOLD }}
                  >
                    Iniciar sesión para comprar
                  </Link>
                ) : (
                  <>
                    {error && (
                      <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/40 rounded-xl px-3 py-2">
                        ⚠️ {error}
                      </p>
                    )}
                    <button
                      onClick={handlePurchase}
                      disabled={purchasing}
                      className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-black font-extrabold text-base disabled:opacity-50 transition-all active:scale-95"
                      style={{ backgroundColor: GOLD }}
                    >
                      {purchasing ? (
                        <>
                          <span className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
                          Procesando...
                        </>
                      ) : (
                        <>🪙 Comprar por {audio.priceGolds} Golds</>
                      )}
                    </button>
                    <p className="text-xs text-gray-600 text-center">
                      El handicapper recibe una parte de cada compra
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Back CTA */}
        <Link
          href={`/handicapper/${handicapperId}`}
          className="block text-center text-sm text-gray-500 hover:text-yellow-400 transition-colors py-2"
        >
          Ver perfil completo de {audio.handicapperId?.pseudonym} →
        </Link>
      </div>
    </div>
  );
}
