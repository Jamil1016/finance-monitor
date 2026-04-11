'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, TrendingUp, TrendingDown, Wallet, CreditCard, ArrowRight, Palette, LogOut, Target, PieChart, BarChart3, Flame } from 'lucide-react';
import Link from 'next/link';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, AreaChart, Area,
} from 'recharts';
import { Transaction, Account, SavingsGoal, BudgetCategory } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme-context';
import * as db from '@/lib/database';
import { formatCurrency, formatAmount, formatShortDate, getCurrentMonth, getGreeting, getDaysRemaining, EXPENSE_CATEGORIES, CATEGORY_COLORS } from '@/lib/utils';
import CategoryIcon from '@/components/ui/CategoryIcon';
import DonutChart from '@/components/ui/DonutChart';

function getLastNMonths(n: number): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

function shortMonth(m: string): string {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo - 1).toLocaleDateString('en-US', { month: 'short' });
}

function getDaysLeftInMonth(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate() + 1;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { theme, togglePicker } = useTheme();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allMonthsData, setAllMonthsData] = useState<{ month: string; expenses: number; income: number }[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [budgets, setBudgets] = useState<BudgetCategory[]>([]);
  const [weeklyData, setWeeklyData] = useState<{ day: string; amount: number }[]>([]);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [description, setDescription] = useState('');

  const displayName = user?.user_metadata?.display_name || 'there';
  const currentMonth = getCurrentMonth();

  useEffect(() => {
    if (!user) return;
    db.getAccounts().then(setAccounts);
    db.getTransactions(currentMonth).then(setTransactions);
    db.getGoals().then(setGoals);
    db.getBudgets().then(setBudgets);

    // Load last 6 months for trend chart
    const months = getLastNMonths(6);
    Promise.all(months.map(async (m) => {
      const tx = await db.getTransactions(m);
      const expenses = tx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const income = tx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      return { month: m, expenses, income };
    })).then(setAllMonthsData);

    // Weekly spending (last 7 days)
    db.getTransactions(currentMonth).then((tx) => {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const weekly: { day: string; amount: number }[] = [];
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const daySpent = tx.filter(t => t.date === dateStr && t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        weekly.push({ day: days[d.getDay()], amount: daySpent });
      }
      setWeeklyData(weekly);
    });
  }, [user, currentMonth]);

  // KPIs
  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
  const totalGoalSaved = goals.reduce((sum, g) => sum + g.current, 0);
  const totalGoalTarget = goals.reduce((sum, g) => sum + g.target, 0);
  const savingsTarget = totalGoalTarget > 0 ? totalGoalTarget : 100000;
  const savingsCurrent = totalGoalSaved > 0 ? totalGoalSaved : totalBalance;
  const savingsProgress = savingsTarget > 0 ? Math.min((savingsCurrent / savingsTarget) * 100, 100) : 0;
  const daysLeft = goals.length > 0 ? getDaysRemaining(goals[0].deadline) : getDaysRemaining('2026-12-31');

  const monthExpenses = transactions.filter(t => t.type === 'expense');
  const monthIncome = transactions.filter(t => t.type === 'income');
  const monthSpent = monthExpenses.reduce((sum, t) => sum + t.amount, 0);
  const monthIncomeTotal = monthIncome.reduce((sum, t) => sum + t.amount, 0);
  const monthBudget = budgets.length > 0 ? budgets.reduce((s, b) => s + b.budgeted, 0) : 20000;
  const monthRemaining = monthBudget - monthSpent;
  const daysLeftMonth = getDaysLeftInMonth();
  const dailyBudget = daysLeftMonth > 0 ? Math.max(0, monthRemaining / daysLeftMonth) : 0;
  const savingsRate = monthIncomeTotal > 0 ? ((monthIncomeTotal - monthSpent) / monthIncomeTotal) * 100 : 0;

  // Category breakdown
  const expenseByCategory = monthExpenses.reduce<Record<string, number>>((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {});
  const donutSegments = Object.entries(expenseByCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, val]) => ({ label: cat, value: val, color: CATEGORY_COLORS[cat] || '#64748b' }));
  const topCategories = donutSegments.slice(0, 5);

  // Budget utilization per category
  const budgetUtil = budgets.map(b => {
    const spent = monthExpenses.filter(t => t.category === b.name).reduce((s, t) => s + t.amount, 0);
    return { name: b.name.split(' ')[0], budgeted: b.budgeted, spent, pct: b.budgeted > 0 ? (spent / b.budgeted) * 100 : 0 };
  });

  // Trend chart data
  const trendData = allMonthsData.map(d => ({
    name: shortMonth(d.month),
    expenses: d.expenses,
    income: d.income,
    net: d.income - d.expenses,
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
      setTransactions(prev => [tx, ...prev]);
      if (accounts.length > 0) {
        const newBal = accounts[0].balance - tx.amount;
        await db.updateAccountBalance(accounts[0].id, newBal);
        setAccounts(prev => prev.map((a, i) => i === 0 ? { ...a, balance: newBal } : a));
      }
    }
    setAmount(''); setDescription(''); setShowQuickAdd(false);
  }, [amount, category, description, accounts]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-white rounded-lg shadow-lg border border-slate-100 px-3 py-2 text-xs">
        <p className="font-semibold text-slate-700">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }}>
            {p.name}: {formatCurrency(p.value)}
          </p>
        ))}
      </div>
    );
  };

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
          <button onClick={togglePicker} className="p-2 rounded-xl hover:bg-slate-100"><Palette size={20} style={{ color: theme.primary }} /></button>
          <button onClick={signOut} className="md:hidden p-2 rounded-xl hover:bg-red-50"><LogOut size={20} className="text-slate-400" /></button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <p className="text-[10px] text-slate-400 font-medium uppercase">Month Spent</p>
          <p className="text-lg font-bold text-red-500 mt-1">{formatCurrency(monthSpent)}</p>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
            <div className={`h-1.5 rounded-full ${monthSpent/monthBudget > 0.9 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min((monthSpent/monthBudget)*100, 100)}%` }} />
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <p className="text-[10px] text-slate-400 font-medium uppercase">Budget Left</p>
          <p className={`text-lg font-bold mt-1 ${monthRemaining >= 0 ? 'text-green-600' : 'text-red-500'}`}>{formatCurrency(monthRemaining)}</p>
          <p className="text-[10px] text-slate-400 mt-1">{formatCurrency(dailyBudget)}/day</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <p className="text-[10px] text-slate-400 font-medium uppercase">Goals Saved</p>
          <p className="text-lg font-bold mt-1" style={{ color: theme.primary }}>{formatCurrency(savingsCurrent)}</p>
          <p className="text-[10px] text-slate-400 mt-1">{savingsProgress.toFixed(0)}% of {formatCurrency(savingsTarget)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <p className="text-[10px] text-slate-400 font-medium uppercase">Savings Rate</p>
          <p className={`text-lg font-bold mt-1 ${savingsRate >= 20 ? 'text-green-600' : savingsRate > 0 ? 'text-yellow-500' : 'text-slate-400'}`}>
            {savingsRate > 0 ? `${savingsRate.toFixed(0)}%` : '--'}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">{savingsRate >= 20 ? 'Great!' : savingsRate > 0 ? 'Aim for 20%+' : 'Add income data'}</p>
        </div>
      </div>

      {/* Savings Progress Bar */}
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

      {/* Charts Row 1: Spending Trend + Category Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Spending Trend (6 months) */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Spending Trend</h3>
            <span className="text-[10px] text-slate-400">Last 6 months</span>
          </div>
          {trendData.some(d => d.expenses > 0 || d.income > 0) ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="income" stroke="#22c55e" fill="url(#incGrad)" strokeWidth={2} name="Income" />
                <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="url(#expGrad)" strokeWidth={2} name="Expenses" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-sm text-slate-400">
              <p>Add transactions to see trends</p>
            </div>
          )}
        </div>

        {/* Category Donut */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Spending by Category</h3>
          <div className="flex items-center gap-4">
            <DonutChart
              segments={donutSegments.length > 0 ? donutSegments : [{ label: 'None', value: 1, color: '#e2e8f0' }]}
              size={130}
              thickness={24}
              centerValue={monthSpent > 0 ? `₱${(monthSpent/1000).toFixed(1)}K` : '₱0'}
              centerLabel="this month"
            />
            <div className="flex-1 space-y-2">
              {topCategories.length > 0 ? topCategories.map((seg) => (
                <div key={seg.label} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                  <span className="text-xs text-slate-600 truncate flex-1">{seg.label}</span>
                  <span className="text-xs font-bold text-slate-800">{formatCurrency(seg.value)}</span>
                </div>
              )) : (
                <p className="text-xs text-slate-400">No expenses yet</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 2: Weekly Pattern + Budget Utilization */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Weekly Spending Pattern */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900">This Week</h3>
            <span className="text-[10px] text-slate-400">Daily spending</span>
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]} name="Spent">
                {weeklyData.map((entry, i) => (
                  <Cell key={i} fill={entry.amount > dailyBudget ? '#ef4444' : theme.primary} fillOpacity={i === weeklyData.length - 1 ? 1 : 0.6} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Budget Utilization */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Budget Usage</h3>
            <Link href="/budget" className="text-[10px] font-medium flex items-center gap-0.5" style={{ color: theme.primary }}>Details <ArrowRight size={10} /></Link>
          </div>
          <div className="space-y-3">
            {budgetUtil.length > 0 ? budgetUtil.map((b) => (
              <div key={b.name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 font-medium">{b.name}</span>
                  <span className={`font-bold ${b.pct > 100 ? 'text-red-500' : b.pct > 70 ? 'text-yellow-500' : 'text-slate-700'}`}>
                    {b.pct.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="h-2 rounded-full progress-bar" style={{
                    width: `${Math.min(b.pct, 100)}%`,
                    backgroundColor: b.pct > 100 ? '#ef4444' : b.pct > 70 ? '#f59e0b' : theme.primary,
                  }} />
                </div>
              </div>
            )) : (
              <p className="text-xs text-slate-400 py-4 text-center">Set up budget categories</p>
            )}
          </div>
        </div>
      </div>

      {/* Goal Progress Cards */}
      {goals.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Goal Progress</h3>
            <Link href="/goals" className="text-[10px] font-medium flex items-center gap-0.5" style={{ color: theme.primary }}>View All <ArrowRight size={10} /></Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {goals.slice(0, 4).map((goal) => {
              const pct = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;
              return (
                <div key={goal.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: goal.color + '15' }}>
                    {goal.icon || '🎯'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">{goal.name}</p>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1">
                      <div className="h-1.5 rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: goal.color }} />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{formatCurrency(goal.current)} / {formatCurrency(goal.target)}</p>
                  </div>
                  <span className="text-xs font-bold" style={{ color: goal.color }}>{pct.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Add */}
      {!showQuickAdd ? (
        <button onClick={() => setShowQuickAdd(true)} className="w-full text-white rounded-xl py-4 font-semibold flex items-center justify-center gap-2 shadow-md transition-opacity hover:opacity-90" style={{ backgroundColor: theme.primary }}>
          <Plus size={20} /> Quick Add Expense
        </button>
      ) : (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Add Expense</h3>
            <button onClick={() => setShowQuickAdd(false)} className="text-xs text-slate-400">Cancel</button>
          </div>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full text-3xl font-bold text-slate-900 border-b-2 py-2 outline-none bg-transparent" style={{ borderColor: theme.primary }} autoFocus />
          <div className="grid grid-cols-4 gap-2">
            {EXPENSE_CATEGORIES.map((cat) => (
              <button key={cat} onClick={() => setCategory(cat)} className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all" style={category === cat ? { outline: `2px solid ${theme.primary}`, outlineOffset: '-2px', backgroundColor: theme.primaryBg } : {}}>
                <CategoryIcon category={cat} size="sm" />
                <span className="text-[9px] font-medium text-slate-600">{cat.split(' ')[0]}</span>
              </button>
            ))}
          </div>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm outline-none focus:border-blue-500" />
          <button onClick={handleAddExpense} className="w-full text-white rounded-xl py-3 font-semibold transition-opacity hover:opacity-90" style={{ backgroundColor: theme.primary }}>Add Expense</button>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">Recent Transactions</h3>
          <Link href="/expenses" className="text-[10px] font-medium flex items-center gap-0.5" style={{ color: theme.primary }}>View All <ArrowRight size={10} /></Link>
        </div>
        {recentTransactions.length === 0 ? (
          <div className="p-8 text-center">
            <TrendingUp size={32} className="mx-auto text-slate-200 mb-2" />
            <p className="text-sm text-slate-400">No transactions yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {recentTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-3 px-4">
                <div className="flex items-center gap-3">
                  <CategoryIcon category={tx.category} size="sm" />
                  <div>
                    <p className="text-xs font-semibold text-slate-900">{tx.description}</p>
                    <p className="text-[10px] text-slate-400">{tx.category} &middot; {formatShortDate(tx.date)}</p>
                  </div>
                </div>
                <span className={`text-xs font-bold ${tx.type === 'expense' ? 'text-red-500' : 'text-green-500'}`}>
                  {tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Account Cards */}
      {accounts.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {accounts.map((account) => (
            <div key={account.id} className="bg-white rounded-xl p-4 shadow-sm card-hover border border-slate-100">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: account.type === 'bank' ? '#dbeafe' : '#d1fae5' }}>
                  {account.type === 'bank' ? <CreditCard size={14} className="text-blue-500" /> : <Wallet size={14} className="text-green-500" />}
                </div>
                <span className="text-xs font-medium text-slate-600">{account.name}</span>
              </div>
              <p className="text-base font-bold text-slate-900">{formatCurrency(account.balance)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
