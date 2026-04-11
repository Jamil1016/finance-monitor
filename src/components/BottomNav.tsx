'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/lib/theme-context';
import {
  LayoutDashboard,
  Receipt,
  PieChart,
  Target,
  Wallet,
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Home', icon: LayoutDashboard },
  { href: '/expenses', label: 'Expenses', icon: Receipt },
  { href: '/budget', label: 'Budget', icon: PieChart },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/wallet', label: 'Wallet', icon: Wallet },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { theme } = useTheme();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 safe-bottom z-50">
      <div className="flex items-center justify-around py-2 px-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg min-w-[56px] transition-colors"
              style={{ color: isActive ? theme.primary : '#94a3b8' }}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className={`text-[10px] ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
