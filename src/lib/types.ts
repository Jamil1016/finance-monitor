export interface Transaction {
  id: string;
  amount: number;
  category: string;
  description: string;
  type: 'income' | 'expense';
  date: string;
  createdAt: string;
}

export interface BudgetCategory {
  id: string;
  name: string;
  budgeted: number;
  spent: number;
  type: 'needs' | 'wants' | 'savings';
  icon: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  target: number;
  current: number;
  deadline: string;
  color: string;
  category: GoalCategory;
  icon: string;
  notes: string;
  priority: number;
  createdAt: string;
}

export interface GoalTransaction {
  id: string;
  goalId: string;
  amount: number;
  type: 'deposit' | 'withdraw';
  note: string;
  date: string;
}

export type GoalCategory = 'emergency' | 'travel' | 'investment' | 'purchase' | 'debt' | 'education' | 'retirement' | 'other';

export const GOAL_CATEGORIES: { id: GoalCategory; label: string; icon: string; color: string }[] = [
  { id: 'emergency', label: 'Emergency Fund', icon: '🛡️', color: '#ef4444' },
  { id: 'travel', label: 'Travel', icon: '✈️', color: '#3b82f6' },
  { id: 'investment', label: 'Investment', icon: '📈', color: '#10b981' },
  { id: 'purchase', label: 'Big Purchase', icon: '🏠', color: '#f59e0b' },
  { id: 'debt', label: 'Debt Payoff', icon: '💳', color: '#8b5cf6' },
  { id: 'education', label: 'Education', icon: '🎓', color: '#06b6d4' },
  { id: 'retirement', label: 'Retirement', icon: '🏖️', color: '#ec4899' },
  { id: 'other', label: 'Other', icon: '🎯', color: '#64748b' },
];

export const GOAL_TEMPLATES = [
  { name: 'Emergency Fund (6 months)', target: 150000, category: 'emergency' as GoalCategory, icon: '🛡️', color: '#ef4444' },
  { name: 'Travel Fund', target: 50000, category: 'travel' as GoalCategory, icon: '✈️', color: '#3b82f6' },
  { name: 'Investment Portfolio', target: 500000, category: 'investment' as GoalCategory, icon: '📈', color: '#10b981' },
  { name: 'New Laptop/Gadget', target: 60000, category: 'purchase' as GoalCategory, icon: '💻', color: '#f59e0b' },
  { name: 'Pag-IBIG MP2 (5yr)', target: 120000, category: 'investment' as GoalCategory, icon: '🏦', color: '#8b5cf6' },
  { name: 'Car Down Payment', target: 200000, category: 'purchase' as GoalCategory, icon: '🚗', color: '#f97316' },
  { name: 'Debt Payoff', target: 50000, category: 'debt' as GoalCategory, icon: '💳', color: '#dc2626' },
];

export interface Account {
  id: string;
  name: string;
  balance: number;       // For regular: how much you have. For credit card: how much you OWE (starts at 0)
  creditLimit: number;   // Only for credit cards: max you can spend
  type: 'bank' | 'ewallet' | 'cash' | 'credit_card';
  icon: string;
  color: string;
}

export interface Liability {
  id: string;
  name: string;
  creditor: string;
  totalAmount: number;
  remainingAmount: number;
  monthlyPayment: number;
  deadline: string;
  notes: string;
  color: string;
}

export const ACCOUNT_ICONS: { type: string; label: string; icon: string; color: string }[] = [
  { type: 'bank', label: 'Bank', icon: '🏦', color: '#3b82f6' },
  { type: 'ewallet', label: 'E-Wallet', icon: '📱', color: '#10b981' },
  { type: 'cash', label: 'Cash', icon: '💵', color: '#f59e0b' },
  { type: 'credit_card', label: 'Credit Card', icon: '💳', color: '#ef4444' },
];

export interface MonthlyIncome {
  id: string;
  month: string;
  basicPay: number;
  allowances: number;
  overtime: number;
  deMinimis: number;
  holidayPay: number;
  nsd: number;
  grossPay: number;
  sss: number;
  philhealth: number;
  pagibig: number;
  tax: number;
  otherDeductions: number;
  netPay: number;
}
