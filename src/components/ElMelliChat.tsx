'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { extractContextParams } from '@/lib/melli-logic';

const GOLD = '#D4AF37';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ElMelliChat() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState('');
  const [focusedMeetingId, setFocusedMeetingId] = useState<string | undefined>();
  const [focusedRaceNumber, setFocusedRaceNumber] = useState<number | undefined>();
  const [contextLoaded, setContextLoaded] = useState(false);
  const [goldBalance, setGoldBalance] = useState<number | null>(null);
  const [activeMeetings, setActiveMeetings] = useState<any[]>([]);
  const [pulse, setPulse] = useState(true);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareMsg, setShareMsg] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadContext = async (meetingId?: string, raceNumber?: number) => {
    try {
      const params = new URLSearchParams();
      if (meetingId)  params.set('meetingId', meetingId);
      if (raceNumber) params.set('raceNumber', String(raceNumber));
      const url = `/api/melli/context${params.size ? '?' + params.toString() : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setContext(data.context ?? '');
        if (data.meetings?.length) setActiveMeetings(data.meetings);
        if (typeof data.goldBalance === 'number') setGoldBalance(data.goldBalance);

        // Solo mostrar bienvenida en la carga inicial (sin parámetros)
        if (!meetingId && !raceNumber) {
          const meetings: any[] = data.meetings ?? [];
          const meetingList = meetings.length > 0
            ? meetings.map((m: any) => `• **${m.trackName}** · Reunión ${m.meetingNumber}`).join('\n')
            : null;
          const welcome = meetingList
            ? `¡Buen día, socio! 🏇 Tengo data cargada para:\n${meetingList}\n\n¿Qué buscas? ¿Marcas de una carrera, el 5y6 completo, o un análisis específico?`
            : `¡Buen día, socio! 🏇 No hay reuniones activas esta semana aún. Pregúntame sobre hipismo criollo o espera que se publique el programa.`;
          setMessages([{ role: 'assistant', content: welcome }]);
          setContextLoaded(true);
        }
      } else if (!meetingId) {
        setMessages([{ role: 'assistant', content: '¡Socio! Hubo un problema cargando la data. Cierra y vuelve a abrir el chat. 🔄' }]);
        setContextLoaded(true);
      }
    } catch {
      if (!meetingId) {
        setMessages([{ role: 'assistant', content: 'Se fue la luz al cargar la data, socio. Intenta de nuevo. ⚡' }]);
        setContextLoaded(true);
      }
    }
  };

  const handleOpen = () => {
    setOpen(true);
    setPulse(false);
    if (!contextLoaded) loadContext();
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    // Detectar si el mensaje menciona carrera/hipódromo específico y recargar contexto
    let currentContext = context;
    let resolvedMeetingId: string | undefined = focusedMeetingId;
    let resolvedRaceNumber: number | undefined = focusedRaceNumber;
    let resolvedValidaRef: number | undefined;
    try {
      const params = extractContextParams(text);

      // Resolver meetingId: del hint de hipódromo, o el único activo, o el que ya está en foco
      let meetingId: string | undefined;
      if (params.trackHint && activeMeetings.length > 0) {
        const match = activeMeetings.find((m: any) =>
          params.trackHint === 'rinconada'
            ? /rinconada/i.test(m.trackName)
            : /valencia/i.test(m.trackName)
        );
        meetingId = match?.id;
      } else if (activeMeetings.length === 1) {
        meetingId = activeMeetings[0].id;
      } else if (focusedMeetingId) {
        meetingId = focusedMeetingId; // mantener el hipódromo del mensaje anterior
      } else if (params.needsRefresh && activeMeetings.length > 0) {
        // Sin foco previo y sin hint: preferir La Rinconada, si no el primero
        const rinconada = activeMeetings.find((m: any) => /rinconada/i.test(m.trackName));
        meetingId = (rinconada ?? activeMeetings[0]).id;
      }

      // Si el mensaje tiene referencia a carrera nueva → actualizar foco
      // Si no tiene referencia pero ya hay un foco activo → reusar ese foco
      const newRaceNumber  = params.raceNumber;
      const newValidaRef   = params.validaRef;
      const hasNewRaceFocus = !!(newRaceNumber || newValidaRef);

      const effectiveRaceNumber = hasNewRaceFocus ? newRaceNumber  : focusedRaceNumber;
      const effectiveValidaRef  = hasNewRaceFocus ? newValidaRef   : undefined;

      // Propagar a variables externas al try
      resolvedMeetingId = meetingId ?? focusedMeetingId;
      resolvedRaceNumber = effectiveRaceNumber;
      resolvedValidaRef = effectiveValidaRef;

      // Recargar si hay algo nuevo O si hay foco activo que contextualiza esta pregunta
      if (params.needsRefresh || focusedMeetingId || focusedRaceNumber) {
        const qp = new URLSearchParams();
        if (meetingId)              qp.set('meetingId',  meetingId);
        if (effectiveRaceNumber)    qp.set('raceNumber', String(effectiveRaceNumber));
        if (effectiveValidaRef)     qp.set('validaRef',  String(effectiveValidaRef));
        const res2 = await fetch(`/api/melli/context?${qp.toString()}`);
        if (res2.ok) {
          const d2 = await res2.json();
          currentContext = d2.context ?? context;
          setContext(currentContext);
          // Actualizar foco solo si el mensaje trajo info nueva
          if (meetingId)         setFocusedMeetingId(meetingId);
          if (hasNewRaceFocus)   setFocusedRaceNumber(effectiveRaceNumber);
        }
      }
    } catch { /* contexto previo se mantiene */ }

    try {
      const res = await fetch('/api/melli/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          context: currentContext,
          meetingId: resolvedMeetingId,
          raceNumber: resolvedRaceNumber,
          validaRef: resolvedValidaRef,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.goldBalance != null) setGoldBalance(data.goldBalance);
        // Actualizar foco de carrera con lo que el LLM reportó en ##LOG##
        if (data.logRace) setFocusedRaceNumber(data.logRace);
        const content = data.refunded
          ? `${data.content}\n\n↩️ _Tus ${data.goldDeducted === 0 ? '' : data.goldDeducted + ' '}Golds fueron reembolsados automáticamente._`
          : data.content;
        setMessages(prev => [...prev, { role: 'assistant', content }]);
      } else if (res.status === 402) {
        const err = await res.json();
        const needed = err.required ?? 0;
        const have   = err.available ?? 0;
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Socio, esta consulta cuesta **${needed} Golds** y tienes **${have}**. \n\n💡 Comparte Desafío Hípico con tus socios y gana tokens gratis. ¿Lo hacemos?`,
        }]);
      } else if (res.status === 422) {
        const err = await res.json();
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: err.message ?? 'Aún no hay suficiente data publicada para esta carrera, socio. Vuelve más tarde.',
        }]);
      } else {
        const err = await res.json().catch(() => ({}));
        const errMsg = err.error === 'coming_soon'
          ? 'El Melli está en modo privado por ahora, socio. Pronto estará disponible para todos. 🏇'
          : 'El sistema tuvo un problema, socio. Intenta de nuevo.';
        setMessages(prev => [...prev, { role: 'assistant', content: errMsg }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Se fue la luz en el sistema, socio. Intenta de nuevo. ⚡' }]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        inputRef.current?.focus();
      }, 100);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  // Render markdown-lite: bold **text**
  const renderContent = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) =>
      part.startsWith('**') && part.endsWith('**')
        ? <strong key={i}>{part.slice(2, -2)}</strong>
        : <span key={i}>{part}</span>
    );
  };

  if (status === 'loading') return null;

  return (
    <>
      {/* ── Floating Button ── */}
      {!open && (
        <button
          onClick={handleOpen}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95 pr-4"
          style={{
            background: `linear-gradient(135deg, #1a1200 0%, #2a1e00 100%)`,
            border: `2px solid ${GOLD}80`,
            boxShadow: `0 0 20px ${GOLD}40`,
            height: 52,
            paddingLeft: 8,
          }}
        >
          {/* Pulse ring */}
          {pulse && (
            <span className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ backgroundColor: GOLD }} />
          )}
          {/* Horse icon */}
          <span
            className="w-9 h-9 rounded-full flex items-center justify-center text-xl font-black shrink-0"
            style={{ backgroundColor: GOLD, color: '#000' }}
          >
            🏇
          </span>
          <span className="text-xs font-black leading-tight" style={{ color: GOLD }}>
            El Melli<br />
            <span className="text-gray-400 font-normal text-[10px]">Analista IA</span>
          </span>
        </button>
      )}

      {/* ── Chat Panel ── */}
      {open && (
        <div
          className="fixed bottom-4 right-4 z-50 flex flex-col rounded-2xl overflow-hidden shadow-2xl border"
          style={{
            width: 'min(380px, calc(100vw - 2rem))',
            height: 'min(560px, calc(100dvh - 5rem))',
            background: '#0d0d0d',
            borderColor: `${GOLD}40`,
            boxShadow: `0 0 40px ${GOLD}20`,
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-3 shrink-0"
            style={{ background: `linear-gradient(135deg, #1a1200, #2a1e00)`, borderBottom: `1px solid ${GOLD}30` }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-lg font-black shrink-0"
              style={{ backgroundColor: GOLD, color: '#000' }}
            >
              🏇
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black leading-none" style={{ color: GOLD }}>El Melli</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Analista Hípico IA · Desafío Hípico</p>
            </div>
            {goldBalance !== null && (
              <span className="text-[10px] font-bold px-2 py-1 rounded-full shrink-0"
                style={{ background: 'rgba(212,175,55,0.15)', color: GOLD, border: `1px solid ${GOLD}40` }}>
                {goldBalance} G
              </span>
            )}
            <button
              onClick={() => setOpen(false)}
              className="text-gray-600 hover:text-gray-300 transition-colors text-lg leading-none px-1"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 text-sm">
            {messages.length === 0 && !contextLoaded && (
              <div className="flex items-center gap-2 text-gray-500 text-xs py-4 justify-center">
                <span className="animate-spin">⚙️</span> Cargando data hípica…
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 mr-2 mt-0.5 font-black"
                    style={{ backgroundColor: GOLD, color: '#000' }}
                  >
                    M
                  </span>
                )}
                <div
                  className={`rounded-2xl px-3 py-2 max-w-[85%] text-xs leading-relaxed whitespace-pre-wrap`}
                  style={
                    msg.role === 'user'
                      ? { background: '#1e1a0d', border: `1px solid ${GOLD}30`, color: '#e5e0c8' }
                      : { background: '#161616', border: '1px solid #2a2a2a', color: '#d1d1d1' }
                  }
                >
                  {renderContent(msg.content)}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 mr-2 font-black"
                  style={{ backgroundColor: GOLD, color: '#000' }}
                >
                  M
                </span>
                <div className="rounded-2xl px-3 py-2 text-xs text-gray-500" style={{ background: '#161616', border: '1px solid #2a2a2a' }}>
                  <span className="animate-pulse">El Melli está revisando los números…</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggested prompts — only on empty chat */}
          {messages.length <= 1 && contextLoaded && (
            <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto shrink-0">
              {[
                '2 marcas carrera 7',
                'Paquete 5y6',
                '¿Qué reuniones hay hoy?',
              ].map(prompt => (
                <button
                  key={prompt}
                  onClick={() => { setInput(prompt); inputRef.current?.focus(); }}
                  className="text-[10px] whitespace-nowrap rounded-full px-3 py-1 border transition-colors shrink-0"
                  style={{ borderColor: `${GOLD}40`, color: GOLD, background: '#1a1200' }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div
            className="flex items-center gap-2 px-3 py-2.5 shrink-0"
            style={{ borderTop: `1px solid ${GOLD}20`, background: '#111' }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Pregúntale al Melli…"
              maxLength={400}
              disabled={loading}
              className="flex-1 bg-transparent text-xs text-gray-200 placeholder-gray-600 outline-none"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all disabled:opacity-30"
              style={{ backgroundColor: GOLD, color: '#000' }}
            >
              ↑
            </button>
          </div>

          {/* Share to earn + Slogan footer */}
          <div
            className="text-center py-1.5 shrink-0 space-y-1"
            style={{ borderTop: `1px solid ${GOLD}10` }}
          >
            {shareMsg ? (
              <p className="text-[10px] px-3" style={{ color: GOLD }}>{shareMsg}</p>
            ) : (
              <button
                disabled={shareLoading}
                onClick={async () => {
                  setShareLoading(true);
                  setShareMsg('');
                  const shareData = {
                    title: 'El Melli — Analista Hípico IA',
                    text: 'Estoy usando la IA de @DesafioHipico para analizar la jornada hípica. ¡Regístrate y recibe tokens gratis!',
                    url: 'https://www.desafiohipico.com?ref=share',
                  };
                  try {
                    if (navigator.share) {
                      await navigator.share(shareData);
                    } else {
                      await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
                    }
                    const res = await fetch('/api/melli/share-bonus', { method: 'POST' });
                    if (res.ok) {
                      const d = await res.json();
                      setGoldBalance(d.newBalance);
                      setShareMsg(`+${d.granted} Golds acreditados. ¡Gracias, socio!`);
                    } else {
                      const err = await res.json().catch(() => ({}));
                      setShareMsg(err.message ?? 'Ya reclamaste tu bonus hoy.');
                    }
                  } catch {
                    setShareMsg('Comparte para reclamar tu bonus.');
                  } finally {
                    setShareLoading(false);
                    setTimeout(() => setShareMsg(''), 5000);
                  }
                }}
                className="text-[10px] px-3 py-0.5 rounded-full transition-all hover:opacity-80"
                style={{ color: GOLD, border: `1px solid ${GOLD}30`, background: '#1a1200' }}
              >
                🎁 Compartir y ganar 5 Golds
              </button>
            )}
            <p className="text-[9px] font-bold tracking-widest" style={{ color: `${GOLD}60` }}>
              YA CORRIÓ · YA GANÓ · YA COBRÓ
            </p>
          </div>
        </div>
      )}
    </>
  );
}
