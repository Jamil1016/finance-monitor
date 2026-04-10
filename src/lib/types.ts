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
}

export interface Account {
  id: string;
  name: string;
  balance: number;
  type: 'bank' | 'ewallet' | 'cash';
}

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
