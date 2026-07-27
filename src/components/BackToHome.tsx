import Link from 'next/link';

export default function BackToHome({ href = '/', label = 'Inicio', className = '' }: { href?: string; label?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1 text-gray-400 hover:text-yellow-500 transition-colors shrink-0 ${className}`}
    >
      <span className="text-lg leading-none">←</span>
      <span className="hidden sm:inline text-xs font-medium">{label}</span>
    </Link>
  );
}
