'use client';

import { useTheme } from '@/lib/theme-context';
import { themes } from '@/lib/themes';
import { Check, X } from 'lucide-react';

export default function ThemePicker() {
  const { theme, setThemeId, showPicker, togglePicker } = useTheme();
  if (!showPicker) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-[70] flex items-end md:items-center justify-center modal-backdrop" onClick={togglePicker}>
      <div className="bg-white w-full md:w-[420px] md:rounded-3xl rounded-t-3xl p-6 pb-8 mb-16 md:mb-0 modal-content max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-900">Choose Design</h2>
          <button onClick={togglePicker} className="p-1.5 hover:bg-slate-100 rounded-xl"><X size={20} className="text-slate-400" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {themes.map(t => {
            const isActive = theme.id === t.id;
            return (
              <button key={t.id} onClick={() => { setThemeId(t.id); togglePicker(); }}
                className={`relative rounded-2xl p-3 border-2 transition-all text-left ${isActive ? 'scale-[1.02] shadow-md' : 'hover:scale-[1.01]'}`}
                style={{ borderColor: isActive ? t.primary : '#e2e8f0', backgroundColor: t.surfaceCard }}>
                {isActive && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: t.primary }}>
                    <Check size={12} className="text-white" />
                  </div>
                )}
                {/* Mini preview */}
                <div className="w-full h-12 rounded-xl mb-2" style={{ background: `linear-gradient(135deg, ${t.headerGradient[0]}, ${t.headerGradient[1]})` }} />
                <div className="flex gap-1 mb-2">
                  <div className="w-5 h-5 rounded-full" style={{ backgroundColor: t.primaryDark }} />
                  <div className="w-5 h-5 rounded-full" style={{ backgroundColor: t.primary }} />
                  <div className="w-5 h-5 rounded-full" style={{ backgroundColor: t.primaryLight }} />
                </div>
                <p className="text-xs font-bold text-slate-900">{t.name}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
