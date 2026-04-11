'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, TrendingUp, TrendingDown, Wallet, CreditCard, ArrowRight, Palette, LogOut, ArrowUpRight, ArrowDownRight, DollarSign, PiggyBank } from 'lucide-react';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, AreaChart, Area,
} from 'recharts';
import { Transaction, Account, SavingsGoal, BudgetCategory } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme-context';
import * as db from '@/lib/database';
import { formatCurrency, formatShortDate, getCurrentMonth, getGreeting, getDaysRemaining, EXPENSE_CATEGORIES, CATEGORY_COLORS } from '@/lib/utils';
import CategoryIcon from '@/components/ui/CategoryIcon';
import DonutChart from '@/components/ui/DonutChart';
import TimeTabs from '@/components/ui/TimeTabs';

function getMonthRange(offset: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getToday(): string { return new Date().toISOString().split('T')[0]; }

function getWeekStart(): string {
  const now = new Date();
  const d = now.getDay();
  now.setDate(now.getDate() - (d === 0 ? 6 : d - 1));
  return now.toISOString().split('T')[0];
}

function getYearMonths(): string[] {
  const yr = new Date().getFullYear();
  return Array.from({ length: 12 }, (_, i) => `${yr}-${String(i + 1).padStart(2, '0')}`);
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
  const [period, setPeriod] = useState('Month');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [monthTx, setMonthTx] = useState<Transaction[]>([]);
  const [prevMonthTx, setPrevMonthTx] = useState<Transaction[]>([]);
  const [yearData, setYearData] = useState<{ month: string; expenses: number; income: number }[]>([]);
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
    db.getTransactions(currentMonth).then(setMonthTx);
    db.getTransactions(getMonthRange(-1)).then(setPrevMonthTx);
    db.getGoals().then(setGoals);
    db.getBudgets().then(setBudgets);

    // Year data
    const months = getYearMonths();
    Promise.all(months.map(async (m) => {
      const tx = await db.getTransactions(m);
      return {
        month: m,
        expenses: tx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
        income: tx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      };
    })).then(setYearData);

    // Weekly data
    db.getTransactions(currentMonth).then(tx => {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const weekly: { day: string; amount: number }[] = [];
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now); d.setDate(d.getDate() - i);
        const ds = d.toISOString().split('T')[0];
        weekly.push({ day: days[d.getDay()], amount: tx.filter(t => t.date === ds && t.type === 'expense').reduce((s, t) => s + t.amount, 0) });
      }
      setWeeklyData(weekly);
    });
  }, [user, currentMonth]);

  // Filter transactions by period
  const today = getToday();
  const weekStart = getWeekStart();
  const periodTx = monthTx.filter(t => {
    if (period === 'Day') return t.date === today;
    if (period === 'Week') return t.date >= weekStart;
    return true;
  });

  // For "Year" we sum from yearData
  const isYear = period === 'Year';
  const expenses = isYear
    ? yearData.reduce((s, d) => s + d.expenses, 0)
    : periodTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const income = isYear
    ? yearData.reduce((s, d) => s + d.income, 0)
    : periodTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const cashFlow = income - expenses;

  // Previous period comparison
  const prevExpenses = prevMonthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const expenseChange = prevExpenses > 0 ? ((expenses - prevExpenses) / prevExpenses * 100) : 0;

  // Budget
  const monthBudget = budgets.length > 0 ? budgets.reduce((s, b) => s + b.budgeted, 0) : 20000;
  const monthSpent = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const monthRemaining = monthBudget - monthSpent;
  const dailyBudget = getDaysLeftInMonth() > 0 ? Math.max(0, monthRemaining / getDaysLeftInMonth()) : 0;

  // Goals
  const totalGoalSaved = goals.reduce((s, g) => s + g.current, 0);
  const totalGoalTarget = goals.reduce((s, g) => s + g.target, 0);
  const savingsProgress = totalGoalTarget > 0 ? Math.min((totalGoalSaved / totalGoalTarget) * 100, 100) : 0;
  const daysLeft = goals.length > 0 ? getDaysRemaining(goals[0].deadline) : 0;

  // Category breakdown (for current period)
  const catBreakdown = (isYear ? monthTx : periodTx).filter(t => t.type === 'expense').reduce<Record<string, number>>((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {});
  const donutSegments = Object.entries(catBreakdown).sort((a, b) => b[1] - a[1]).map(([cat, val]) => ({ label: cat, value: val, color: CATEGORY_COLORS[cat] || '#64748b' }));

  // Budget utilization
  const budgetUtil = budgets.map(b => {
    const spent = monthTx.filter(t => t.category === b.name && t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { name: b.name.split(' ')[0], budgeted: b.budgeted, spent, pct: b.budgeted > 0 ? (spent / b.budgeted) * 100 : 0 };
  });

  // Trend chart
  const trendData = yearData.map(d => ({ name: shortMonth(d.month), expenses: d.expenses, income: d.income }));

  const recentTx = monthTx.slice(0, 5);

  const handleAddExpense = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    const tx = await db.addTransaction({ amount: parseFloat(amount), category, description: description || category, type: 'expense', date: today });
    if (tx) setMonthTx(prev => [tx, ...prev]);
    setAmount(''); setDescription(''); setShowQuickAdd(false);
  }, [amount, category, description, today]);

  const Tip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-white rounded-lg shadow-lg border border-slate-100 px-3 py-2 text-xs">
        <p className="font-semibold text-slate-700 mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }}>{p.name}: {formatCurrency(p.value)}</p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{getGreeting()}, {displayName}</h1>
          <p className="text-xs text-slate-500">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={togglePicker} className="p-2 rounded-xl hover:bg-slate-100"><Palette size={18} style={{ color: theme.primary }} /></button>
          <button onClick={signOut} className="md:hidden p-2 rounded-xl hover:bg-red-50"><LogOut size={18} className="text-slate-400" /></button>
        </div>
      </div>

      {/* Period Selector */}
      <TimeTabs active={period} onChange={setPeriod} tabs={['Day', 'Week', 'Month', 'Year']} />

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-3.5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center"><ArrowUpRight size={14} className="text-red-500" /></div>
            <span className="text-[10px] text-slate-400 font-medium uppercase">Expenses</span>
          </div>
          <p className="text-lg font-bold text-red-500">{formatCurrency(expenses)}</p>
          {period === 'Month' && prevExpenses > 0 && (
            <p className={`text-[10px] font-medium mt-0.5 ${expenseChange <= 0 ? 'text-green-500' : 'text-red-400'}`}>
              {expenseChange <= 0 ? '↓' : '↑'} {Math.abs(expenseChange).toFixed(0)}% vs last month
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl p-3.5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center"><ArrowDownRight size={14} className="text-green-500" /></div>
            <span className="text-[10px] text-slate-400 font-medium uppercase">Income</span>
          </div>
          <p className="text-lg font-bold text-green-600">{income > 0 ? formatCurrency(income) : '--'}</p>
        </div>

        <div className="bg-white rounded-xl p-3.5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: theme.primaryBg }}><DollarSign size={14} style={{ color: theme.primary }} /></div>
            <span className="text-[10px] text-slate-400 font-medium uppercase">Cash Flow</span>
          </div>
          <p className={`text-lg font-bold ${cashFlow >= 0 ? 'text-green-600' : 'text-red-500'}`}>{cashFlow !== 0 ? formatCurrency(cashFlow) : '--'}</p>
        </div>

        <div className="bg-white rounded-xl p-3.5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center"><PiggyBank size={14} className="text-blue-500" /></div>
            <span className="text-[10px] text-slate-400 font-medium uppercase">Budget Left</span>
          </div>
          <p className={`text-lg font-bold ${monthRemaining >= 0 ? 'text-green-600' : 'text-red-500'}`}>{formatCurrency(monthRemaining)}</p>
          <p className="text-[10px] text-slate-400">{formatCurrency(dailyBudget)}/day</p>
        </div>
      </div>

      {/* Savings Goal */}
      {goals.length > 0 && (
        <div className="rounded-2xl p-4 text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${theme.primaryDark}, ${theme.primary})` }}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-white/70 text-[10px]">Savings Goal</p>
              <p className="text-xl font-bold">{formatCurrency(totalGoalSaved)}</p>
            </div>
            <div className="text-right">
              <p className="text-white/70 text-[10px]">Target</p>
              <p className="text-base font-semibold">{formatCurrency(totalGoalTarget)}</p>
            </div>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2 mb-1.5">
            <div className="bg-white h-2 rounded-full progress-bar" style={{ width: `${savingsProgress}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-white/60">
            <span>{savingsProgress.toFixed(1)}%</span>
            <span>{daysLeft}d left</span>
          </div>
        </div>
      )}

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Income vs Expenses Trend */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <h3 className="text-xs font-semibold text-slate-900 mb-3">Income vs Expenses ({new Date().getFullYear()})</h3>
          {trendData.some(d => d.expenses > 0 || d.income > 0) ? (
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
                  <linearGradient id="ig" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.1} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                <Tooltip content={<Tip />} />
                <Area type="monotone" dataKey="income" stroke="#22c55e" fill="url(#ig)" strokeWidth={2} name="Income" />
                <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="url(#eg)" strokeWidth={2} name="Expenses" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[170px] flex items-center justify-center text-xs text-slate-400">Add transactions to see trends</div>
          )}
        </div>

        {/* Category Donut */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <h3 className="text-xs font-semibold text-slate-900 mb-3">Spending by Category</h3>
          <div className="flex items-center gap-3">
            <DonutChart segments={donutSegments.length > 0 ? donutSegments : [{ label: 'None', value: 1, color: '#e2e8f0' }]} size={120} thickness={22} centerValue={expenses > 0 ? `₱${(expenses/1000).toFixed(1)}K` : '₱0'} centerLabel={period.toLowerCase()} />
            <div className="flex-1 space-y-1.5">
              {donutSegments.slice(0, 5).map(s => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-[10px] text-slate-500 truncate flex-1">{s.label}</span>
                  <span className="text-[10px] font-bold text-slate-700">{formatCurrency(s.value)}</span>
                </div>
              ))}
              {donutSegments.length === 0 && <p className="text-[10px] text-slate-400">No expenses</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Weekly Bar */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <h3 className="text-xs font-semibold text-slate-900 mb-3">Last 7 Days</h3>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
              <Tooltip content={<Tip />} />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]} name="Spent">
                {weeklyData.map((e, i) => (
                  <Cell key={i} fill={e.amount > dailyBudget && dailyBudget > 0 ? '#ef4444' : theme.primary} fillOpacity={i === weeklyData.length - 1 ? 1 : 0.5} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Budget Utilization */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-900">Budget Usage</h3>
            <Link href="/budget" className="text-[10px] font-medium flex items-center gap-0.5" style={{ color: theme.primary }}>Details <ArrowRight size={10} /></Link>
          </div>
          <div className="space-y-2.5">
            {budgetUtil.length > 0 ? budgetUtil.map(b => (
              <div key={b.name}>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="text-slate-600 font-medium">{b.name}</span>
                  <span className={`font-bold ${b.pct > 100 ? 'text-red-500' : b.pct > 70 ? 'text-yellow-500' : 'text-slate-600'}`}>{b.pct.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full progress-bar" style={{ width: `${Math.min(b.pct, 100)}%`, backgroundColor: b.pct > 100 ? '#ef4444' : b.pct > 70 ? '#f59e0b' : theme.primary }} />
                </div>
              </div>
            )) : <p className="text-[10px] text-slate-400 py-4 text-center">Set up budget categories</p>}
          </div>
        </div>
      </div>

      {/* Goals + Accounts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Goals */}
        {goals.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-900">Goals</h3>
              <Link href="/goals" className="text-[10px] font-medium flex items-center gap-0.5" style={{ color: theme.primary }}>View All <ArrowRight size={10} /></Link>
            </div>
            <div className="space-y-2.5">
              {goals.slice(0, 4).map(g => {
                const pct = g.target > 0 ? (g.current / g.target) * 100 : 0;
                return (
                  <div key={g.id} className="flex items-center gap-2.5">
                    <span className="text-base">{g.icon || '🎯'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between"><span className="text-[10px] font-semibold text-slate-900 truncate">{g.name}</span><span className="text-[10px] font-bold" style={{ color: g.color }}>{pct.toFixed(0)}%</span></div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 mt-0.5"><div className="h-1.5 rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: g.color }} /></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Accounts */}
        {accounts.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-900">Accounts</h3>
              <Link href="/wallet" className="text-[10px] font-medium flex items-center gap-0.5" style={{ color: theme.primary }}>Manage <ArrowRight size={10} /></Link>
            </div>
            <div className="space-y-2">
              {accounts.map(a => (
                <div key={a.id} className="flex items-center gap-2.5">
                  <span className="text-base">{a.icon || '🏦'}</span>
                  <span className="text-xs text-slate-600 flex-1">{a.name}</span>
                  <span className="text-xs font-bold text-slate-900">{formatCurrency(a.balance)}</span>
                </div>
              ))}
              <div className="pt-1.5 border-t border-slate-100 flex justify-between">
                <span className="text-xs font-semibold text-slate-500">Total</span>
                <span className="text-xs font-bold text-green-600">{formatCurrency(accounts.reduce((s, a) => s + a.balance, 0))}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Add */}
      {!showQuickAdd ? (
        <button onClick={() => setShowQuickAdd(true)} className="w-full text-white rounded-xl py-3.5 font-semibold flex items-center justify-center gap-2 shadow-md transition-opacity hover:opacity-90 text-sm" style={{ backgroundColor: theme.primary }}>
          <Plus size={18} /> Quick Add Expense
        </button>
      ) : (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-3">
          <div className="flex items-center justify-between"><h3 className="font-semibold text-slate-900 text-sm">Add Expense</h3><button onClick={() => setShowQuickAdd(false)} className="text-xs text-slate-400">Cancel</button></div>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full text-2xl font-bold text-slate-900 border-b-2 py-2 outline-none bg-transparent" style={{ borderColor: theme.primary }} autoFocus />
          <div className="grid grid-cols-4 gap-2">
            {EXPENSE_CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)} className="flex flex-col items-center gap-0.5 p-1.5 rounded-xl transition-all" style={category === cat ? { outline: `2px solid ${theme.primary}`, outlineOffset: '-2px', backgroundColor: theme.primaryBg } : {}}>
                <CategoryIcon category={cat} size="sm" /><span className="text-[8px] font-medium text-slate-600">{cat.split(' ')[0]}</span>
              </button>
            ))}
          </div>
          <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" className="w-full border border-slate-200 rounded-xl py-2 px-3 text-sm outline-none focus:border-blue-500" />
          <button onClick={handleAddExpense} className="w-full text-white rounded-xl py-2.5 font-semibold text-sm transition-opacity hover:opacity-90" style={{ backgroundColor: theme.primary }}>Add Expense</button>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between p-3.5 border-b border-slate-100">
          <h3 className="text-xs font-semibold text-slate-900">Recent Transactions</h3>
          <Link href="/expenses" className="text-[10px] font-medium flex items-center gap-0.5" style={{ color: theme.primary }}>View All <ArrowRight size={10} /></Link>
        </div>
        {recentTx.length === 0 ? (
          <div className="p-6 text-center"><p className="text-xs text-slate-400">No transactions yet</p></div>
        ) : (
          <div className="divide-y divide-slate-50">
            {recentTx.map(tx => (
              <div key={tx.id} className="flex items-center justify-between p-3 px-3.5">
                <div className="flex items-center gap-2.5">
                  <CategoryIcon category={tx.category} size="sm" />
                  <div><p className="text-xs font-semibold text-slate-900">{tx.description}</p><p className="text-[10px] text-slate-400">{tx.category} · {formatShortDate(tx.date)}</p></div>
                </div>
                <span className={`text-xs font-bold ${tx.type === 'expense' ? 'text-red-500' : 'text-green-500'}`}>{tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
