import type { Metadata, Viewport } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';

export const metadata: Metadata = {
  title: 'FinTrack - Personal Finance Monitor',
  description: 'Track your expenses, budget, and savings goals',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'FinTrack',
  },
};

export const viewport: Viewport = {
  themeColor: '#1e40af',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-slate-50">
        <div className="flex h-full">
          <Sidebar />
          <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
            <div className="max-w-5xl mx-auto px-4 py-6 md:px-8 md:py-8">
              {children}
            </div>
          </main>
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
