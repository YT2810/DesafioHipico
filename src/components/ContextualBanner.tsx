'use client';

import Link from 'next/link';

interface Props {
  streak: number;
  isLoggedIn: boolean;
  hasRecentWorkouts?: boolean;
  latestWorkoutTrack?: string;
  todayMeetingTrack?: string;   // nombre del hipódromo si hay programa HOY
  hasRecentResults?: boolean;
  latestResultsDate?: string;   // "sábado 15" etc.
}

interface BannerConfig {
  text: string;
  href?: string;
  bg: string;
  textColor: string;
  borderColor: string;
}

function getBanner(
  streak: number,
  isLoggedIn: boolean,
  hasRecentWorkouts: boolean,
  latestWorkoutTrack: string,
  todayMeetingTrack: string,
  hasRecentResults: boolean,
  latestResultsDate: string,
): BannerConfig {
  const day = new Date().getDay(); // 0=Dom 1=Lun ... 5=Vie 6=Sáb

  // Racha — milestone cada 7 días (prioridad máxima)
  if (isLoggedIn && streak > 0 && streak % 7 === 0) {
    return {
      text: `🔥 ¡${streak} días de racha! Eres de los más constantes en la plataforma`,
      bg: 'from-orange-900/70 to-orange-800/40',
      textColor: 'text-orange-300',
      borderColor: 'border-orange-700/50',
    };
  }

  // Racha activa (3–6 días)
  if (isLoggedIn && streak >= 3) {
    return {
      text: `🔥 ${streak} días de racha — el día 7 desbloqueas un bonus Gold especial`,
      bg: 'from-orange-900/50 to-yellow-900/30',
      textColor: 'text-orange-200',
      borderColor: 'border-orange-800/40',
    };
  }

  // Sábado o domingo — día de carreras (solo si hay programa real ese día)
  if ((day === 6 || day === 0) && todayMeetingTrack) {
    return {
      text: `🏇 ¡Hoy es día de carreras en ${todayMeetingTrack}! Consulta los pronósticos`,
      href: '/pronosticos',
      bg: 'from-green-900/60 to-green-800/30',
      textColor: 'text-green-300',
      borderColor: 'border-green-700/40',
    };
  }

  // Viernes — traqueos (solo si hay traqueos reales recientes)
  if (day === 5 && hasRecentWorkouts) {
    const track = latestWorkoutTrack ? ` de ${latestWorkoutTrack}` : '';
    return {
      text: `⏱ Nuevos traqueos${track} disponibles — revisa cómo viene tu favorito`,
      href: '/traqueos',
      bg: 'from-blue-900/60 to-blue-800/30',
      textColor: 'text-blue-300',
      borderColor: 'border-blue-700/40',
    };
  }

  // Lunes — resultados (solo si hay resultados reales recientes)
  if (day === 1 && hasRecentResults) {
    const fecha = latestResultsDate ? ` del ${latestResultsDate}` : ' del fin de semana';
    return {
      text: `📊 Resultados${fecha} disponibles — revisa cómo le fue a tu caballo`,
      href: '/resultados',
      bg: 'from-purple-900/60 to-purple-800/30',
      textColor: 'text-purple-300',
      borderColor: 'border-purple-700/40',
    };
  }

  // Traqueos recientes cualquier día
  if (hasRecentWorkouts) {
    const track = latestWorkoutTrack ? ` de ${latestWorkoutTrack}` : '';
    return {
      text: `⏱ Nuevos traqueos${track} disponibles — revisa cómo viene tu favorito`,
      href: '/traqueos',
      bg: 'from-blue-900/60 to-blue-800/30',
      textColor: 'text-blue-300',
      borderColor: 'border-blue-700/40',
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

export default function ContextualBanner({
  streak,
  isLoggedIn,
  hasRecentWorkouts = false,
  latestWorkoutTrack = '',
  todayMeetingTrack = '',
  hasRecentResults = false,
  latestResultsDate = '',
}: Props) {
  const banner = getBanner(streak, isLoggedIn, hasRecentWorkouts, latestWorkoutTrack, todayMeetingTrack, hasRecentResults, latestResultsDate);

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
