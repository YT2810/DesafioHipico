import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";
import WhatsAppButton from "@/components/WhatsAppButton";
import Script from "next/script";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? 'G-DB6H4TPMJ1';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const BASE_URL = 'https://www.desafiohipico.com';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Desafío Hípico · Inscritos, Pronósticos y Retirados La Rinconada y Valencia',
    template: '%s | Desafío Hípico',
  },
  description:
    'Inscritos La Rinconada e inscritos Valencia hoy: pronósticos de expertos, retirados, resultados y dividendos de cada reunión hípica venezolana. INH · HINAVA · Gaceta Hípica.',
  keywords: [
    // Navegacional / alta intención
    'inscritos La Rinconada',
    'inscritos La Rinconada hoy',
    'inscritos Valencia hipódromo',
    'inscritos hipódromo Venezuela',
    'programa carreras La Rinconada',
    // Pronósticos
    'pronósticos hípicos Venezuela',
    'pronósticos La Rinconada hoy',
    'pronósticos carreras Venezuela',
    'expertos hípicos Venezuela',
    'handicappers Venezuela',
    // Retirados — intención transaccional inmediata
    'retirados La Rinconada',
    'retirados hipódromo hoy',
    'ejemplares retirados carreras Venezuela',
    // Resultados / dividendos
    'resultados La Rinconada',
    'resultados Valencia hipódromo',
    'dividendos La Rinconada',
    'dividendos carreras Venezuela',
    'resumen La Rinconada',
    'datos La Rinconada',
    // Publicaciones / fuentes de alto volumen
    'Gaceta Hípica',
    'Mundo Hípico Venezuela',
    'INH hipódromo',
    'HINAVA Valencia',
    'Chicho Báez hípica',
    // Long-tail
    'carreras de caballos Venezuela',
    'hipismo Venezuela',
    '5 y 6 La Rinconada',
    'quiniela hípica Venezuela',
    'apostando carreras Venezuela',
  ],
  authors: [{ name: 'Desafío Hípico', url: BASE_URL }],
  creator: 'Desafío Hípico',
  publisher: 'Desafío Hípico',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large' },
  },
  openGraph: {
    title: 'Desafío Hípico · Inscritos, Pronósticos y Retirados La Rinconada',
    description:
      'Consulta los inscritos, pronósticos de expertos, retirados y resultados de La Rinconada y Valencia. La plataforma hípica digital de Venezuela.',
    url: BASE_URL,
    siteName: 'Desafío Hípico',
    locale: 'es_VE',
    type: 'website',
    images: [{
      url: `${BASE_URL}/api/og`,
      width: 1200,
      height: 630,
      alt: 'Desafío Hípico · Inscritos, Pronósticos y Retirados Venezuela',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@DesafioHipico',
    title: 'Desafío Hípico · Inscritos La Rinconada y Valencia',
    description: 'Inscritos, pronósticos, retirados y resultados hípicos de Venezuela en tiempo real.',
    images: [`${BASE_URL}/api/og`],
  },
  alternates: {
    canonical: BASE_URL,
    languages: { 'es-VE': BASE_URL },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GSC_TOKEN ?? '',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-VE">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-950 text-gray-100`}>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `}
        </Script>
        {/* JSON-LD: WebSite SearchAction */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Desafío Hípico',
            url: 'https://www.desafiohipico.com',
            potentialAction: {
              '@type': 'SearchAction',
              target: {
                '@type': 'EntryPoint',
                urlTemplate: 'https://www.desafiohipico.com/pronosticos?q={search_term_string}',
              },
              'query-input': 'required name=search_term_string',
            },
          }) }}
        />
        {/* JSON-LD: Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SportsOrganization',
            name: 'Desafío Hípico',
            url: 'https://www.desafiohipico.com',
            logo: 'https://www.desafiohipico.com/logo.png',
            description: 'Plataforma hípica digital de Venezuela. Inscritos, pronósticos de expertos, retirados y resultados de La Rinconada y Valencia.',
            sport: 'Horse Racing',
            areaServed: { '@type': 'Country', name: 'Venezuela' },
            sameAs: [
              'https://www.instagram.com/desafiohipico',
              'https://t.me/desafiohipico',
            ],
          }) }}
        />
        <SessionProviderWrapper>
          {children}
          <WhatsAppButton />
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
