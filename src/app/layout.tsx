import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nakconel Bank — Secure. Simple. Global.',
  description: 'Our world. Our bank. A better tomorrow.',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#651719',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        {/* Apply dark mode before paint to avoid flash */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = localStorage.getItem('nkc_theme');
            if (t === 'dark') document.documentElement.setAttribute('data-theme','dark');
          } catch(e){}
        ` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
