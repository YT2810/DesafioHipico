'use client';

/**
 * MOCKUP VISUAL — Revista Digital Desafío Hípico
 * Página de demostración estática para evaluar el diseño antes de implementar.
 * No conecta a la DB — usa datos de ejemplo reales de la Reunión 12, 15/03/2026.
 */

const GOLD = '#D4AF37';

// ── Datos de ejemplo basados en datos reales de la Reunión 12, 15/03/2026 ──

const MEETING = {
  trackName: 'La Rinconada',
  meetingNumber: 12,
  date: '15/03/2026',
  hora: '01:00 P.M.',
  condicionesPista: 'Normal',
};

const RETIRADOS = [
  { carrera: 2, nombre: 'POMPEYO', dorsal: 6, causa: 'Claudicación miembro anterior derecho' },
  { carrera: 3, nombre: 'BELLA CATIRA', dorsal: 7, causa: 'Traumatismo mandibular' },
  { carrera: 5, nombre: 'EKATI KING (USA)', dorsal: 1, causa: 'Cólico' },
  { carrera: 13, nombre: 'REY ENIGMA', dorsal: 9, causa: 'Leucocitosis' },
];

const RACES = [
  {
    numero: 1,
    anuario: 109,
    distancia: 1400,
    hora: '01:00',
    condiciones: 'Handicap Libre — Caballos Nacionales e Importados de 4 Años, Ganadores de 2 y 3 Carreras',
    premio: { bs: 3400, usd: null },
    jugadas: ['GANADOR', 'PLACE', 'EXACTA'],
    incidente: null,
    informeJinetes: null,
    llegada: ['SEÑOR SOÑADOR', 'PROMETHEUS', 'FATHER HEART', 'THE SOLDIER'],
    entries: [
      { dorsal: 1, nombre: 'THE SOLDIER', entrenador: 'Pedro Cárdenas', jinete: 'P. Fernández', pesoDeclarado: '55', pesoReal: 463, med: null, impl: null,
        trabajo: { fecha: 'Mié 11/03', distancia: '600mts', tipo: 'EP', tiempos: '16,4 – 29,3 – 42,1', comentario: 'Muy cómodo y SHN', jineteWork: 'R.Torres', diasDescanso: 1 } },
      { dorsal: 2, nombre: 'FATHER HEART', entrenador: 'R. Alemán Jr.', jinete: 'R. Torres', pesoDeclarado: '55', pesoReal: 482, med: null, impl: null,
        trabajo: { fecha: 'Mié 11/03', distancia: '600mts', tipo: 'EP', tiempos: '16,4 – 29,3 – 42,1', comentario: 'Muy cómodo y SHN', jineteWork: 'R.Torres', diasDescanso: 1 } },
      { dorsal: 3, nombre: 'PROMETHEUS', entrenador: 'L. Langluir', jinete: 'R. Capriles', pesoDeclarado: '55', pesoReal: 513, med: 'BUT-LAX', impl: null,
        trabajo: { fecha: 'Sáb 14/03', distancia: '600mts', tipo: 'EP', tiempos: '15,3 – 28,4 – 41,2', comentario: 'Animado y respondió', jineteWork: 'R.Capriles', diasDescanso: 3 } },
      { dorsal: 4, nombre: 'SEÑOR SOÑADOR', entrenador: 'R. D\'Angelo', jinete: 'R. Quevedo', pesoDeclarado: '55', pesoReal: 494, med: null, impl: null,
        trabajo: { fecha: 'Sáb 14/03', distancia: '600mts', tipo: 'ES', tiempos: '14,1 – 26,3 – 38,1', comentario: 'Veloz sin hacerle nada — fenómeno', jineteWork: 'F.Quevedo', diasDescanso: 3 } },
    ],
    pronosticos: [
      { experto: 'Leyenda Hípica', e1: 60, picks: [4, 3, 2], label: 'Línea' },
      { experto: 'Un Hípico', e1: 60, picks: [3, 4, 1], label: 'Casi Fijo' },
      { experto: 'Mundo Hípico', e1: 54, picks: [4, 2, 3], label: 'Línea' },
    ],
  },
  {
    numero: 2,
    anuario: 110,
    distancia: 1200,
    hora: '01:25',
    condiciones: 'Para Caballos Nacionales de 3 Años y Más — Reclamable',
    premio: { bs: 2800, usd: null },
    jugadas: ['GANADOR', 'PLACE', 'EXACTA', 'TRIFECTA'],
    incidente: 'La prueba fue sometida a OBSERVACIÓN por incidentes a los 800mts finales. MULTA al entrenador HENRY TRUJILLO (THE KING ZEUS N°08, silla rodada). RECLAMO INFUNDADO: jinete R. Capriles multado.',
    informeJinetes: [
      { jinete: 'Oliver Medina', caballo: 'BACO', dorsal: 1, informe: 'En la recta final se cargó un poco hacia afuera.' },
      { jinete: 'German González', caballo: 'SUANFONSON', dorsal: 4, informe: 'Venía haciendo extraños.' },
      { jinete: 'Luis Gota', caballo: 'THE KING ZEUS', dorsal: 8, informe: 'Se le rodó la silla, tuvo que soltar los estribos a los 800mts finales.' },
    ],
    llegada: ['BACO', 'GRAN PEPE', 'BRAVUCON', 'SUANFONSON', 'SHAKMAN'],
    entries: [
      { dorsal: 1, nombre: 'BACO', entrenador: 'F. Parilli', jinete: 'O. Medina', pesoDeclarado: '55', pesoReal: 445, med: null, impl: null, trabajo: null },
      { dorsal: 2, nombre: 'BRAVUCON', entrenador: 'J. Romero', jinete: 'A. Alemán', pesoDeclarado: '55', pesoReal: 451, med: null, impl: null, trabajo: null },
      { dorsal: 3, nombre: 'GRAN PEPE', entrenador: 'O. González', jinete: 'R. Capriles', pesoDeclarado: '55', pesoReal: 464, med: null, impl: null,
        trabajo: { fecha: 'Mié 11/03', distancia: '2 vueltas galopo', tipo: 'EP', tiempos: null, comentario: null, jineteWork: 'G.A. Barrios', diasDescanso: 2 } },
      { dorsal: 4, nombre: 'SUANFONSON', entrenador: 'F. Parilli', jinete: 'G. González', pesoDeclarado: '55', pesoReal: 467, med: null, impl: null, trabajo: null },
      { dorsal: 6, nombre: 'POMPEYO', entrenador: 'J. Romero', jinete: '—', pesoDeclarado: '55', pesoReal: null, med: null, impl: null, trabajo: null, retirado: true },
      { dorsal: 7, nombre: 'SHAKMAN', entrenador: 'H. Trujillo', jinete: 'L. Gota', pesoDeclarado: '55', pesoReal: 472, med: null, impl: null, trabajo: null },
      { dorsal: 8, nombre: 'THE KING ZEUS', entrenador: 'H. Trujillo', jinete: 'L. Gota', pesoDeclarado: '55', pesoReal: 472, med: null, impl: null, trabajo: null },
    ],
    pronosticos: [
      { experto: 'Leyenda Hípica', e1: 60, picks: [1, 3, 7], label: 'Línea' },
      { experto: 'Un Hípico', e1: 60, picks: [3, 1, 8], label: 'Casi Fijo' },
    ],
  },
];

// ── Helpers ──

function DorsalChip({ n, gold }: { n: number; gold?: boolean }) {
  return (
    <span
      className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-extrabold border"
      style={gold
        ? { backgroundColor: 'rgba(212,175,55,0.2)', color: GOLD, borderColor: 'rgba(212,175,55,0.4)' }
        : { backgroundColor: 'rgba(255,255,255,0.05)', color: '#e5e7eb', borderColor: '#374151' }}
    >
      {n}
    </span>
  );
}

function Badge({ text, color }: { text: string; color: 'yellow' | 'red' | 'blue' | 'green' | 'gray' }) {
  const styles: Record<string, string> = {
    yellow: 'bg-yellow-950/50 border-yellow-700/40 text-yellow-300',
    red:    'bg-red-950/50 border-red-700/40 text-red-300',
    blue:   'bg-blue-950/50 border-blue-700/40 text-blue-300',
    green:  'bg-green-950/50 border-green-700/40 text-green-300',
    gray:   'bg-gray-800/50 border-gray-700/40 text-gray-400',
  };
  return (
    <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded border ${styles[color]}`}>
      {text}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1">{children}</p>
  );
}

// ── Componente principal ──

export default function RevistaDemoPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">

      {/* ══ CABECERA REVISTA ══ */}
      <header className="border-b border-yellow-700/30 bg-gray-900">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <div className="flex items-center justify-between mb-1">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Desafío Hípico · Edición digital</span>
              <h1 className="text-2xl font-extrabold" style={{ color: GOLD }}>
                🏇 La Rinconada
              </h1>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Domingo</p>
              <p className="text-lg font-extrabold text-white">15/03/2026</p>
              <p className="text-xs text-gray-500">Hora: 01:00 P.M.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-2 items-center">
            <Badge text="Reunión 12" color="yellow" />
            <Badge text="12 carreras" color="gray" />
            <Badge text="Pista: Normal" color="green" />
            <Badge text="MOCKUP — solo datos de ejemplo" color="red" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-5 space-y-8">

        {/* ══ RETIRADOS DEL DÍA (con causa) ══ */}
        <section>
          <SectionLabel>⚠️ Retirados del día</SectionLabel>
          <div className="rounded-2xl border border-red-900/40 bg-red-950/20 overflow-hidden">
            <div className="divide-y divide-red-900/20">
              {RETIRADOS.map((r, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-2.5">
                  <span className="shrink-0 w-6 h-6 rounded bg-red-900/40 border border-red-700/30 flex items-center justify-center text-xs font-bold text-red-400">
                    C{r.carrera}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white line-through opacity-60">{r.nombre}</p>
                    <p className="text-xs text-red-400/80 mt-0.5">{r.causa}</p>
                  </div>
                  <span className="shrink-0 text-xs text-gray-700">#{r.dorsal}</span>
                </div>
              ))}
            </div>
            <div className="px-4 py-2 border-t border-red-900/20">
              <p className="text-[10px] text-gray-700 italic">✅ Dato disponible: los retirados ya están en el sistema. La CAUSA requiere parsear la Resolución de Comisarios (R-012).</p>
            </div>
          </div>
        </section>

        {/* ══ CARRERAS ══ */}
        {RACES.map(race => (
          <section key={race.numero}>

            {/* Encabezado de carrera */}
            <div className="rounded-t-2xl border border-gray-700 bg-gray-900 px-4 py-3">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-extrabold text-white">
                      Carrera {race.numero}
                    </span>
                    <span className="text-xs text-gray-600">C{race.anuario} · {race.distancia}mts · {race.hora}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{race.condiciones}</p>
                  {race.premio.bs > 0 && (
                    <p className="text-xs font-semibold mt-1" style={{ color: GOLD }}>
                      Premio Bs. {race.premio.bs.toLocaleString('es-VE')}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 shrink-0">
                  {race.jugadas.map(j => (
                    <Badge key={j} text={j.replace('_', ' ')} color="gray" />
                  ))}
                </div>
              </div>
            </div>

            {/* ── Tabla inscritos + trabajos ── */}
            <div className="border-x border-gray-700 bg-gray-900 overflow-hidden">
              {/* Cabecera columnas */}
              <div className="grid px-3 py-1.5 border-y border-gray-800 text-[10px] font-semibold text-gray-600 uppercase tracking-wide"
                style={{ gridTemplateColumns: '2rem 1fr 3rem 4.5rem 1fr' }}>
                <span className="text-center">#</span>
                <span>Ejemplar · Entrenador</span>
                <span className="text-center">Kg</span>
                <span className="text-center">Trabajo</span>
                <span>Jinete</span>
              </div>

              <div className="divide-y divide-gray-800/40">
                {race.entries.map((e: any) => (
                  <div key={e.dorsal}
                    className={`grid px-3 py-2.5 gap-x-2 items-start ${(e as any).retirado ? 'opacity-40' : ''}`}
                    style={{ gridTemplateColumns: '2rem 1fr 3rem 4.5rem 1fr' }}>

                    {/* Dorsal */}
                    <div className="flex justify-center pt-0.5">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-extrabold border ${
                        (e as any).retirado
                          ? 'bg-red-950/30 border-red-800/30 text-red-400 line-through'
                          : 'bg-gray-800 border-gray-700 text-white'
                      }`}>
                        {e.dorsal}
                      </span>
                    </div>

                    {/* Caballo + entrenador + medicación */}
                    <div className="min-w-0">
                      <p className={`text-sm font-bold leading-tight truncate ${(e as any).retirado ? 'text-gray-500 line-through' : 'text-white'}`}>
                        {e.nombre}
                      </p>
                      <p className="text-xs text-gray-600 truncate">{e.entrenador}</p>
                      <div className="flex gap-1 mt-0.5">
                        {e.med && <Badge text={e.med.replace('-', '+')} color="blue" />}
                        {e.impl && <Badge text={e.impl} color="gray" />}
                        {(e as any).retirado && <Badge text="RET" color="red" />}
                      </div>
                    </div>

                    {/* Peso declarado / real */}
                    <div className="text-center">
                      <p className="text-sm font-bold text-white">{e.pesoDeclarado}</p>
                      {e.pesoReal && (
                        <p className="text-[9px] text-gray-600 leading-tight">
                          {e.pesoReal}kg
                          <span className="block text-[8px] text-gray-700">real</span>
                        </p>
                      )}
                    </div>

                    {/* Trabajo */}
                    <div className="min-w-0">
                      {e.trabajo ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 flex-wrap">
                            <Badge
                              text={e.trabajo.tipo === 'EP' ? 'En Pelo' : e.trabajo.tipo === 'ES' ? 'En Silla' : e.trabajo.tipo}
                              color={e.trabajo.tipo === 'EP' ? 'blue' : 'gray'}
                            />
                            <span className="text-[9px] text-gray-600">{e.trabajo.distancia}</span>
                          </div>
                          {e.trabajo.tiempos && (
                            <p className="text-[10px] font-mono text-yellow-500/80 leading-tight">{e.trabajo.tiempos}</p>
                          )}
                          {e.trabajo.comentario && (
                            <p className="text-[9px] text-gray-500 leading-tight italic truncate">{e.trabajo.comentario}</p>
                          )}
                          <p className="text-[9px] text-gray-700 leading-tight">{e.trabajo.fecha} · {e.trabajo.jineteWork}</p>
                          {e.trabajo.diasDescanso !== undefined && (
                            <Badge
                              text={`${e.trabajo.diasDescanso}D`}
                              color={e.trabajo.diasDescanso <= 3 ? 'green' : e.trabajo.diasDescanso <= 7 ? 'yellow' : 'gray'}
                            />
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-700 italic">Sin dato</span>
                      )}
                    </div>

                    {/* Jinete */}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-300 leading-tight truncate">{e.jinete}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Pronósticos de expertos (resumen) ── */}
            {race.pronosticos.length > 0 && (
              <div className="border-x border-gray-700 bg-gray-900/60 px-3 py-2.5 space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">🎯 Pronósticos</p>
                {race.pronosticos.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-gray-300 w-28 truncate">{p.experto}</span>
                    <Badge text={`E1 ${p.e1}%`} color="yellow" />
                    <div className="flex gap-1">
                      {p.picks.map((d, di) => (
                        <DorsalChip key={di} n={d} gold={di === 0} />
                      ))}
                    </div>
                    <Badge text={p.label} color="gray" />
                  </div>
                ))}
              </div>
            )}

            {/* ── Incidentes / Resolución de comisarios ── */}
            {race.incidente && (
              <div className="border-x border-orange-800/30 bg-orange-950/20 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-orange-500/70 mb-1">⚖️ Resolución de comisarios</p>
                <p className="text-xs text-orange-200/70 leading-relaxed">{race.incidente}</p>
              </div>
            )}

            {/* ── Informes de jinetes ── */}
            {race.informeJinetes && race.informeJinetes.length > 0 && (
              <div className="border-x border-gray-700 bg-gray-900/40 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1.5">📋 Informes de jinetes</p>
                <div className="space-y-1">
                  {race.informeJinetes.map((inf, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <DorsalChip n={inf.dorsal} />
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-gray-400">{inf.jinete} · {inf.caballo}: </span>
                        <span className="text-[10px] text-gray-500 italic">{inf.informe}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Orden de llegada (resultado) ── */}
            {race.llegada.length > 0 && (
              <div className="border-x border-gray-700 bg-gray-900/30 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1.5">🏁 Orden de llegada</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {race.llegada.slice(0, 5).map((nombre, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <span className="text-xs font-extrabold" style={{
                        color: i === 0 ? GOLD : i === 1 ? '#9ca3af' : i === 2 ? '#c4a96b' : '#6b7280'
                      }}>
                        {i + 1}°
                      </span>
                      <span className="text-xs font-bold text-white">{nombre}</span>
                      {i < race.llegada.length - 1 && i < 4 && (
                        <span className="text-gray-700 text-xs">·</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer de carrera */}
            <div className="rounded-b-2xl border border-t-0 border-gray-700 bg-gray-900/20 px-3 py-1.5">
            </div>

          </section>
        ))}

        {/* ══ NOTAS SOBRE DISPONIBILIDAD DE DATOS ══ */}
        <section className="rounded-2xl border border-gray-700 bg-gray-900 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">📊 Estado de los datos en este mockup</p>
          </div>
          <div className="divide-y divide-gray-800">
            {[
              { dato: 'Caballo, entrenador, jinete, peso declarado, medicación', estado: '✅ Ya disponible', color: 'text-green-400' },
              { dato: 'Distancia, condiciones, hora, premio, jugadas habilitadas', estado: '✅ Ya disponible', color: 'text-green-400' },
              { dato: 'Retirados (nombre y dorsal)', estado: '✅ Ya disponible', color: 'text-green-400' },
              { dato: 'Orden de llegada (resultados)', estado: '✅ Ya disponible (vía imagen INH)', color: 'text-green-400' },
              { dato: 'Pronósticos de expertos con E1', estado: '✅ Ya disponible', color: 'text-green-400' },
              { dato: 'Causa del retiro', estado: '🔶 Requiere parsear Resolución Comisarios (R-012)', color: 'text-yellow-400' },
              { dato: 'Peso real del día de la carrera', estado: '🔶 Requiere parsear Resolución Comisarios (R-012)', color: 'text-yellow-400' },
              { dato: 'Incidentes y multas por carrera', estado: '🔶 Requiere parsear Resolución Comisarios (R-012)', color: 'text-yellow-400' },
              { dato: 'Informes de jinetes', estado: '🔶 Requiere parsear Resolución Comisarios (R-012)', color: 'text-yellow-400' },
              { dato: 'Trabajos con tiempos parciales y comentarios', estado: '🔶 Requiere parsear PDFs de trabajos', color: 'text-yellow-400' },
              { dato: 'Tipo de trabajo: En Pelo / En Silla', estado: '🔶 Requiere parsear PDFs de trabajos', color: 'text-yellow-400' },
              { dato: 'Días desde último trabajo (4D, 7D...)', estado: '🔶 Requiere parsear PDFs de trabajos', color: 'text-yellow-400' },
              { dato: 'Dividendos pagados (ganador, exacta, etc.)', estado: '✅ Ya disponible (vía imagen INH)', color: 'text-green-400' },
              { dato: 'Pedigree del caballo (padre/madre)', estado: '❌ No existe fuente pública estructurada', color: 'text-red-400' },
              { dato: 'Posiciones en 400m / 800m', estado: '❌ No disponible en fuentes INH — dato de pista', color: 'text-red-400' },
            ].map((row, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto] gap-3 px-4 py-2 items-start">
                <p className="text-xs text-gray-400">{row.dato}</p>
                <p className={`text-[10px] font-bold shrink-0 text-right ${row.color}`}>{row.estado}</p>
              </div>
            ))}
          </div>
        </section>

        <p className="text-center text-xs text-gray-700 pb-4">
          Mockup estático · Desafío Hípico · Los datos de trabajo y resolución de comisarios son ejemplos reales de la Reunión 12 del 15/03/2026.
        </p>

      </main>
    </div>
  );
}
