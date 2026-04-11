'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/lib/theme-context';
import { LayoutDashboard, Receipt, PieChart, Target, Wallet, FileText } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Home', icon: LayoutDashboard },
  { href: '/expenses', label: 'Expenses', icon: Receipt },
  { href: '/budget', label: 'Budget', icon: PieChart },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/wallet', label: 'Wallet', icon: Wallet },
  { href: '/income', label: 'Income', icon: FileText },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { theme } = useTheme();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 safe-bottom z-50" style={{ backgroundColor: theme.surfaceCard }}>
      <div className="flex items-center justify-around py-1.5 px-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link key={href} href={href}
              className="flex flex-col items-center gap-0 py-1 px-2 rounded-xl min-w-[44px] transition-all"
              style={isActive ? { backgroundColor: theme.primary, color: 'white' } : { color: theme.primaryText + '80' }}>
              <Icon size={18} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className={`text-[8px] ${isActive ? 'font-bold' : 'font-medium'}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
