'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, TrendingUp, Wallet, CreditCard, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Transaction, Account, SavingsGoal, BudgetCategory } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import * as db from '@/lib/database';
import { formatCurrency, formatShortDate, getCurrentMonth, getGreeting, getDaysRemaining, EXPENSE_CATEGORIES, CATEGORY_COLORS } from '@/lib/utils';

export default function Dashboard() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [budgets, setBudgets] = useState<BudgetCategory[]>([]);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [description, setDescription] = useState('');

  const displayName = user?.user_metadata?.display_name || 'there';

  useEffect(() => {
    if (!user) return;
    db.getAccounts().then(setAccounts);
    db.getTransactions(getCurrentMonth()).then(setTransactions);
    db.getGoals().then(setGoals);
    db.getBudgets().then(setBudgets);
  }, [user]);

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
  const savingsTarget = goals.length > 0 ? goals[0].target : 100000;
  const savingsProgress = savingsTarget > 0 ? Math.min((totalBalance / savingsTarget) * 100, 100) : 0;
  const firstGoalDeadline = goals.length > 0 ? goals[0].deadline : '2026-12-31';
  const daysLeft = getDaysRemaining(firstGoalDeadline);

  const monthExpenses = transactions.filter((t) => t.type === 'expense');
  const monthSpent = monthExpenses.reduce((sum, t) => sum + t.amount, 0);
  const monthBudget = budgets.length > 0 ? budgets.reduce((s, b) => s + b.budgeted, 0) : 20000;
  const monthRemaining = monthBudget - monthSpent;

  const recentTransactions = transactions.slice(0, 5);

  const handleAddExpense = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    const tx = await db.addTransaction({
      amount: parseFloat(amount),
      category,
      description: description || category,
      type: 'expense',
      date: new Date().toISOString().split('T')[0],
    });
    if (tx) {
      setTransactions((prev) => [tx, ...prev]);
      if (accounts.length > 0) {
        const newBal = accounts[0].balance - tx.amount;
        await db.updateAccountBalance(accounts[0].id, newBal);
        setAccounts((prev) => prev.map((a, i) => i === 0 ? { ...a, balance: newBal } : a));
      }
    }
    setAmount('');
    setDescription('');
    setShowQuickAdd(false);
  }, [amount, category, description, accounts]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{getGreeting()}, {displayName}</h1>
        <p className="text-sm text-slate-500 mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {/* Savings Progress Card */}
      <div className="bg-gradient-to-br from-blue-800 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-blue-200 text-sm font-medium">Savings Goal</p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(totalBalance)}</p>
          </div>
          <div className="text-right">
            <p className="text-blue-200 text-sm">Target</p>
            <p className="text-xl font-semibold">{formatCurrency(savingsTarget)}</p>
          </div>
        </div>
        <div className="w-full bg-blue-900/50 rounded-full h-3 mb-3">
          <div className="bg-white h-3 rounded-full progress-bar" style={{ width: `${savingsProgress}%` }} />
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-blue-200">{savingsProgress.toFixed(1)}% achieved</span>
          <span className="text-blue-200">{daysLeft} days left</span>
        </div>
      </div>

      {/* Account Cards */}
      {accounts.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {accounts.map((account) => (
            <div key={account.id} className="bg-white rounded-xl p-4 shadow-sm card-hover border border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                {account.type === 'bank' ? <CreditCard size={16} className="text-blue-500" /> : <Wallet size={16} className="text-green-500" />}
                <span className="text-xs font-medium text-slate-500 uppercase">{account.name}</span>
              </div>
              <p className="text-lg font-bold text-slate-900">{formatCurrency(account.balance)}</p>
            </div>
          ))}
        </div>
      ) : (
        <Link href="/goals" className="block bg-white rounded-xl p-5 shadow-sm border border-dashed border-blue-300 text-center hover:bg-blue-50 transition-colors">
          <p className="text-sm text-blue-600 font-medium">Set up your accounts and goals to get started</p>
        </Link>
      )}

      {/* Monthly Snapshot */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900">This Month</h2>
          <span className={`text-sm font-medium px-2.5 py-0.5 rounded-full ${monthRemaining > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {monthRemaining > 0 ? formatCurrency(monthRemaining) + ' left' : 'Over budget!'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <p className="text-xs text-slate-500">Spent</p>
            <p className="text-xl font-bold text-slate-900">{formatCurrency(monthSpent)}</p>
          </div>
          <div className="flex-1 text-right">
            <p className="text-xs text-slate-500">Budget</p>
            <p className="text-xl font-bold text-slate-400">{formatCurrency(monthBudget)}</p>
          </div>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5 mt-3">
          <div
            className={`h-2.5 rounded-full progress-bar ${monthSpent / monthBudget > 0.9 ? 'bg-red-500' : monthSpent / monthBudget > 0.7 ? 'bg-yellow-500' : 'bg-green-500'}`}
            style={{ width: `${Math.min((monthSpent / monthBudget) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Quick Add */}
      {!showQuickAdd ? (
        <button onClick={() => setShowQuickAdd(true)} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-4 font-semibold flex items-center justify-center gap-2 shadow-md transition-colors">
          <Plus size={20} /> Add Expense
        </button>
      ) : (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 space-y-4">
          <h3 className="font-semibold text-slate-900">Quick Add Expense</h3>
          <div>
            <label className="text-xs text-slate-500 font-medium">Amount (PHP)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full text-3xl font-bold text-slate-900 border-b-2 border-blue-500 py-2 outline-none bg-transparent" autoFocus />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium">Category</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {EXPENSE_CATEGORIES.map((cat) => (
                <button key={cat} onClick={() => setCategory(cat)} className={`text-xs py-2 px-3 rounded-lg border transition-colors ${category === cat ? 'bg-blue-50 border-blue-500 text-blue-700 font-medium' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" className="w-full border border-slate-200 rounded-lg py-2.5 px-3 text-sm outline-none focus:border-blue-500" />
          <div className="flex gap-3">
            <button onClick={() => setShowQuickAdd(false)} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600">Cancel</button>
            <button onClick={handleAddExpense} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors">Add Expense</button>
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Recent Transactions</h2>
          <Link href="/expenses" className="text-sm text-blue-600 font-medium flex items-center gap-1">View All <ArrowRight size={14} /></Link>
        </div>
        {recentTransactions.length === 0 ? (
          <div className="p-8 text-center">
            <TrendingUp size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm text-slate-400">No transactions yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {recentTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: CATEGORY_COLORS[tx.category] || '#64748b' }}>
                    {tx.category.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{tx.description}</p>
                    <p className="text-xs text-slate-400">{tx.category} &middot; {formatShortDate(tx.date)}</p>
                  </div>
                </div>
                <span className={`text-sm font-semibold ${tx.type === 'expense' ? 'text-red-500' : 'text-green-500'}`}>
                  {tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
