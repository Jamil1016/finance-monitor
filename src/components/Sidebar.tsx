'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme-context';
import {
  LayoutDashboard,
  Receipt,
  PieChart,
  Target,
  Wallet,
  LogOut,
  Palette,
} from 'lucide-react';

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
    <aside className="hidden md:flex md:flex-col md:w-64 bg-white border-r border-slate-200 h-screen sticky top-0">
      <div className="p-6 border-b border-slate-100">
        <h1 className="text-2xl font-bold" style={{ color: theme.primaryDark }}>
          <span style={{ color: theme.primary }}>Fin</span>Track
        </h1>
        <p className="text-xs text-slate-400 mt-1">Personal Finance Monitor</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
              style={isActive ? { backgroundColor: theme.primaryBg, color: theme.primaryText } : {}}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-100 space-y-3">
        <button
          onClick={togglePicker}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <Palette size={18} />
          Theme
          <div className="ml-auto flex gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.primary }} />
          </div>
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
              style={{ backgroundColor: theme.primary }}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-slate-700 truncate">{displayName}</span>
          </div>
          <button onClick={signOut} className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors" title="Sign out">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}
