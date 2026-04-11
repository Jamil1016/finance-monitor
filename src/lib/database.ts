import { supabase } from './supabase';
import { Transaction, BudgetCategory, SavingsGoal, GoalTransaction, Account, MonthlyIncome } from './types';

// ---- ACCOUNTS ----
export async function getAccounts(): Promise<Account[]> {
  const { data } = await supabase.from('accounts').select('*').order('created_at');
  return (data || []).map((r) => ({ id: r.id, name: r.name, balance: Number(r.balance), type: r.type }));
}

export async function upsertAccount(account: Omit<Account, 'id'> & { id?: string }): Promise<Account | null> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return null;
  const { data } = await supabase.from('accounts').upsert({ ...account, user_id: user.id }).select().single();
  return data ? { id: data.id, name: data.name, balance: Number(data.balance), type: data.type } : null;
}

export async function updateAccountBalance(id: string, balance: number) {
  await supabase.from('accounts').update({ balance }).eq('id', id);
}

export async function deleteAccount(id: string) {
  await supabase.from('accounts').delete().eq('id', id);
}

// ---- TRANSACTIONS ----
export async function getTransactions(month?: string): Promise<Transaction[]> {
  let query = supabase.from('transactions').select('*').order('date', { ascending: false });
  if (month) {
    const start = `${month}-01`;
    const [y, m] = month.split('-').map(Number);
    const end = new Date(y, m, 0).toISOString().split('T')[0];
    query = query.gte('date', start).lte('date', end);
  }
  const { data } = await query;
  return (data || []).map((r) => ({
    id: r.id, amount: Number(r.amount), category: r.category,
    description: r.description || '', type: r.type, date: r.date,
    createdAt: r.created_at,
  }));
}

export async function addTransaction(tx: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction | null> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return null;
  const { data } = await supabase.from('transactions').insert({
    user_id: user.id, amount: tx.amount, category: tx.category,
    description: tx.description, type: tx.type, date: tx.date,
  }).select().single();
  return data ? { id: data.id, amount: Number(data.amount), category: data.category, description: data.description || '', type: data.type, date: data.date, createdAt: data.created_at } : null;
}

export async function deleteTransaction(id: string) {
  await supabase.from('transactions').delete().eq('id', id);
}

// ---- BUDGETS ----
export async function getBudgets(): Promise<BudgetCategory[]> {
  const { data } = await supabase.from('budgets').select('*').order('created_at');
  return (data || []).map((r) => ({
    id: r.id, name: r.name, budgeted: Number(r.budgeted), spent: 0, type: r.type, icon: r.icon || 'CircleDot',
  }));
}

export async function saveBudgets(budgets: { id: string; budgeted: number }[]) {
  for (const b of budgets) {
    await supabase.from('budgets').update({ budgeted: b.budgeted }).eq('id', b.id);
  }
}

export async function initDefaultBudgets(): Promise<BudgetCategory[]> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return [];
  const defaults = [
    { name: 'Food & Groceries', budgeted: 5000, type: 'needs', icon: 'UtensilsCrossed' },
    { name: 'Utilities & Phone', budgeted: 2000, type: 'needs', icon: 'Zap' },
    { name: 'Personal Care', budgeted: 1000, type: 'needs', icon: 'Heart' },
    { name: 'Social & Leisure', budgeted: 2000, type: 'wants', icon: 'Users' },
    { name: 'Miscellaneous', budgeted: 3000, type: 'wants', icon: 'ShoppingBag' },
  ];
  const { data } = await supabase.from('budgets').insert(defaults.map((d) => ({ ...d, user_id: user.id }))).select();
  return (data || []).map((r) => ({ id: r.id, name: r.name, budgeted: Number(r.budgeted), spent: 0, type: r.type, icon: r.icon }));
}

// ---- GOALS ----
export async function getGoals(): Promise<SavingsGoal[]> {
  const { data } = await supabase.from('goals').select('*').order('priority', { ascending: true });
  return (data || []).map((r) => ({
    id: r.id, name: r.name, target: Number(r.target), current: Number(r.current),
    deadline: r.deadline || '2026-12-31', color: r.color || '#3b82f6',
    category: r.category || 'other', icon: r.icon || '🎯', notes: r.notes || '',
    priority: r.priority || 0, createdAt: r.created_at,
  }));
}

export async function addGoal(goal: Omit<SavingsGoal, 'id' | 'createdAt'>): Promise<SavingsGoal | null> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return null;
  const { data } = await supabase.from('goals').insert({
    user_id: user.id, name: goal.name, target: goal.target, current: goal.current,
    deadline: goal.deadline, color: goal.color, category: goal.category,
    icon: goal.icon, notes: goal.notes, priority: goal.priority,
  }).select().single();
  return data ? {
    id: data.id, name: data.name, target: Number(data.target), current: Number(data.current),
    deadline: data.deadline, color: data.color, category: data.category || 'other',
    icon: data.icon || '🎯', notes: data.notes || '', priority: data.priority || 0,
    createdAt: data.created_at,
  } : null;
}

export async function updateGoal(id: string, updates: Partial<SavingsGoal>) {
  await supabase.from('goals').update(updates).eq('id', id);
}

export async function updateGoalFunds(id: string, current: number) {
  await supabase.from('goals').update({ current }).eq('id', id);
}

export async function deleteGoal(id: string) {
  await supabase.from('goals').delete().eq('id', id);
  await supabase.from('goal_transactions').delete().eq('goal_id', id);
}

// ---- GOAL TRANSACTIONS (deposit/withdraw history) ----
export async function getGoalTransactions(goalId: string): Promise<GoalTransaction[]> {
  const { data } = await supabase.from('goal_transactions').select('*').eq('goal_id', goalId).order('date', { ascending: false });
  return (data || []).map((r) => ({
    id: r.id, goalId: r.goal_id, amount: Number(r.amount),
    type: r.type, note: r.note || '', date: r.date,
  }));
}

export async function addGoalTransaction(tx: Omit<GoalTransaction, 'id'>): Promise<GoalTransaction | null> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return null;
  const { data } = await supabase.from('goal_transactions').insert({
    user_id: user.id, goal_id: tx.goalId, amount: tx.amount,
    type: tx.type, note: tx.note, date: tx.date,
  }).select().single();
  return data ? { id: data.id, goalId: data.goal_id, amount: Number(data.amount), type: data.type, note: data.note || '', date: data.date } : null;
}

// ---- MONTHLY INCOME ----
export async function getMonthlyIncomes(): Promise<MonthlyIncome[]> {
  const { data } = await supabase.from('monthly_income').select('*').order('month', { ascending: false });
  return (data || []).map((r) => ({
    id: r.id, month: r.month, basicPay: Number(r.basic_pay), allowances: Number(r.allowances),
    overtime: Number(r.overtime), deMinimis: Number(r.de_minimis), holidayPay: Number(r.holiday_pay),
    nsd: Number(r.nsd), grossPay: Number(r.gross_pay), sss: Number(r.sss), philhealth: Number(r.philhealth),
    pagibig: Number(r.pagibig), tax: Number(r.tax), otherDeductions: Number(r.other_deductions), netPay: Number(r.net_pay),
  }));
}

export async function addMonthlyIncome(inc: Omit<MonthlyIncome, 'id'>): Promise<MonthlyIncome | null> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return null;
  const { data } = await supabase.from('monthly_income').insert({
    user_id: user.id, month: inc.month, basic_pay: inc.basicPay, allowances: inc.allowances,
    overtime: inc.overtime, de_minimis: inc.deMinimis, holiday_pay: inc.holidayPay, nsd: inc.nsd,
    gross_pay: inc.grossPay, sss: inc.sss, philhealth: inc.philhealth, pagibig: inc.pagibig,
    tax: inc.tax, other_deductions: inc.otherDeductions, net_pay: inc.netPay,
  }).select().single();
  return data ? { id: data.id, month: data.month, basicPay: Number(data.basic_pay), allowances: Number(data.allowances), overtime: Number(data.overtime), deMinimis: Number(data.de_minimis), holidayPay: Number(data.holiday_pay), nsd: Number(data.nsd), grossPay: Number(data.gross_pay), sss: Number(data.sss), philhealth: Number(data.philhealth), pagibig: Number(data.pagibig), tax: Number(data.tax), otherDeductions: Number(data.other_deductions), netPay: Number(data.net_pay) } : null;
}

export async function updateMonthlyIncome(id: string, inc: Omit<MonthlyIncome, 'id'>) {
  const { data } = await supabase.from('monthly_income').update({
    month: inc.month, basic_pay: inc.basicPay, allowances: inc.allowances,
    overtime: inc.overtime, de_minimis: inc.deMinimis, holiday_pay: inc.holidayPay, nsd: inc.nsd,
    gross_pay: inc.grossPay, sss: inc.sss, philhealth: inc.philhealth, pagibig: inc.pagibig,
    tax: inc.tax, other_deductions: inc.otherDeductions, net_pay: inc.netPay,
  }).eq('id', id).select().single();
  return data ? { id: data.id, month: data.month, basicPay: Number(data.basic_pay), allowances: Number(data.allowances), overtime: Number(data.overtime), deMinimis: Number(data.de_minimis), holidayPay: Number(data.holiday_pay), nsd: Number(data.nsd), grossPay: Number(data.gross_pay), sss: Number(data.sss), philhealth: Number(data.philhealth), pagibig: Number(data.pagibig), tax: Number(data.tax), otherDeductions: Number(data.other_deductions), netPay: Number(data.net_pay) } as MonthlyIncome : null;
}

export async function deleteMonthlyIncome(id: string) {
  await supabase.from('monthly_income').delete().eq('id', id);
}
