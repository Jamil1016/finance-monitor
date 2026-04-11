'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, TrendingUp, TrendingDown, ArrowRight, Palette, LogOut, ArrowUpRight, ArrowDownRight, Wallet, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
import { Transaction, Account, SavingsGoal, BudgetCategory } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme-context';
import * as db from '@/lib/database';
import { formatCurrency, formatAmount, formatShortDate, getCurrentMonth, getGreeting, getDaysRemaining, EXPENSE_CATEGORIES, CATEGORY_COLORS } from '@/lib/utils';
import CategoryIcon from '@/components/ui/CategoryIcon';
import DonutChart from '@/components/ui/DonutChart';
import TimeTabs from '@/components/ui/TimeTabs';

function getToday(): string { return new Date().toISOString().split('T')[0]; }
function getWeekStart(): string { const n = new Date(); const d = n.getDay(); n.setDate(n.getDate() - (d === 0 ? 6 : d - 1)); return n.toISOString().split('T')[0]; }
function getYearMonths(): string[] { const yr = new Date().getFullYear(); return Array.from({ length: 12 }, (_, i) => `${yr}-${String(i + 1).padStart(2, '0')}`); }
function shortMonth(m: string): string { const [y, mo] = m.split('-').map(Number); return new Date(y, mo - 1).toLocaleDateString('en-US', { month: 'short' }); }
function getDaysLeftInMonth(): number { const n = new Date(); return new Date(n.getFullYear(), n.getMonth() + 1, 0).getDate() - n.getDate() + 1; }
function getMonthRange(o: number): string { const d = new Date(); d.setMonth(d.getMonth() + o); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { theme, togglePicker } = useTheme();
  const [period, setPeriod] = useState('Monthly');
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
    const months = getYearMonths();
    Promise.all(months.map(async m => {
      const tx = await db.getTransactions(m);
      return { month: m, expenses: tx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0), income: tx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0) };
    })).then(setYearData);
    db.getTransactions(currentMonth).then(tx => {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const now = new Date();
      setWeeklyData(Array.from({ length: 7 }, (_, i) => { const d = new Date(now); d.setDate(d.getDate() - (6 - i)); return { day: days[d.getDay()], amount: tx.filter(t => t.date === d.toISOString().split('T')[0] && t.type === 'expense').reduce((s, t) => s + t.amount, 0) }; }));
    });
  }, [user, currentMonth]);

  const today = getToday(); const weekStart = getWeekStart();
  const isYear = period === 'Year';
  const periodTx = monthTx.filter(t => { if (period === 'Daily') return t.date === today; if (period === 'Weekly') return t.date >= weekStart; return true; });
  const expenses = isYear ? yearData.reduce((s, d) => s + d.expenses, 0) : periodTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const income = isYear ? yearData.reduce((s, d) => s + d.income, 0) : periodTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const totalGoalSaved = goals.reduce((s, g) => s + g.current, 0);
  const totalGoalTarget = goals.reduce((s, g) => s + g.target, 0);
  const monthBudget = budgets.length > 0 ? budgets.reduce((s, b) => s + b.budgeted, 0) : 20000;
  const monthSpent = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const budgetPct = monthBudget > 0 ? Math.round((monthSpent / monthBudget) * 100) : 0;
  const prevExpenses = prevMonthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const expenseChange = prevExpenses > 0 ? ((expenses - prevExpenses) / prevExpenses * 100) : 0;

  const catBreakdown = periodTx.filter(t => t.type === 'expense').reduce<Record<string, number>>((a, t) => { a[t.category] = (a[t.category] || 0) + t.amount; return a; }, {});
  const donutSegments = Object.entries(catBreakdown).sort((a, b) => b[1] - a[1]).map(([c, v]) => ({ label: c, value: v, color: CATEGORY_COLORS[c] || '#64748b' }));
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
    return (<div className="bg-white rounded-2xl shadow-lg px-3 py-2 text-xs border-0">{payload.map((p: any, i: number) => (<p key={i} style={{ color: p.color }} className="font-semibold">{p.name}: {formatCurrency(p.value)}</p>))}</div>);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium" style={{ color: theme.primary }}>Hi, Welcome Back</p>
          <h1 className="text-xl font-bold text-slate-900">{getGreeting()}, {displayName}</h1>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={togglePicker} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.primaryBg }}>
            <Palette size={16} style={{ color: theme.primary }} />
          </button>
          <button onClick={signOut} className="md:hidden w-9 h-9 rounded-full flex items-center justify-center bg-red-50">
            <LogOut size={16} className="text-red-400" />
          </button>
        </div>
      </div>

      {/* Hero Card - FinWise Style */}
      <div className="rounded-3xl p-5 text-white" style={{ background: `linear-gradient(135deg, ${theme.headerGradient[0]}, ${theme.headerGradient[1]})` }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/60 text-[10px] font-medium flex items-center gap-1"><Wallet size={10} /> Total Balance</p>
            <p className="text-2xl font-bold mt-0.5">{formatCurrency(totalBalance)}</p>
          </div>
          <div className="text-right">
            <p className="text-white/60 text-[10px] font-medium flex items-center justify-end gap-1"><ArrowUpRight size={10} /> Total Expense</p>
            <p className="text-lg font-bold text-red-200 mt-0.5">-{formatCurrency(expenses)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold bg-white/20 rounded-full px-2.5 py-0.5">{budgetPct}%</span>
          <div className="flex-1 bg-white/20 rounded-full h-2">
            <div className="bg-white h-2 rounded-full progress-bar" style={{ width: `${Math.min(budgetPct, 100)}%` }} />
          </div>
          <span className="text-xs font-medium">{formatCurrency(monthBudget)}</span>
        </div>
        <p className="text-white/60 text-[10px] mt-2">📊 {budgetPct}% Of Your Expenses, {budgetPct <= 70 ? 'Looks Good.' : budgetPct <= 90 ? 'Watch Out.' : 'Over Budget!'}</p>

        {/* Savings + Food quick stats */}
        <div className="mt-4 rounded-2xl p-3 flex items-center gap-4" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-sm">🏦</div>
            <div>
              <p className="text-white/60 text-[9px]">Savings On Goals</p>
              <p className="text-sm font-bold">{formatCurrency(totalGoalSaved)}</p>
            </div>
          </div>
          <div className="w-px h-8 bg-white/20" />
          <div>
            {donutSegments[0] ? (
              <>
                <p className="text-white/60 text-[9px]">Top: {donutSegments[0].label}</p>
                <p className="text-sm font-bold text-red-200">-{formatCurrency(donutSegments[0].value)}</p>
              </>
            ) : (
              <p className="text-white/60 text-xs">No expenses yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Period Selector */}
      <TimeTabs active={period} onChange={setPeriod} tabs={['Daily', 'Weekly', 'Monthly', 'Year']} />

      {/* Income & Expenses Chart */}
      <div className="card-white p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900">Income & Expenses</h3>
          <Link href="/expenses" className="text-[10px] font-semibold flex items-center gap-0.5" style={{ color: theme.primary }}>See all <ChevronRight size={10} /></Link>
        </div>
        {trendData.some(d => d.expenses > 0 || d.income > 0) ? (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={trendData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
              <RTooltip content={<Tip />} />
              <Bar dataKey="income" fill={theme.primary} radius={[4, 4, 0, 0]} name="Income" barSize={14} />
              <Bar dataKey="expenses" fill="#f87171" radius={[4, 4, 0, 0]} name="Expenses" barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[160px] flex items-center justify-center text-xs text-slate-400">Add transactions to see chart</div>
        )}
        <div className="flex items-center justify-center gap-6 mt-2">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: theme.primary }} /><span className="text-[10px] text-slate-500">Income <span className="font-bold text-slate-800">{formatCurrency(income)}</span></span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-red-400" /><span className="text-[10px] text-slate-500">Expense <span className="font-bold text-slate-800">{formatCurrency(expenses)}</span></span></div>
        </div>
      </div>

      {/* Goals Targets */}
      {goals.length > 0 && (
        <div className="card-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900">My Targets</h3>
            <Link href="/goals" className="text-[10px] font-semibold flex items-center gap-0.5" style={{ color: theme.primary }}>See all <ChevronRight size={10} /></Link>
          </div>
          <div className="space-y-3">
            {goals.slice(0, 3).map(g => {
              const pct = g.target > 0 ? (g.current / g.target) * 100 : 0;
              return (
                <div key={g.id} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg" style={{ backgroundColor: g.color + '15' }}>{g.icon || '🎯'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-semibold text-slate-900 truncate">{g.name}</p>
                      <p className="text-xs font-bold" style={{ color: g.color }}>{pct.toFixed(0)}%</p>
                    </div>
                    <div className="w-full rounded-full h-2 mt-1" style={{ backgroundColor: g.color + '20' }}>
                      <div className="h-2 rounded-full progress-bar" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: g.color }} />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{formatCurrency(g.current)} / {formatCurrency(g.target)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Transactions */}
      <div className="card-white p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900">Transactions</h3>
          <Link href="/expenses" className="text-[10px] font-semibold flex items-center gap-0.5" style={{ color: theme.primary }}>See all <ChevronRight size={10} /></Link>
        </div>
        {recentTx.length === 0 ? (
          <div className="py-6 text-center"><p className="text-xs text-slate-400">No transactions yet</p></div>
        ) : (
          <div className="space-y-2.5">
            {recentTx.map(tx => (
              <div key={tx.id} className="flex items-center gap-3">
                <CategoryIcon category={tx.category} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-900">{tx.description}</p>
                  <p className="text-[10px] text-slate-400">{formatShortDate(tx.date)}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: theme.primaryBg, color: theme.primaryText }}>{tx.category.split(' ')[0]}</span>
                  <p className={`text-xs font-bold mt-0.5 ${tx.type === 'expense' ? 'text-red-500' : 'text-green-500'}`}>{tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Add FAB */}
      {!showQuickAdd ? (
        <button onClick={() => setShowQuickAdd(true)} className="fixed bottom-20 md:bottom-6 right-4 w-14 h-14 rounded-full text-white shadow-lg flex items-center justify-center z-40 btn-pill" style={{ backgroundColor: theme.primary, padding: 0 }}>
          <Plus size={24} />
        </button>
      ) : (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end md:items-center justify-center modal-backdrop" onClick={() => setShowQuickAdd(false)}>
          <div className="bg-white w-full md:w-[420px] md:rounded-3xl rounded-t-3xl p-6 pb-8 mb-16 md:mb-0 space-y-4 modal-content max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-900">Add Expense</h2>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full text-3xl font-bold text-slate-900 border-b-2 py-2 outline-none" style={{ borderColor: theme.primary }} autoFocus />
            <div className="grid grid-cols-4 gap-2.5">
              {EXPENSE_CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setCategory(cat)} className="flex flex-col items-center gap-1 p-2 rounded-2xl transition-all" style={category === cat ? { backgroundColor: theme.primaryBg, outline: `2px solid ${theme.primary}`, outlineOffset: '-2px' } : {}}>
                  <CategoryIcon category={cat} size="sm" />
                  <span className="text-[9px] font-medium text-slate-600">{cat.split(' ')[0]}</span>
                </button>
              ))}
            </div>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" className="input-tinted w-full" />
            <button onClick={handleAddExpense} className="w-full text-white rounded-full py-3 font-bold text-sm btn-pill" style={{ backgroundColor: theme.primary }}>
              Add Expense
            </button>
          </div>
        </div>
      )}

      {/* Accounts */}
      {accounts.length > 0 && (
        <div className="card-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900">Accounts</h3>
            <Link href="/wallet" className="text-[10px] font-semibold flex items-center gap-0.5" style={{ color: theme.primary }}>Manage <ChevronRight size={10} /></Link>
          </div>
          <div className="space-y-2">
            {accounts.map(a => (
              <div key={a.id} className="flex items-center gap-3 p-2 rounded-xl" style={{ backgroundColor: theme.surfaceBg }}>
                <span className="text-lg">{a.icon || '🏦'}</span>
                <span className="text-xs font-medium text-slate-700 flex-1">{a.name}</span>
                <span className="text-sm font-bold text-slate-900">{formatCurrency(a.balance)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
