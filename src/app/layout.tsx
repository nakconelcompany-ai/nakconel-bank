import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nakconel Bank — Secure. Simple. Global.',
  description: 'Our world. Our bank. A better tomorrow.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,          // prevent user zoom on inputs (matches native app feel)
  userScalable: false,
  viewportFit: 'cover',     // fill the iPhone notch / home indicator area
  themeColor: '#651719',    // maroon — matches the header on mobile browser chrome
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
