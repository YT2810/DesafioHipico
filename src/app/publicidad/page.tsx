import Link from 'next/link';
import type { Metadata } from 'next';

const GOLD = '#D4AF37';
const BASE_URL = 'https://www.desafiohipico.com';
const WA_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, '') ?? '584122220545';
const WA_URL = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('Hola, soy anunciante/agencia y me interesa el Media Kit de Desafío Hípico. ¿Me pueden compartir formatos y tarifas?')}`;
const MAILTO_URL = 'mailto:desafiohipicoapp@gmail.com?subject=Solicitud%20Media%20Kit%20-%20Desaf%C3%ADo%20H%C3%ADpico&body=Hola%2C%20me%20interesa%20recibir%20el%20Media%20Kit%20oficial%20con%20formatos%20y%20tarifas%20de%20publicidad%20en%20Desaf%C3%ADo%20H%C3%ADpico.';

export const metadata: Metadata = {
  title: 'Publicidad y Media Kit · Anuncia ante la Audiencia Hípica de Venezuela',
  description:
    'Media Kit oficial de Desafío Hípico: +86.000 usuarios activos mensuales y +600.000 vistas de página en el último trimestre, con hasta 6+ minutos de retención en páginas de análisis hípico. Formatos Takeover, Cabecera, Sticky Mobile e In-Text en Retrospectos, Resultados y Traqueos. Solicita tarifas.',
  keywords: [
    'publicidad hípica Venezuela',
    'media kit hípico',
    'anunciar en La Rinconada',
    'patrocinio hipismo Venezuela',
    'publicidad digital Venezuela apuestas',
    'takeover web Venezuela',
    'banner hípico',
    'publicidad pronósticos deportivos',
    'audiencia hípica Venezuela',
    'media kit apuestas deportivas',
    'anuncios retrospectos',
    'publicidad casas de apuestas Venezuela',
  ],
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Publicidad en Desafío Hípico · Media Kit Oficial',
    description:
      'Conecta con +86.000 usuarios activos mensuales de la audiencia hípica de mayor intención en Venezuela. Formatos Takeover, Sticky Mobile e In-Text.',
    url: `${BASE_URL}/publicidad`,
    siteName: 'Desafío Hípico',
    locale: 'es_VE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Publicidad en Desafío Hípico · Media Kit',
    description: '+86.000 usuarios activos mensuales · +600.000 vistas trimestrales · Audiencia hípica de mayor intención en Venezuela.',
  },
  alternates: {
    canonical: `${BASE_URL}/publicidad`,
  },
};

const metrics = [
  { value: '+86.000', label: 'Usuarios activos mensuales', sub: 'Último trimestre · verificable en GA4' },
  { value: '+600.000', label: 'Vistas de página', sub: 'Acumulado del último trimestre' },
  { value: 'Hasta 6+ min', label: 'Retención en pantalla', sub: 'En páginas de análisis y pronósticos' },
];

const premiumFormats = [
  {
    icon: '🖥️',
    name: 'Takeover Web',
    desc: 'Dominio total del ecosistema: tu marca como fondo y presencia exclusiva en toda la plataforma durante el periodo contratado.',
    tag: 'Máximo impacto',
  },
  {
    icon: '📰',
    name: 'Cabecera Principal',
    desc: 'Banner premium fijo en la parte superior de todas las secciones. Primer contacto visual de cada usuario en cada visita.',
    tag: 'Alcance total',
  },
  {
    icon: '📱',
    name: 'Sticky Mobile',
    desc: 'Banner persistente siempre visible en móvil — donde vive el 90% de nuestra audiencia. Visibilidad garantizada durante toda la navegación.',
    tag: 'Mobile-first',
  },
];

const intextFormats = [
  {
    icon: '📘',
    name: 'Retrospectos',
    desc: 'Páginas de análisis previo donde el usuario estudia ejemplares antes de decidir su jugada. Contexto de máxima concentración.',
  },
  {
    icon: '🏁',
    name: 'Resultados',
    desc: 'La sección más consultada el día de carrera. Los usuarios regresan carrera tras carrera durante toda la jornada.',
  },
  {
    icon: '🏋️',
    name: 'Traqueos',
    desc: 'Consulta diaria de entrenamientos matutinos. Audiencia técnica: entrenadores, owners y apostadores serios.',
  },
];

const audiencePoints = [
  'Apostadores activos del 5 y 6, quinielas y jugadas exóticas',
  'Entrenadores, propietarios y staff de cuadra del medio hípico',
  'Fanáticos que consultan pronósticos, traqueos y resultados cada fin de semana',
];

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      name: 'Publicidad y Media Kit — Desafío Hípico',
      url: `${BASE_URL}/publicidad`,
      description: 'Página oficial de publicidad de Desafío Hípico, la plataforma hípica digital de Venezuela con +86.000 usuarios activos mensuales.',
      isPartOf: { '@type': 'WebSite', name: 'Desafío Hípico', url: BASE_URL },
      about: {
        '@type': 'Service',
        name: 'Publicidad digital en Desafío Hípico',
        provider: {
          '@type': 'SportsOrganization',
          name: 'Desafío Hípico',
          url: BASE_URL,
          sport: 'Horse Racing',
          areaServed: { '@type': 'Country', name: 'Venezuela' },
        },
        serviceType: 'Digital Advertising',
        audience: {
          '@type': 'Audience',
          audienceType: 'Horse racing bettors and fans in Venezuela',
        },
      },
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: '¿Cuántos usuarios activos tiene Desafío Hípico?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'En su último trimestre Desafío Hípico alcanzó más de 86.000 usuarios activos mensuales y más de 600.000 vistas de página, con hasta 6+ minutos de retención en páginas de análisis. Los reportes de Google Analytics se comparten con anunciantes bajo solicitud.',
          },
        },
        {
          '@type': 'Question',
          name: '¿Qué formatos publicitarios ofrece Desafío Hípico?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Formatos premium globales: Takeover Web, Cabecera Principal y Sticky Mobile. Formatos in-text de nicho en Retrospectos, Resultados y Traqueos.',
          },
        },
        {
          '@type': 'Question',
          name: '¿Cómo solicito el Media Kit y las tarifas de Desafío Hípico?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Escríbenos por WhatsApp o a desafiohipicoapp@gmail.com solicitando el Media Kit oficial. Respondemos en menos de 24 horas con formatos y tarifas adaptados a tu estrategia.',
          },
        },
      ],
    },
  ],
};

export default function PublicidadPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="border-b border-gray-800 px-4 py-3">
        <div className="mx-auto max-w-3xl flex items-center gap-3">
          <Link href="/" className="text-gray-500 hover:text-white text-sm transition-colors">← Inicio</Link>
          <span className="text-sm font-bold text-white">Publicidad &amp; Media Kit</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 space-y-12">

        {/* ── 1. Hero ── */}
        <section className="text-center space-y-4">
          <p className="inline-block text-[11px] font-extrabold uppercase tracking-[0.2em] px-3 py-1.5 rounded-full border border-yellow-700/50 text-yellow-500 bg-yellow-950/30">
            Media Kit Oficial · 2026
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
            Conecta con la audiencia hípica de{' '}
            <span style={{ color: GOLD }}>mayor intención en Venezuela</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-400 leading-relaxed max-w-xl mx-auto">
            Posiciona tu marca frente a miles de usuarios activos diarios que analizan,
            deciden y apuestan en nuestra plataforma.
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {audiencePoints.map(p => (
              <span key={p} className="text-[11px] text-gray-400 bg-gray-900 border border-gray-800 rounded-full px-3 py-1.5">
                {p}
              </span>
            ))}
          </div>
        </section>

        {/* ── 2. Métricas ── */}
        <section className="space-y-4">
          <div className="text-center">
            <h2 className="text-xl font-extrabold text-white">Una audiencia real y medible</h2>
            <p className="text-xs text-gray-500 mt-1">Datos del último trimestre · reportes Google Analytics disponibles bajo solicitud</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {metrics.map(m => (
              <div
                key={m.label}
                className="rounded-2xl border border-yellow-700/40 bg-gradient-to-br from-yellow-950/30 to-gray-900 p-5 text-center"
              >
                <p className="text-3xl font-extrabold" style={{ color: GOLD }}>{m.value}</p>
                <p className="text-sm font-bold text-white mt-1">{m.label}</p>
                <p className="text-[11px] text-gray-500 mt-1">{m.sub}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { k: '90%', v: 'Tráfico móvil' },
              { k: 'Sáb + Dom', v: 'Días pico de visitas' },
              { k: 'Venezuela', v: 'Audiencia concentrada' },
              { k: 'Alta intención', v: 'Usuarios que deciden jugada' },
            ].map(s => (
              <div key={s.k} className="rounded-xl bg-gray-900 border border-gray-800 px-3 py-2.5 text-center">
                <p className="text-sm font-extrabold text-white">{s.k}</p>
                <p className="text-[10px] text-gray-500">{s.v}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 3. Inventario ── */}
        <section className="space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-extrabold text-white">Formatos publicitarios</h2>
            <p className="text-xs text-gray-500 mt-1">Inventario diseñado para casas de apuestas, marcas deportivas, alimentación animal, telecom y consumo masivo</p>
          </div>

          <div>
            <h3 className="text-xs uppercase tracking-widest font-bold text-yellow-600 mb-3">
              ⭐ Premium Globales — impacto masivo en todo el ecosistema
            </h3>
            <div className="space-y-3">
              {premiumFormats.map(f => (
                <div key={f.name} className="rounded-2xl border border-gray-800 bg-gray-900 p-4 flex gap-4">
                  <span className="text-2xl shrink-0">{f.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-extrabold text-white">{f.name}</p>
                      <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border border-yellow-700/50 text-yellow-500">
                        {f.tag}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed mt-1">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs uppercase tracking-widest font-bold text-yellow-600 mb-3">
              🎯 In-Text de Nicho — secciones de alta intención
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {intextFormats.map(f => (
                <div key={f.name} className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
                  <span className="text-xl">{f.icon}</span>
                  <p className="text-sm font-extrabold text-white mt-2">{f.name}</p>
                  <p className="text-xs text-gray-400 leading-relaxed mt-1">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4 text-center">
            <p className="text-xs text-gray-400 leading-relaxed">
              Todos los formatos incluyen reporte de impresiones y clics.
              Diseñamos ubicaciones personalizadas (la lista 5y6, alertas de retirados,
              pantalla de resultados en vivo) según tu estrategia de marca.
            </p>
          </div>
        </section>

        {/* ── 4. CTA final ── */}
        <section className="rounded-2xl border border-yellow-800/40 bg-gradient-to-br from-yellow-950/40 to-gray-900 p-6 sm:p-8 text-center space-y-4">
          <h2 className="text-2xl font-extrabold text-white">¿Listo para maximizar tu conversión?</h2>
          <p className="text-sm text-gray-400 leading-relaxed max-w-md mx-auto">
            Solicita nuestro Media Kit oficial y descubre cómo podemos adaptar
            nuestros espacios a tu estrategia.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
            <a
              href={WA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-extrabold text-black shadow-lg shadow-yellow-900/30"
              style={{ backgroundColor: GOLD }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Solicitar Media Kit y Tarifas
            </a>
            <a
              href={MAILTO_URL}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold text-white border border-gray-700 hover:border-yellow-700 transition-colors"
            >
              ✉️ Enviar email
            </a>
          </div>
          <p className="text-[11px] text-gray-500">
            Respuesta en menos de 24 horas · desafiohipicoapp@gmail.com
          </p>
        </section>

        {/* ── SEO/GEO footer text ── */}
        <p className="text-[11px] text-gray-800 text-center leading-relaxed">
          Publicidad hípica Venezuela · Media kit plataforma hípica digital · Anunciar en La Rinconada ·
          Patrocinio hipismo venezolano · Publicidad para casas de apuestas · Takeover web Venezuela ·
          Banner en pronósticos deportivos · Audiencia hípica de alto engagement
        </p>
      </main>
    </div>
  );
}
