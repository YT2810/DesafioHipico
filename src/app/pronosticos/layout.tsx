import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pronósticos Hípicos Venezuela — Expertos La Rinconada y Valencia Hoy',
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
      {/* SEO crawleable — visually hidden, semánticamente válido */}
      <div className="sr-only">
        <p>
          Consulta los <strong>datos superfijos de La Rinconada</strong> publicados por expertos handicappers venezolanos.
          <strong>Pronósticos hípicos Venezuela</strong>: selecciones y <strong>línea hípica para el 5 y 6</strong> de cada reunión en La Rinconada y Valencia.
          Análisis de expertos como Guardi, Braulio Inciarte y Darío Piccinini. Actualizado cada jornada hípica.
        </p>
      </div>
    </>
  );
}
