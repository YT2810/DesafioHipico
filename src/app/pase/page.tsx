import type { Metadata } from 'next';
import PaseClient from './PaseClient';

const BASE = 'https://www.desafiohipico.com';

export const metadata: Metadata = {
  title: 'Activar Pase Nacional · Pronósticos y Factor de Victoria Completo',
  description:
    'Activa tu Pase Nacional Desafío Hípico: pronósticos completos, Factor de Victoria en vivo, diagnóstico de riesgo por carrera y cuadro 5y6 VIP. La Rinconada y Valencia. Pago Móvil, activación en menos de 24 h.',
  keywords: [
    'pase desafío hípico',
    'pronósticos la rinconada premium',
    'factor de victoria',
    'pase nacional hipismo',
    'pronósticos 5y6 venezuela',
    'suscripción pronósticos hípicos',
  ],
  alternates: { canonical: `${BASE}/pase` },
  openGraph: {
    title: 'Pase Nacional · Desafío Hípico',
    description: 'Factor de Victoria + diagnóstico de riesgo por carrera + cuadro 5y6 VIP. Actívalo hoy por Pago Móvil.',
    url: `${BASE}/pase`,
    siteName: 'Desafío Hípico',
    locale: 'es_VE',
    type: 'website',
  },
};

export default function PasePage() {
  return <PaseClient />;
}
