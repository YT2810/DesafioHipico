'use client';

import Link from 'next/link';

const SECTIONS = [
  {
    group: 'Carga de Datos',
    items: [
      { href: '/admin/ingest',       icon: '🏁', label: 'Cargar Resultados',    desc: 'Sube fotos del tablero y guarda posiciones, pagos y dividendos.' },
      { href: '/admin/meetings',     icon: '📋', label: 'Subir Programa',        desc: 'Ingesta de PDFs con el programa de la reunión (INH / HINAVA).' },
      { href: '/admin/workouts',     icon: '⏱️', label: 'Subir Traqueos',        desc: 'Sube archivos Excel o PDF de la División de Toma Tiempos.' },
      { href: '/admin/intelligence', icon: '🧠', label: 'Subir Pronóstico',      desc: 'Pega texto, imagen o URL de un handicapper. La IA extrae las marcas.' },
    ],
  },
  {
    group: 'Contenido y Fuentes',
    items: [
      { href: '/admin/forecast',     icon: '📊', label: 'Pronósticos Guardados', desc: 'Revisa y edita los pronósticos ya procesados.' },
      { href: '/staff/fuentes',      icon: '📡', label: 'Fuentes y Handicappers', desc: 'Catálogo de handicappers conocidos y sus fuentes.' },
      { href: '/admin/audios',       icon: '🎙️', label: 'Audios',               desc: 'Gestión de audios de handicappers.' },
    ],
  },
  {
    group: 'Usuarios',
    items: [
      { href: '/admin/users',        icon: '👥', label: 'Usuarios',              desc: 'Busca usuarios, consulta sus datos y ayuda con cuentas.' },
      { href: '/admin/handicapper-request', icon: '🎓', label: 'Solicitudes Handicapper', desc: 'Revisa solicitudes de usuarios que quieren ser handicappers.' },
    ],
  },
];

export default function StaffPanelPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="sticky top-0 z-20 border-b border-gray-800 bg-gray-950/95 backdrop-blur px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href="/perfil" className="text-gray-400 hover:text-white text-sm transition-colors">← Mi Perfil</Link>
          <div className="flex-1">
            <h1 className="text-base font-bold text-white">Panel de Staff</h1>
            <p className="text-xs text-gray-500">Desafío Hípico · Staff</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        {SECTIONS.map(section => (
          <div key={section.group}>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">{section.group}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {section.items.map(item => (
                <Link key={item.href} href={item.href}
                  className="flex items-start gap-3 bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4 hover:border-gray-600 transition-colors group">
                  <span className="text-2xl shrink-0 mt-0.5">{item.icon}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{item.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-snug">{item.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
