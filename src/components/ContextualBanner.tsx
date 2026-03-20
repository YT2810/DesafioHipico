'use client';

import Link from 'next/link';

interface Props {
  streak: number;
  isLoggedIn: boolean;
}

interface BannerConfig {
  text: string;
  href?: string;
  bg: string;
  textColor: string;
  borderColor: string;
}

function getBanner(streak: number, isLoggedIn: boolean): BannerConfig {
  const day = new Date().getDay(); // 0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb
  const hour = new Date().getHours();

  // Streak milestone
  if (isLoggedIn && streak > 0 && streak % 7 === 0) {
    return {
      text: `🔥 ¡${streak} días seguidos! Eres de los más constantes en la plataforma`,
      bg: 'from-orange-900/70 to-orange-800/40',
      textColor: 'text-orange-300',
      borderColor: 'border-orange-700/50',
    };
  }

  // Streak building (3+)
  if (isLoggedIn && streak >= 3) {
    return {
      text: `🔥 ${streak} días seguidos — el día 7 desbloqueas un bonus Gold especial`,
      bg: 'from-orange-900/50 to-yellow-900/30',
      textColor: 'text-orange-200',
      borderColor: 'border-orange-800/40',
    };
  }

  // Day-based contextual
  if (day === 5) { // Friday
    return {
      text: '⏱ Ya están los traqueos del viernes — revisa cómo viene tu favorito',
      href: '/traqueos',
      bg: 'from-blue-900/60 to-blue-800/30',
      textColor: 'text-blue-300',
      borderColor: 'border-blue-700/40',
    };
  }

  if (day === 6) { // Saturday — race day
    return {
      text: '🏇 ¡Hoy es día de carreras! El programa ya está disponible',
      href: '/pronosticos',
      bg: 'from-green-900/60 to-green-800/30',
      textColor: 'text-green-300',
      borderColor: 'border-green-700/40',
    };
  }

  if (day === 0) { // Sunday — race day
    return {
      text: '🏇 ¡Domingo de carreras! Consulta los pronósticos de hoy',
      href: '/pronosticos',
      bg: 'from-green-900/60 to-green-800/30',
      textColor: 'text-green-300',
      borderColor: 'border-green-700/40',
    };
  }

  if (day === 1 && hour < 14) { // Monday morning — results
    return {
      text: '📊 Ya están los resultados del fin de semana — revisa cómo le fue a tu caballo',
      href: '/resultados',
      bg: 'from-purple-900/60 to-purple-800/30',
      textColor: 'text-purple-300',
      borderColor: 'border-purple-700/40',
    };
  }

  if (day === 4) { // Thursday — anticipation for weekend
    return {
      text: '📋 El programa del fin de semana se publica mañana — estate atento',
      bg: 'from-yellow-900/50 to-yellow-800/30',
      textColor: 'text-yellow-300',
      borderColor: 'border-yellow-700/40',
    };
  }

  // Not logged in — acquisition
  if (!isLoggedIn) {
    return {
      text: '🎁 Regístrate gratis y recibe 🪙 15 Gold de bienvenida',
      href: '/auth/signin',
      bg: 'from-yellow-900/70 to-yellow-800/40',
      textColor: 'text-yellow-300',
      borderColor: 'border-yellow-700/50',
    };
  }

  // Default — launch promo
  return {
    text: '🎁 ¡PROMO DE LANZAMIENTO! Todo el análisis hípico liberado por tiempo limitado',
    bg: 'from-yellow-900/70 to-yellow-800/40',
    textColor: 'text-yellow-300',
    borderColor: 'border-yellow-700/50',
  };
}

export default function ContextualBanner({ streak, isLoggedIn }: Props) {
  const banner = getBanner(streak, isLoggedIn);

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
