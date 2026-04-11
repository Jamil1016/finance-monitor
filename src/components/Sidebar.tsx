'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme-context';
import { LayoutDashboard, Receipt, PieChart, Target, Wallet, LogOut, Palette } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/expenses', label: 'Expenses', icon: Receipt },
  { href: '/budget', label: 'Budget', icon: PieChart },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/wallet', label: 'Wallet', icon: Wallet },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { theme, togglePicker } = useTheme();
  const displayName = user?.user_metadata?.display_name || 'User';

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 h-screen sticky top-0" style={{ backgroundColor: theme.surfaceCard }}>
      <div className="p-6">
        <h1 className="text-2xl font-bold" style={{ color: theme.primaryDark }}>
          <span style={{ color: theme.primary }}>Fin</span>Track
        </h1>
        <p className="text-xs mt-1" style={{ color: theme.primary + '80' }}>Personal Finance Monitor</p>
      </div>
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link key={href} href={href}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all"
              style={isActive ? { backgroundColor: theme.primary, color: 'white' } : { color: theme.primaryText + 'cc' }}>
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 space-y-3">
        <button onClick={togglePicker} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-medium transition-colors hover:opacity-80" style={{ color: theme.primaryText }}>
          <Palette size={18} /> Theme
          <div className="ml-auto w-4 h-4 rounded-full" style={{ backgroundColor: theme.primary }} />
        </button>
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: theme.primary }}>
              {displayName.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium truncate" style={{ color: theme.primaryText }}>{displayName}</span>
          </div>
          <button onClick={signOut} className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500"><LogOut size={18} /></button>
        </div>
      </div>
    </aside>
  );
}
