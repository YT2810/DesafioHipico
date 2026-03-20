'use client';

import Link from 'next/link';

interface Props {
  streak: number;
  isLoggedIn: boolean;
  hasRecentWorkouts?: boolean;
  hasRecentProgram?: boolean;
}

interface BannerConfig {
  text: string;
  href?: string;
  bg: string;
  textColor: string;
  borderColor: string;
}

function getBanner(streak: number, isLoggedIn: boolean, hasRecentWorkouts: boolean, hasRecentProgram: boolean): BannerConfig {
  // Racha — milestone (cada 7 días)
  if (isLoggedIn && streak > 0 && streak % 7 === 0) {
    return {
      text: `🔥 ¡${streak} días de racha! Eres de los más constantes en la plataforma`,
      bg: 'from-orange-900/70 to-orange-800/40',
      textColor: 'text-orange-300',
      borderColor: 'border-orange-700/50',
    };
  }

  // Racha activa (3+ días)
  if (isLoggedIn && streak >= 3) {
    return {
      text: `🔥 ${streak} días de racha — el día 7 desbloqueas un bonus Gold especial`,
      bg: 'from-orange-900/50 to-yellow-900/30',
      textColor: 'text-orange-200',
      borderColor: 'border-orange-800/40',
    };
  }

  // Traqueos recientes (solo si realmente existen)
  if (hasRecentWorkouts) {
    return {
      text: '⏱ Nuevos traqueos disponibles — revisa cómo viene tu favorito',
      href: '/traqueos',
      bg: 'from-blue-900/60 to-blue-800/30',
      textColor: 'text-blue-300',
      borderColor: 'border-blue-700/40',
    };
  }

  // Programa reciente (solo si realmente existe)
  if (hasRecentProgram) {
    return {
      text: '📋 El programa está disponible — consulta los pronósticos',
      href: '/pronosticos',
      bg: 'from-green-900/60 to-green-800/30',
      textColor: 'text-green-300',
      borderColor: 'border-green-700/40',
    };
  }

  // No logueado — adquisición
  if (!isLoggedIn) {
    return {
      text: '🎁 Regístrate gratis y recibe 🪙 15 Gold de bienvenida',
      href: '/auth/signin',
      bg: 'from-yellow-900/70 to-yellow-800/40',
      textColor: 'text-yellow-300',
      borderColor: 'border-yellow-700/50',
    };
  }

  // Default — promo lanzamiento
  return {
    text: '🎁 ¡PROMO DE LANZAMIENTO! Todo el análisis hípico liberado por tiempo limitado',
    bg: 'from-yellow-900/70 to-yellow-800/40',
    textColor: 'text-yellow-300',
    borderColor: 'border-yellow-700/50',
  };
}

export default function ContextualBanner({ streak, isLoggedIn, hasRecentWorkouts = false, hasRecentProgram = false }: Props) {
  const banner = getBanner(streak, isLoggedIn, hasRecentWorkouts, hasRecentProgram);

  const inner = (
    <div className={`bg-gradient-to-r ${banner.bg} border-b ${banner.borderColor} px-4 py-2.5 text-center`}>
      <p className={`text-xs font-bold ${banner.textColor}`}>{banner.text}</p>
    </div>
  );

  if (banner.href) {
    return <Link href={banner.href}>{inner}</Link>;
  }
  return inner;
}
