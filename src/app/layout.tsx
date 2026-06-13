import type { Metadata, Viewport } from 'next';
import BottomNav from '@/components/BottomNav';
import './globals.css';

export const metadata: Metadata = {
  title: 'World Cup Sweepstake',
  description: 'Family & friends World Cup sweepstake — groups, fixtures, results and leaderboard.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Sweepstake' },
};

export const viewport: Viewport = {
  themeColor: '#0b6e4f',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">
        <div className="mx-auto flex min-h-dvh max-w-3xl flex-col">
          <main className="flex-1 px-4 pb-24 pt-4">{children}</main>
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
