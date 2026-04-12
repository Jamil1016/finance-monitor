// Offline-aware database layer
// Tries Supabase first, falls back to cache + queue

import * as db from './database';
import { cacheData, getCachedData, queueWrite, isOnline } from './offline';
import { sanitizeText, sanitizeAmount } from './validation';
import { Transaction, Account, BudgetCategory, SavingsGoal, MonthlyIncome } from './types';

// ---- ACCOUNTS ----
export async function getAccounts(): Promise<Account[]> {
  if (isOnline()) {
    try {
      const data = await db.getAccounts();
      await cacheData('accounts', data);
      return data;
    } catch {}
  }
  return await getCachedData<Account[]>('accounts') || [];
}

export async function addAccount(account: Omit<Account, 'id'>): Promise<Account | null> {
  if (isOnline()) {
    const result = await db.addAccount(account);
    if (result) {
      const accounts = await db.getAccounts();
      await cacheData('accounts', accounts);
    }
    return result;
  }
  // Offline: queue the write
  const tempId = 'temp_' + Date.now();
  await queueWrite({
    table: 'accounts',
    action: 'insert',
    data: { name: account.name, balance: account.balance, credit_limit: account.creditLimit, billing_day: account.billingDay, type: account.type, icon: account.icon, color: account.color },
  });
  return { ...account, id: tempId } as Account;
}

// ---- TRANSACTIONS ----
export async function getTransactions(month?: string): Promise<Transaction[]> {
  const cacheKey = `transactions_${month || 'all'}`;
  if (isOnline()) {
    try {
      const data = await db.getTransactions(month);
      await cacheData(cacheKey, data);
      return data;
    } catch {}
  }
  return await getCachedData<Transaction[]>(cacheKey) || [];
}

export async function addTransaction(tx: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction | null> {
  if (isOnline()) {
    const result = await db.addTransaction(tx);
    return result;
  }
  // Offline: queue
  const tempId = 'temp_' + Date.now();
  await queueWrite({
    table: 'transactions',
    action: 'insert',
    data: { amount: tx.amount, category: tx.category, description: tx.description, type: tx.type, date: tx.date, time: tx.time, location: tx.location },
  });
  return { ...tx, id: tempId, createdAt: new Date().toISOString() } as Transaction;
}

export async function deleteTransaction(id: string): Promise<void> {
  if (isOnline()) {
    await db.deleteTransaction(id);
    return;
  }
  if (!id.startsWith('temp_')) {
    await queueWrite({ table: 'transactions', action: 'delete', data: { id } });
  }
}

// ---- BUDGETS ----
export async function getBudgets(): Promise<BudgetCategory[]> {
  if (isOnline()) {
    try {
      const data = await db.getBudgets();
      await cacheData('budgets', data);
      return data;
    } catch {}
  }
  return await getCachedData<BudgetCategory[]>('budgets') || [];
}

export async function initDefaultBudgets(): Promise<BudgetCategory[]> {
  if (isOnline()) {
    const data = await db.initDefaultBudgets();
    await cacheData('budgets', data);
    return data;
  }
  return [];
}

// ---- GOALS ----
export async function getGoals(): Promise<SavingsGoal[]> {
  if (isOnline()) {
    try {
      const data = await db.getGoals();
      await cacheData('goals', data);
      return data;
    } catch {}
  }
  return await getCachedData<SavingsGoal[]>('goals') || [];
}

// ---- MONTHLY INCOME ----
export async function getMonthlyIncomes(): Promise<MonthlyIncome[]> {
  if (isOnline()) {
    try {
      const data = await db.getMonthlyIncomes();
      await cacheData('monthly_income', data);
      return data;
    } catch {}
  }
  return await getCachedData<MonthlyIncome[]>('monthly_income') || [];
}

// Re-export everything else directly from database
export {
  updateAccountBalance,
  updateAccount,
  deleteAccount,
  updateTransaction,
  saveBudgets,
  addGoal,
  updateGoal,
  updateGoalFunds,
  deleteGoal,
  getGoalTransactions,
  addGoalTransaction,
  getLiabilities,
  addLiability,
  updateLiability,
  deleteLiability,
  getPaymentHistory,
  addPaymentRecord,
  addMonthlyIncome,
  updateMonthlyIncome,
  deleteMonthlyIncome,
} from './database';
