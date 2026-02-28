import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pronósticos hípicos Venezuela — Expertos La Rinconada y Valencia',
  description:
    'Pronósticos de expertos handicappers para las carreras de La Rinconada y Valencia. Consulta las selecciones de Braulio Inciarte, Guardi, Darío Piccinini, Antonio Medina y más. Actualizado cada reunión.',
  keywords: [
    'pronósticos hípicos Venezuela',
    'pronósticos La Rinconada hoy',
    'pronósticos carreras Venezuela',
    'handicappers Venezuela',
    'expertos La Rinconada',
    'selecciones hípicas',
    'Braulio Inciarte pronósticos',
    'Guardi hípico',
    'Darío Piccinini carreras',
    'línea hípica Venezuela',
    'fijo hípico La Rinconada',
    '5 y 6 La Rinconada selecciones',
    'quiniela hípica pronósticos',
  ],
  openGraph: {
    title: 'Pronósticos de Expertos — La Rinconada y Valencia | Desafío Hípico',
    description:
      'Consulta las selecciones de los mejores handicappers venezolanos para cada carrera. La Rinconada · Valencia · Venezuela.',
    type: 'website',
    locale: 'es_VE',
  },
  alternates: {
    canonical: 'https://www.desafiohipico.com/pronosticos',
  },
};

export default function PronosticosLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
