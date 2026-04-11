'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, TrendingUp, Wallet, CreditCard, ArrowRight, Palette, LogOut } from 'lucide-react';
import Link from 'next/link';
import { Transaction, Account, SavingsGoal, BudgetCategory } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme-context';
import * as db from '@/lib/database';
import { formatCurrency, formatShortDate, getCurrentMonth, getGreeting, getDaysRemaining, EXPENSE_CATEGORIES, CATEGORY_COLORS } from '@/lib/utils';
import CategoryIcon from '@/components/ui/CategoryIcon';
import DonutChart from '@/components/ui/DonutChart';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { theme, togglePicker } = useTheme();
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
  const totalGoalSaved = goals.reduce((sum, g) => sum + g.current, 0);
  const totalGoalTarget = goals.reduce((sum, g) => sum + g.target, 0);
  const savingsTarget = totalGoalTarget > 0 ? totalGoalTarget : 100000;
  const savingsCurrent = totalGoalSaved > 0 ? totalGoalSaved : totalBalance;
  const savingsProgress = savingsTarget > 0 ? Math.min((savingsCurrent / savingsTarget) * 100, 100) : 0;
  const firstGoalDeadline = goals.length > 0 ? goals[0].deadline : '2026-12-31';
  const daysLeft = getDaysRemaining(firstGoalDeadline);

  const monthExpenses = transactions.filter((t) => t.type === 'expense');
  const monthSpent = monthExpenses.reduce((sum, t) => sum + t.amount, 0);
  const monthBudget = budgets.length > 0 ? budgets.reduce((s, b) => s + b.budgeted, 0) : 20000;
  const monthRemaining = monthBudget - monthSpent;

  // Expense breakdown for donut chart
  const expenseByCategory = monthExpenses.reduce<Record<string, number>>((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {});
  const donutSegments = Object.entries(expenseByCategory).map(([cat, val]) => ({
    label: cat,
    value: val,
    color: CATEGORY_COLORS[cat] || '#64748b',
  }));

  const recentTransactions = transactions.slice(0, 5);

  const handleAddExpense = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    const tx = await db.addTransaction({
      amount: parseFloat(amount), category,
      description: description || category, type: 'expense',
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
    setAmount(''); setDescription(''); setShowQuickAdd(false);
  }, [amount, category, description, accounts]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{getGreeting()}, {displayName}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={togglePicker} className="p-2 rounded-xl hover:bg-slate-100" title="Theme">
            <Palette size={20} style={{ color: theme.primary }} />
          </button>
          <button onClick={signOut} className="md:hidden p-2 rounded-xl hover:bg-red-50" title="Sign out">
            <LogOut size={20} className="text-slate-400" />
          </button>
        </div>
      </div>

      {/* Savings Progress Card */}
      <div className="rounded-2xl p-5 text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${theme.primaryDark}, ${theme.primary})` }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-white/70 text-xs font-medium">Savings Goal</p>
            <p className="text-2xl font-bold mt-0.5">{formatCurrency(savingsCurrent)}</p>
          </div>
          <div className="text-right">
            <p className="text-white/70 text-xs">Target</p>
            <p className="text-lg font-semibold">{formatCurrency(savingsTarget)}</p>
          </div>
        </div>
        <div className="w-full bg-white/20 rounded-full h-2.5 mb-2">
          <div className="bg-white h-2.5 rounded-full progress-bar" style={{ width: `${savingsProgress}%` }} />
        </div>
        <div className="flex justify-between text-xs text-white/70">
          <span>{savingsProgress.toFixed(1)}% achieved</span>
          <span>{daysLeft} days left</span>
        </div>
      </div>

      {/* Account Cards */}
      {accounts.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {accounts.map((account) => (
            <div key={account.id} className="bg-white rounded-xl p-4 shadow-sm card-hover border border-slate-100">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: account.type === 'bank' ? '#dbeafe' : '#d1fae5' }}>
                  {account.type === 'bank' ? <CreditCard size={18} className="text-blue-500" /> : <Wallet size={18} className="text-green-500" />}
                </div>
                <span className="text-sm font-medium text-slate-700">{account.name}</span>
              </div>
              <p className="text-lg font-bold text-slate-900">{formatCurrency(account.balance)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Monthly Overview with Donut Chart */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <h2 className="text-base font-semibold text-slate-900 mb-4">This Month</h2>
        <div className="flex items-center gap-5">
          <DonutChart
            segments={donutSegments.length > 0 ? donutSegments : [{ label: 'None', value: 1, color: '#e2e8f0' }]}
            size={120}
            thickness={22}
            centerValue={monthSpent > 0 ? `₱${Math.round(monthSpent / 1000)}K` : '₱0'}
            centerLabel="spent"
          />
          <div className="flex-1 space-y-2.5">
            <div>
              <div className="flex justify-between text-xs text-slate-500"><span>Spent</span><span>Budget</span></div>
              <div className="flex justify-between"><span className="text-base font-bold text-slate-900">{formatCurrency(monthSpent)}</span><span className="text-base font-bold text-slate-300">{formatCurrency(monthBudget)}</span></div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className={`h-2 rounded-full progress-bar ${monthSpent / monthBudget > 0.9 ? 'bg-red-500' : monthSpent / monthBudget > 0.7 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min((monthSpent / monthBudget) * 100, 100)}%` }}
              />
            </div>
            <span className={`text-xs font-medium ${monthRemaining > 0 ? 'text-green-600' : 'text-red-500'}`}>
              {monthRemaining > 0 ? `${formatCurrency(monthRemaining)} remaining` : 'Over budget!'}
            </span>
          </div>
        </div>

        {/* Category breakdown mini */}
        {donutSegments.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100">
            {donutSegments.slice(0, 4).map((seg) => (
              <div key={seg.label} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                <span className="text-xs text-slate-500 truncate">{seg.label}</span>
                <span className="text-xs font-medium text-slate-700 ml-auto">{formatCurrency(seg.value)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Add - Category Grid */}
      {!showQuickAdd ? (
        <button
          onClick={() => setShowQuickAdd(true)}
          className="w-full text-white rounded-xl py-4 font-semibold flex items-center justify-center gap-2 shadow-md transition-opacity hover:opacity-90"
          style={{ backgroundColor: theme.primary }}
        >
          <Plus size={20} /> Add Expense
        </button>
      ) : (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Add Expense</h3>
            <button onClick={() => setShowQuickAdd(false)} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium">Amount (PHP)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full text-3xl font-bold text-slate-900 border-b-2 py-2 outline-none bg-transparent" style={{ borderColor: theme.primary }} autoFocus />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium mb-2 block">Category</label>
            <div className="grid grid-cols-4 gap-3">
              {EXPENSE_CATEGORIES.map((cat) => (
                <button key={cat} onClick={() => setCategory(cat)} className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${category === cat ? 'scale-105' : 'hover:bg-slate-50'}`} style={category === cat ? { outline: `2px solid ${theme.primary}`, outlineOffset: '-2px', backgroundColor: theme.primaryBg } : {}}>
                  <CategoryIcon category={cat} size="md" />
                  <span className="text-[10px] font-medium text-slate-600 text-center leading-tight">{cat.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm outline-none focus:border-blue-500" />
          <button onClick={handleAddExpense} className="w-full text-white rounded-xl py-3 font-semibold transition-opacity hover:opacity-90" style={{ backgroundColor: theme.primary }}>
            Add Expense
          </button>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Recent Transactions</h2>
          <Link href="/expenses" className="text-xs font-medium flex items-center gap-1" style={{ color: theme.primary }}>View All <ArrowRight size={12} /></Link>
        </div>
        {recentTransactions.length === 0 ? (
          <div className="p-10 text-center">
            <TrendingUp size={36} className="mx-auto text-slate-200 mb-2" />
            <p className="text-sm text-slate-400">No transactions yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {recentTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-3.5 px-4">
                <div className="flex items-center gap-3">
                  <CategoryIcon category={tx.category} size="md" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{tx.description}</p>
                    <p className="text-xs text-slate-400">{tx.category} &middot; {formatShortDate(tx.date)}</p>
                  </div>
                </div>
                <span className={`text-sm font-bold ${tx.type === 'expense' ? 'text-red-500' : 'text-green-500'}`}>
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
