'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import AuthGuard from './AuthGuard';
import ThemePicker from './ThemePicker';

const PUBLIC_ROUTES = ['/login', '/signup'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const isPublic = PUBLIC_ROUTES.includes(pathname);

  return (
    <AuthGuard>
      {!isPublic && user ? (
        <div className="flex h-full">
          <Sidebar />
          <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
            <div className="max-w-5xl mx-auto px-4 py-6 md:px-8 md:py-8">
              {children}
            </div>
          </main>
          <BottomNav />
          <ThemePicker />
        </div>
      ) : (
        children
      )}
    </AuthGuard>
  );
}
