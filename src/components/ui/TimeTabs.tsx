'use client';

import { useTheme } from '@/lib/theme-context';

interface TimeTabsProps {
  active: string;
  onChange: (tab: string) => void;
  tabs?: string[];
}

export default function TimeTabs({ active, onChange, tabs = ['Today', 'Week', 'Month'] }: TimeTabsProps) {
  const { theme } = useTheme();

  return (
    <div className="flex bg-slate-100 rounded-xl p-1">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
            active === tab ? 'text-white shadow-sm' : 'text-slate-500'
          }`}
          style={active === tab ? { backgroundColor: theme.primary } : {}}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
