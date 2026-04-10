'use client';

import {
  UtensilsCrossed, Zap, Heart, Users, ShoppingBag,
  Activity, ShoppingCart, Tv, Wallet, Car, Gift,
  Coffee, Briefcase, Home, CircleDot, Plus,
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<any>> = {
  UtensilsCrossed, Zap, Heart, Users, ShoppingBag,
  Activity, ShoppingCart, Tv, Wallet, Car, Gift,
  Coffee, Briefcase, Home, CircleDot, Plus,
};

const categoryStyles: Record<string, { bg: string; icon: string; iconName: string }> = {
  'Food & Groceries':  { bg: '#fef3c7', icon: '#f59e0b', iconName: 'UtensilsCrossed' },
  'Utilities & Phone': { bg: '#dbeafe', icon: '#3b82f6', iconName: 'Zap' },
  'Personal Care':     { bg: '#fce7f3', icon: '#ec4899', iconName: 'Heart' },
  'Social & Leisure':  { bg: '#d1fae5', icon: '#10b981', iconName: 'Users' },
  'Health':            { bg: '#fee2e2', icon: '#ef4444', iconName: 'Activity' },
  'Shopping':          { bg: '#ffedd5', icon: '#f97316', iconName: 'ShoppingCart' },
  'Subscriptions':     { bg: '#ede9fe', icon: '#8b5cf6', iconName: 'Tv' },
  'Miscellaneous':     { bg: '#f1f5f9', icon: '#64748b', iconName: 'ShoppingBag' },
  'Income':            { bg: '#d1fae5', icon: '#059669', iconName: 'Wallet' },
  'Salary':            { bg: '#fce7f3', icon: '#ec4899', iconName: 'Briefcase' },
  'Transport':         { bg: '#e0e7ff', icon: '#6366f1', iconName: 'Car' },
  'Gift':              { bg: '#fef3c7', icon: '#f59e0b', iconName: 'Gift' },
};

interface CategoryIconProps {
  category: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function CategoryIcon({ category, size = 'md', className = '' }: CategoryIconProps) {
  const style = categoryStyles[category] || { bg: '#f1f5f9', icon: '#64748b', iconName: 'CircleDot' };
  const IconComponent = iconMap[style.iconName] || CircleDot;

  const sizes = {
    sm: { container: 'w-8 h-8', icon: 14 },
    md: { container: 'w-11 h-11', icon: 20 },
    lg: { container: 'w-14 h-14', icon: 26 },
  };

  const s = sizes[size];

  return (
    <div
      className={`${s.container} rounded-full flex items-center justify-center shrink-0 ${className}`}
      style={{ backgroundColor: style.bg }}
    >
      <IconComponent size={s.icon} style={{ color: style.icon }} />
    </div>
  );
}

export { categoryStyles };
