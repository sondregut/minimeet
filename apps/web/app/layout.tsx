import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration';

export const metadata: Metadata = {
  title: {
    default: 'EasyMeet',
    template: '%s | EasyMeet',
  },
  description: 'Friidrettsstevne - live resultater og stevnehåndtering',
  keywords: ['friidrett', 'athletics', 'track and field', 'live results', 'stevne', 'competition'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'EasyMeet',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'EasyMeet',
    title: 'EasyMeet - Friidrettsstevne',
    description: 'Live resultater og stevnehåndtering for friidrett',
  },
};

export const viewport: Viewport = {
  themeColor: '#1e3a5f',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="no">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="EasyMeet" />
        <link rel="apple-touch-icon" href="/apple-icon" />
      </head>
      <body className="min-h-screen bg-white antialiased">
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
