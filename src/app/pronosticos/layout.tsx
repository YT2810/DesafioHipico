import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pronósticos La Rinconada · Expertos Hípicos Venezuela',
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
    'datos superfijos de la rinconada',
    'línea hípica para el 5 y 6',
    'superfijos la rinconada hoy',
    'pronósticos la rinconada hoy domingo',
    'cuánto pagó el 5y6 la rinconada',
    'datos la rinconada hoy',
  ],
  openGraph: {
    title: 'Pronósticos de Expertos — La Rinconada y Valencia | Desafío Hípico',
    description:
      'Consulta las selecciones de los mejores handicappers venezolanos para cada carrera. La Rinconada · Valencia · Venezuela.',
    type: 'website',
    locale: 'es_VE',
    images: [{
      url: 'https://www.desafiohipico.com/api/og?type=pronosticos&title=Pron%C3%B3sticos%20de%20Expertos&subtitle=La%20Rinconada%20%C2%B7%20Valencia%20%C2%B7%20Venezuela',
      width: 1200,
      height: 630,
      alt: 'Pronósticos hípicos Venezuela — Desafío Hípico',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['https://www.desafiohipico.com/api/og?type=pronosticos&title=Pron%C3%B3sticos%20de%20Expertos&subtitle=La%20Rinconada%20%C2%B7%20Valencia%20%C2%B7%20Venezuela'],
  },
  alternates: {
    canonical: 'https://www.desafiohipico.com/pronosticos',
  },
};

export default function PronosticosLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      {/* SEO footer — crawleable, semánticamente válido */}
      <p className="text-[11px] text-gray-800 text-center leading-relaxed px-4 pb-4">
        Pronósticos La Rinconada hoy · Datos superfijos La Rinconada · Cuánto pagó el 5y6 La Rinconada ·
        Pronósticos hípicos Venezuela · Línea hípica para el 5y6 · Expertos handicappers venezolanos ·
        Pronósticos Valencia sábado · Selecciones hípicas INH
      </p>
    </>
  );
}
