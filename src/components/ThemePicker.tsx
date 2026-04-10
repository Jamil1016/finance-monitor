'use client';

import { useTheme } from '@/lib/theme-context';
import { themes } from '@/lib/themes';
import { Check, X } from 'lucide-react';

export default function ThemePicker() {
  const { theme, setThemeId, showPicker, togglePicker } = useTheme();

  if (!showPicker) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-[70] flex items-end md:items-center justify-center modal-backdrop" onClick={togglePicker}>
      <div className="bg-white w-full md:w-[400px] md:rounded-2xl rounded-t-2xl p-6 pb-8 mb-16 md:mb-0 modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-900">Choose Theme</h2>
          <button onClick={togglePicker} className="p-1.5 hover:bg-slate-100 rounded-lg">
            <X size={20} className="text-slate-400" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {themes.map((t) => {
            const isActive = theme.id === t.id;
            return (
              <button
                key={t.id}
                onClick={() => { setThemeId(t.id); togglePicker(); }}
                className={`relative rounded-xl p-4 border-2 transition-all text-left ${
                  isActive ? 'border-slate-900 shadow-md scale-[1.02]' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {isActive && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: t.primary }}>
                    <Check size={12} className="text-white" />
                  </div>
                )}
                <div className="flex gap-1.5 mb-2">
                  <div className="w-6 h-6 rounded-full" style={{ backgroundColor: t.primaryDark }} />
                  <div className="w-6 h-6 rounded-full" style={{ backgroundColor: t.primary }} />
                  <div className="w-6 h-6 rounded-full" style={{ backgroundColor: t.primaryLight }} />
                </div>
                <p className="text-sm font-semibold text-slate-900">{t.name}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
