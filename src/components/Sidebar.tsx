'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Receipt,
  PieChart,
  Target,
  Wallet,
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/expenses', label: 'Expenses', icon: Receipt },
  { href: '/budget', label: 'Budget', icon: PieChart },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/income', label: 'Income', icon: Wallet },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 bg-white border-r border-slate-200 h-screen sticky top-0">
      <div className="p-6 border-b border-slate-100">
        <h1 className="text-2xl font-bold text-blue-800">
          <span className="text-blue-500">Fin</span>Track
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
                  ? 'bg-blue-50 text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-100">
        <div className="bg-blue-50 rounded-xl p-4">
          <p className="text-xs font-semibold text-blue-800">Savings Goal</p>
          <p className="text-lg font-bold text-blue-600 mt-1">Track your progress</p>
          <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
            <div className="bg-blue-600 h-2 rounded-full progress-bar" style={{ width: '0%' }} />
          </div>
          <p className="text-xs text-blue-500 mt-1">Set up your goals to start</p>
        </div>
      </div>
    </aside>
  );
}
