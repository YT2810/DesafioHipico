const TABS = [
  { id: 'dashboard',    label: 'Dashboard',    icon: '📊' },
  { id: 'carreras',     label: 'Carreras',     icon: '🏇' },
  { id: 'pronosticos',  label: 'Pronósticos',  icon: '🎯' },
  { id: 'usuarios',     label: 'Usuarios',     icon: '👤' },
  { id: 'finanzas',     label: 'Finanzas',     icon: '💰' },
  { id: 'config',       label: 'Config',       icon: '⚙️' },
] as const;

export type TabId = (typeof TABS)[number]['id'];

export default function AdminTabs({ active, onChange }: { active: TabId; onChange: (t: TabId) => void }) {
  return (
    <div className="border-b border-gray-800 bg-gray-950/80 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={`px-3 py-2.5 text-xs font-bold whitespace-nowrap transition-colors border-b-2 ${
                active === t.id
                  ? 'border-yellow-500 text-yellow-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export { TABS };
