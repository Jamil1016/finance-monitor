export interface Theme {
  name: string;
  id: string;
  primary: string;      // main color (bg buttons, nav active)
  primaryDark: string;  // darker shade (gradient start, header)
  primaryLight: string; // lighter shade (hover, accents)
  primaryBg: string;    // very light bg (cards, highlights)
  primaryText: string;  // text on primary bg
  gradient: string;     // tailwind gradient classes
  ring: string;         // focus ring color
}

export const themes: Theme[] = [
  {
    name: 'Ocean Blue',
    id: 'blue',
    primary: '#3b82f6',
    primaryDark: '#1e40af',
    primaryLight: '#60a5fa',
    primaryBg: '#dbeafe',
    primaryText: '#1e40af',
    gradient: 'from-blue-800 to-blue-600',
    ring: 'ring-blue-500',
  },
  {
    name: 'Rose Pink',
    id: 'pink',
    primary: '#ec4899',
    primaryDark: '#be185d',
    primaryLight: '#f472b6',
    primaryBg: '#fce7f3',
    primaryText: '#be185d',
    gradient: 'from-pink-700 to-pink-500',
    ring: 'ring-pink-500',
  },
  {
    name: 'Emerald Green',
    id: 'green',
    primary: '#10b981',
    primaryDark: '#065f46',
    primaryLight: '#34d399',
    primaryBg: '#d1fae5',
    primaryText: '#065f46',
    gradient: 'from-emerald-800 to-emerald-600',
    ring: 'ring-emerald-500',
  },
  {
    name: 'Royal Purple',
    id: 'purple',
    primary: '#8b5cf6',
    primaryDark: '#5b21b6',
    primaryLight: '#a78bfa',
    primaryBg: '#ede9fe',
    primaryText: '#5b21b6',
    gradient: 'from-violet-800 to-violet-600',
    ring: 'ring-violet-500',
  },
  {
    name: 'Sunset Orange',
    id: 'orange',
    primary: '#f97316',
    primaryDark: '#c2410c',
    primaryLight: '#fb923c',
    primaryBg: '#ffedd5',
    primaryText: '#c2410c',
    gradient: 'from-orange-700 to-orange-500',
    ring: 'ring-orange-500',
  },
  {
    name: 'Slate Dark',
    id: 'dark',
    primary: '#64748b',
    primaryDark: '#1e293b',
    primaryLight: '#94a3b8',
    primaryBg: '#f1f5f9',
    primaryText: '#1e293b',
    gradient: 'from-slate-800 to-slate-600',
    ring: 'ring-slate-500',
  },
];

export function getTheme(id: string): Theme {
  return themes.find((t) => t.id === id) || themes[0];
}
