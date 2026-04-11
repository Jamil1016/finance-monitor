export interface Theme {
  name: string;
  id: string;
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primaryBg: string;
  primaryText: string;
  gradient: string;
  surfaceBg: string;      // tinted page background
  surfaceCard: string;    // tinted card background
  surfaceInput: string;   // tinted input background
  navBg: string;          // bottom nav tint
  headerGradient: [string, string]; // hero card gradient
}

export const themes: Theme[] = [
  {
    name: 'Mint Green',
    id: 'mint',
    primary: '#00D09C',
    primaryDark: '#00916D',
    primaryLight: '#5EFFC1',
    primaryBg: '#E0FFF5',
    primaryText: '#00695C',
    gradient: 'from-emerald-600 to-teal-400',
    surfaceBg: '#F0FDF9',
    surfaceCard: '#E0FFF5',
    surfaceInput: '#F0FDF9',
    navBg: '#F0FDF9',
    headerGradient: ['#00916D', '#00D09C'],
  },
  {
    name: 'Ocean Blue',
    id: 'blue',
    primary: '#3B82F6',
    primaryDark: '#1E40AF',
    primaryLight: '#60A5FA',
    primaryBg: '#DBEAFE',
    primaryText: '#1E40AF',
    gradient: 'from-blue-800 to-blue-500',
    surfaceBg: '#F0F6FF',
    surfaceCard: '#E8F1FF',
    surfaceInput: '#F0F6FF',
    navBg: '#F0F6FF',
    headerGradient: ['#1E40AF', '#3B82F6'],
  },
  {
    name: 'Rose Pink',
    id: 'pink',
    primary: '#EC4899',
    primaryDark: '#BE185D',
    primaryLight: '#F472B6',
    primaryBg: '#FCE7F3',
    primaryText: '#BE185D',
    gradient: 'from-pink-700 to-pink-400',
    surfaceBg: '#FFF5F9',
    surfaceCard: '#FFE8F1',
    surfaceInput: '#FFF5F9',
    navBg: '#FFF5F9',
    headerGradient: ['#BE185D', '#EC4899'],
  },
  {
    name: 'Royal Purple',
    id: 'purple',
    primary: '#8B5CF6',
    primaryDark: '#5B21B6',
    primaryLight: '#A78BFA',
    primaryBg: '#EDE9FE',
    primaryText: '#5B21B6',
    gradient: 'from-violet-700 to-violet-400',
    surfaceBg: '#F5F3FF',
    surfaceCard: '#EDE9FE',
    surfaceInput: '#F5F3FF',
    navBg: '#F5F3FF',
    headerGradient: ['#5B21B6', '#8B5CF6'],
  },
  {
    name: 'Sunset Orange',
    id: 'orange',
    primary: '#F97316',
    primaryDark: '#C2410C',
    primaryLight: '#FB923C',
    primaryBg: '#FFEDD5',
    primaryText: '#C2410C',
    gradient: 'from-orange-700 to-orange-400',
    surfaceBg: '#FFF7ED',
    surfaceCard: '#FFEDD5',
    surfaceInput: '#FFF7ED',
    navBg: '#FFF7ED',
    headerGradient: ['#C2410C', '#F97316'],
  },
  {
    name: 'Slate Dark',
    id: 'dark',
    primary: '#64748B',
    primaryDark: '#1E293B',
    primaryLight: '#94A3B8',
    primaryBg: '#F1F5F9',
    primaryText: '#1E293B',
    gradient: 'from-slate-800 to-slate-500',
    surfaceBg: '#F8FAFC',
    surfaceCard: '#F1F5F9',
    surfaceInput: '#F8FAFC',
    navBg: '#F8FAFC',
    headerGradient: ['#1E293B', '#475569'],
  },
];

export function getTheme(id: string): Theme {
  return themes.find((t) => t.id === id) || themes[0];
}
