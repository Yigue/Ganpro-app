import 'maplibre-gl/dist/maplibre-gl.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: { default: 'GanPro Dashboard', template: '%s · GanPro' },
  description: 'Gestión ganadera de Loma Alta: stock, sanidad, reproducción, nutrición, costos y finanzas.',
  applicationName: 'GanPro',
  appleWebApp: { capable: true, title: 'GanPro', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#2a6a40' },
    { media: '(prefers-color-scheme: dark)', color: '#121a15' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={inter.variable}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
