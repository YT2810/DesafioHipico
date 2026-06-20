export default function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-extrabold" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
    </div>
  );
}
