import Link from 'next/link';

export default function SectionCard({ href, icon, label, desc }: { href: string; icon: string; label: string; desc: string }) {
  return (
    <Link href={href}
      className="flex items-start gap-3 bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4 hover:border-gray-600 transition-colors group">
      <span className="text-2xl shrink-0 mt-0.5">{icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-white group-hover:text-yellow-400 transition-colors">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5 leading-snug">{desc}</p>
      </div>
    </Link>
  );
}
