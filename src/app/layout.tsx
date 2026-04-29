import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Social Posts',
  description: 'Manueller Story-Helfer für Content Bakery',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Social Posts',
  },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/icon.svg' }],
  },
  // Facebook App ID — required by Instagram's Stories Share Intent
  // (instagram-stories://share?source_application=<APP_ID>) when we wrap the
  // PWA in a native shell (Capacitor / TWA) later. Web alone can't fire that
  // intent because it needs UIPasteboard / Android Intent access, but having
  // the meta in the head is the right call for graph crawlers and prep work.
  other: {
    'fb:app_id': '1885902222063683',
  },
};

export const viewport: Viewport = {
  themeColor: '#4b1f7a',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  // Light only — see globals.css for the rationale.
  colorScheme: 'light',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="bg-neutral-50 text-neutral-900 min-h-dvh">{children}</body>
    </html>
  );
}
