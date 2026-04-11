export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatShortDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function getMonthName(month: string): string {
  const [year, m] = month.split('-');
  const date = new Date(parseInt(year), parseInt(m) - 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function getDaysRemaining(deadline: string): number {
  const now = new Date();
  const end = new Date(deadline);
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function getProgressColor(pct: number): string {
  if (pct < 0.7) return 'bg-green-500';
  if (pct < 0.9) return 'bg-yellow-500';
  return 'bg-red-500';
}

export function getCategoryIcon(category: string): string {
  const map: Record<string, string> = {
    'Food & Groceries': 'UtensilsCrossed',
    'Utilities & Phone': 'Zap',
    'Personal Care': 'Heart',
    'Social & Leisure': 'Users',
    'Miscellaneous': 'ShoppingBag',
    'Health': 'Activity',
    'Shopping': 'ShoppingCart',
    'Subscriptions': 'Tv',
    'Income': 'Wallet',
  };
  return map[category] || 'CircleDot';
}

export const EXPENSE_CATEGORIES = [
  'Food & Groceries',
  'Transportation',
  'Utilities & Phone',
  'Personal Care',
  'Social & Leisure',
  'Health',
  'Shopping',
  'Subscriptions',
  'Miscellaneous',
] as const;

export const CATEGORY_COLORS: Record<string, string> = {
  'Food & Groceries': '#3b82f6',
  'Transportation': '#6366f1',
  'Utilities & Phone': '#8b5cf6',
  'Personal Care': '#ec4899',
  'Social & Leisure': '#f59e0b',
  'Health': '#10b981',
  'Shopping': '#f97316',
  'Subscriptions': '#06b6d4',
  'Miscellaneous': '#64748b',
  'Income': '#22c55e',
  'Salary': '#059669',
  'Freelance': '#3b82f6',
  'Gift': '#f59e0b',
  'Investment': '#8b5cf6',
  'Refund': '#6366f1',
  'Other': '#64748b',
};
