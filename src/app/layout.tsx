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

export const metadata: Metadata = {
  title: "Desafío Hípico · Inscritos y Pronósticos La Rinconada y Valencia",
  description: "Gaceta hípica de Venezuela: inscritos La Rinconada, inscritos Valencia, pronósticos de expertos, resultados y resumen de cada reunión. INH · HINAVA.",
  keywords: [
    "inscritos La Rinconada",
    "inscritos Valencia hipódromo",
    "pronósticos hípicos Venezuela",
    "revista hípica Venezuela",
    "gaceta La Rinconada",
    "resultados La Rinconada",
    "resultados Valencia hipódromo",
    "resumen La Rinconada",
    "datos La Rinconada",
    "INH hipódromo",
    "HINAVA Valencia",
    "carreras de caballos Venezuela",
  ],
  openGraph: {
    title: "Desafío Hípico · Inscritos y Pronósticos La Rinconada",
    description: "Consulta los inscritos, pronósticos de expertos y resultados de La Rinconada y Valencia. La gaceta hípica digital de Venezuela.",
    url: "https://www.desafiohipico.com",
    siteName: "Desafío Hípico",
    locale: "es_VE",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Desafío Hípico · Inscritos La Rinconada y Valencia",
    description: "Inscritos, pronósticos y resultados hípicos de Venezuela.",
  },
  alternates: {
    canonical: "https://www.desafiohipico.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
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
        <SessionProviderWrapper>
          {children}
          <WhatsAppButton />
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
