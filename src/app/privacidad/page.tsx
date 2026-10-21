import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Privacidad · Desafío Hípico',
  description: 'Cómo Desafío Hípico recolecta, usa y protege tus datos: correo electrónico, preferencias de comunicación y analítica de uso.',
  robots: { index: true, follow: true },
};

const GOLD = '#D4AF37';

const sections = [
  {
    title: 'Qué datos recolectamos',
    items: [
      'Correo electrónico (para iniciar sesión con enlace mágico o Google)',
      'Nombre o alias público que elijas en tu perfil',
      'Datos de facturación que ingreses voluntariamente al activar un Pase (nombre, documento, teléfono)',
      'Identificador de Telegram si entras desde la mini app',
      'Métricas de uso agregadas y anónimas mediante Google Analytics 4 (páginas visitadas, tiempo en pantalla, país)',
    ],
  },
  {
    title: 'Para qué usamos tus datos',
    items: [
      'Autenticación de tu cuenta y mantenimiento de tu sesión',
      'Activar y gestionar tu Pase Nacional o saldo Gold',
      'Enviar correos de pronósticos, resultados y novedades de la plataforma (solo si aceptaste recibirlos al registrarte)',
      'Mejorar el contenido mediante estadísticas de uso agregadas (nunca perfiles individuales vendidos a terceros)',
    ],
  },
  {
    title: 'Correos de marketing',
    items: [
      'Al registrarte puedes aceptar o rechazar los correos de pronósticos y novedades — la casilla viene marcada pero la puedes desmarcar sin afectar tu acceso',
      'Enviamos como máximo 2 correos por semana (miércoles y jueves previo a la jornada)',
      'Cada correo incluye un enlace "Darte de baja" en el pie — un clic y dejas de recibirlos inmediatamente',
      'Si das de baja solo dejan de llegar los correos de marketing; los correos transaccionales necesarios (inicio de sesión) continúan',
    ],
  },
  {
    title: 'Con quién compartimos datos',
    items: [
      'Nadie. No vendemos ni compartimos tu correo, nombre ni historial de uso con terceros',
      'Proveedores técnicos que procesan datos por nosotros: Google (autenticación y analítica), Resend (envío de correos), Vercel/MongoDB Atlas (hosting)',
      'Los anunciantes de la plataforma reciben solo métricas agregadas (impresiones y clics), nunca datos de usuarios identificables',
    ],
  },
  {
    title: 'Tus derechos',
    items: [
      'Puedes solicitar ver, corregir o eliminar los datos de tu cuenta escribiendo a desafiohipicoapp@gmail.com',
      'Puedes darte de baja de los correos en cualquier momento desde el enlace del pie de cada email',
      'Eliminar tu cuenta elimina tu email y datos de perfil; las métricas agregadas anónimas se conservan',
    ],
  },
];

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 px-4 py-3">
        <div className="mx-auto max-w-2xl flex items-center gap-3">
          <Link href="/" className="text-gray-500 hover:text-white text-sm transition-colors">← Inicio</Link>
          <span className="text-sm font-bold text-white">Política de Privacidad</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-10 space-y-8">
        <div className="space-y-2">
          <p className="inline-block text-[11px] font-extrabold uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-yellow-700/50 text-yellow-500 bg-yellow-950/30">
            Última actualización · Octubre 2026
          </p>
          <h1 className="text-2xl font-extrabold text-white">Política de Privacidad</h1>
          <p className="text-sm text-gray-400 leading-relaxed">
            Desafío Hípico es una plataforma de análisis e información hípica venezolana.
            Somos un equipo pequeño y tratamos tus datos como nos gustaría que trataran los nuestros.
          </p>
        </div>

        {sections.map(s => (
          <section key={s.title} className="space-y-3">
            <h2 className="text-sm font-extrabold text-white uppercase tracking-wide border-b border-gray-800 pb-2" style={{ borderBottomColor: `${GOLD}44` }}>
              {s.title}
            </h2>
            <ul className="space-y-2">
              {s.items.map((item, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-gray-400 leading-relaxed">
                  <span className="shrink-0 mt-0.5" style={{ color: GOLD }}>▸</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <div className="rounded-2xl border border-yellow-800/40 bg-yellow-950/20 p-5 text-center space-y-2">
          <p className="text-sm font-bold text-white">¿Preguntas sobre tus datos?</p>
          <a href="mailto:desafiohipicoapp@gmail.com"
            className="inline-block px-5 py-2.5 rounded-xl text-sm font-bold text-black"
            style={{ backgroundColor: GOLD }}>
            desafiohipicoapp@gmail.com
          </a>
        </div>
      </main>
    </div>
  );
}
