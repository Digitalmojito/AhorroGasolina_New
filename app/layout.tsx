import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import Script from 'next/script';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'AhorroGasolina.es - Encuentra la gasolina más barata cerca de ti',
  description: 'Compara precios de gasolina y diésel en tiempo real en todas las gasolineras de España. Datos oficiales del Ministerio de Industria.',
  openGraph: {
    title: 'AhorroGasolina.es - Precios de combustible en España',
    description: 'Encuentra la gasolinera más barata cerca de ti. Datos en tiempo real.',
    images: [{ url: 'https://bolt.new/static/og_default.png' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          crossOrigin="anonymous"
        />
      </head>
      <body className={`${inter.variable} font-sans`} suppressHydrationWarning>
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
        <Script
          src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
          crossOrigin="anonymous"
          strategy="beforeInteractive"
        />
      </body>
    </html>
  );
}
