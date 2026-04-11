'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, TrendingUp, TrendingDown, ArrowRight, Palette, LogOut, ArrowUpRight, ArrowDownRight, Wallet, ChevronRight, Settings, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Cell, AreaChart, Area, LineChart, Line } from 'recharts';
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
  const [yearTx, setYearTx] = useState<Transaction[]>([]);
  const [prevMonthTx, setPrevMonthTx] = useState<Transaction[]>([]);
  const [yearData, setYearData] = useState<{ month: string; expenses: number; income: number }[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [budgets, setBudgets] = useState<BudgetCategory[]>([]);
  const [weeklyData, setWeeklyData] = useState<{ day: string; amount: number }[]>([]);
  const [showFab, setShowFab] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [txType, setTxType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [payFrom, setPayFrom] = useState('');

  const fullName = user?.user_metadata?.display_name || 'there';
  const displayName = fullName.split(' ')[0];
  const currentMonth = getCurrentMonth();

  useEffect(() => {
    if (!user) return;
    db.getAccounts().then(setAccounts);
    db.getTransactions(currentMonth).then(setMonthTx);
    db.getTransactions(getMonthRange(-1)).then(setPrevMonthTx);
    db.getGoals().then(setGoals);
    db.getBudgets().then(setBudgets);
    const months = getYearMonths();
    const allYearTx: Transaction[] = [];
    Promise.all(months.map(async m => {
      const tx = await db.getTransactions(m);
      allYearTx.push(...tx);
      return { month: m, expenses: tx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0), income: tx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0) };
    })).then(data => { setYearData(data); setYearTx(allYearTx); });
    db.getTransactions(currentMonth).then(tx => {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const now = new Date();
      setWeeklyData(Array.from({ length: 7 }, (_, i) => { const d = new Date(now); d.setDate(d.getDate() - (6 - i)); return { day: days[d.getDay()], amount: tx.filter(t => t.date === d.toISOString().split('T')[0] && t.type === 'expense').reduce((s, t) => s + t.amount, 0) }; }));
    });
  }, [user, currentMonth]);

  const today = getToday(); const weekStart = getWeekStart();
  const isYear = period === 'Year';
  const periodTx = isYear
    ? yearTx
    : monthTx.filter(t => { if (period === 'Daily') return t.date === today; if (period === 'Weekly') return t.date >= weekStart; return true; });
  const expenses = periodTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const income = periodTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const regularAccounts = accounts.filter(a => a.type !== 'credit_card');
  const totalBalance = regularAccounts.reduce((s, a) => s + a.balance, 0);
  const totalGoalSaved = goals.reduce((s, g) => s + g.current, 0);
  const totalGoalTarget = goals.reduce((s, g) => s + g.target, 0);
  const monthBudget = budgets.length > 0 ? budgets.reduce((s, b) => s + b.budgeted, 0) : 20000;
  const monthSpent = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const prevExpenses = prevMonthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const expenseChange = prevExpenses > 0 ? ((expenses - prevExpenses) / prevExpenses * 100) : 0;

  // Smart budget calculation based on selected period
  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); // Mon=1, Sun=7
  const weekNumber = Math.ceil(dayOfMonth / 7);
  const weeksInMonth = Math.ceil(daysInMonth / 7);

  // Weekly budget = monthly / ~4.3 weeks, but unspent from previous weeks rolls over
  const weeklyBaseBudget = monthBudget / weeksInMonth;
  const daysPassedBeforeThisWeek = (weekNumber - 1) * 7;
  const budgetUsedBeforeThisWeek = monthTx.filter(t => {
    const d = new Date(t.date).getDate();
    return d <= daysPassedBeforeThisWeek && t.type === 'expense';
  }).reduce((s, t) => s + t.amount, 0);
  const budgetAllocatedBeforeThisWeek = weeklyBaseBudget * (weekNumber - 1);
  const rolloverFromPrevWeeks = Math.max(0, budgetAllocatedBeforeThisWeek - budgetUsedBeforeThisWeek);
  const weeklyBudgetWithRollover = weeklyBaseBudget + rolloverFromPrevWeeks;

  const dailyBudget = monthBudget / daysInMonth;
  const dailyBudgetWithRollover = (monthBudget - monthSpent) / Math.max(1, daysInMonth - dayOfMonth + 1);
  const yearlyBudget = monthBudget * 12;

  // Period-aware budget
  const periodBudget = period === 'Daily' ? dailyBudgetWithRollover : period === 'Weekly' ? weeklyBudgetWithRollover : period === 'Year' ? yearlyBudget : monthBudget;
  const budgetPct = periodBudget > 0 ? Math.round((expenses / periodBudget) * 100) : 0;
  const periodLabel = period === 'Daily' ? 'Daily' : period === 'Weekly' ? 'Weekly' : period === 'Year' ? 'Yearly' : 'Monthly';
  const budgetMsg = budgetPct <= 50 ? `${periodLabel} budget on track!` : budgetPct <= 70 ? `${periodLabel} budget looks good.` : budgetPct <= 90 ? `Careful! ${periodLabel} budget almost used.` : `Over ${periodLabel} budget!`;

  const catBreakdown = periodTx.filter(t => t.type === 'expense').reduce<Record<string, number>>((a, t) => { a[t.category] = (a[t.category] || 0) + t.amount; return a; }, {});
  const donutSegments = Object.entries(catBreakdown).sort((a, b) => b[1] - a[1]).map(([c, v]) => ({ label: c, value: v, color: CATEGORY_COLORS[c] || '#64748b' }));
  const trendData = yearData.map(d => ({ name: shortMonth(d.month), expenses: d.expenses, income: d.income }));
  const recentTx = periodTx.slice(0, 5);

  const handleAddTransaction = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    const amt = parseFloat(amount);
    const tx = await db.addTransaction({ amount: amt, category, description: description || category, type: txType, date: today });
    if (tx) setMonthTx(prev => [tx, ...prev]);
    if (payFrom && tx) {
      const acc = accounts.find(a => a.id === payFrom);
      if (acc) {
        // Credit card: expense ADDS to balance (more debt), payment SUBTRACTS
        // Regular account: expense SUBTRACTS, income ADDS
        const isCreditCard = acc.type === 'credit_card';
        let newBal: number;
        if (isCreditCard) {
          newBal = txType === 'expense' ? acc.balance + amt : acc.balance - amt;
        } else {
          newBal = txType === 'expense' ? acc.balance - amt : acc.balance + amt;
        }
        await db.updateAccountBalance(payFrom, newBal);
        setAccounts(prev => prev.map(a => a.id === payFrom ? { ...a, balance: newBal } : a));
      }
    }
    setAmount(''); setDescription(''); setPayFrom(''); setShowQuickAdd(false); setTxType('expense');
  }, [amount, category, description, today, txType, payFrom, accounts]);

  const Tip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (<div className="bg-white rounded-2xl shadow-lg px-3 py-2 text-xs border-0">{payload.map((p: any, i: number) => (<p key={i} style={{ color: p.color }} className="font-semibold">{p.name}: {formatCurrency(p.value)}</p>))}</div>);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{getGreeting()}, {displayName}!</h1>
        </div>
        <div className="flex items-center gap-1">
          <Link href="/analysis" className="md:hidden w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.primaryBg }}>
            <BarChart3 size={16} style={{ color: theme.primary }} />
          </Link>
          <Link href="/settings" className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.primaryBg }}>
            <Settings size={16} style={{ color: theme.primary }} />
          </Link>
        </div>
      </div>

      {/* Accounts at top */}
      {accounts.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {accounts.map(a => (
            <div key={a.id} className="flex-shrink-0 rounded-2xl px-4 py-3 flex items-center gap-2.5 min-w-[140px]" style={{ backgroundColor: a.type === 'credit_card' ? '#fef2f2' : 'white' }}>
              <span className="text-lg">{a.icon || '🏦'}</span>
              <div>
                <p className="text-[10px] text-slate-400 font-medium">{a.name}</p>
                <p className={`text-sm font-bold ${a.type === 'credit_card' ? 'text-red-500' : 'text-slate-900'}`}>{formatCurrency(a.balance)}</p>
              </div>
            </div>
          ))}
          <Link href="/wallet" className="flex-shrink-0 rounded-2xl px-4 py-3 flex items-center gap-2 border border-dashed min-w-[100px]" style={{ borderColor: theme.primary + '40' }}>
            <Plus size={16} style={{ color: theme.primary }} />
            <span className="text-xs font-medium" style={{ color: theme.primary }}>Add</span>
          </Link>
        </div>
      )}

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
          <span className="text-xs font-medium">{formatCurrency(periodBudget)}</span>
        </div>
        <p className="text-white/60 text-[10px] mt-2">
          📊 {budgetPct}% of {periodLabel} Budget ({formatCurrency(periodBudget)}) &middot; {budgetMsg}
          {period === 'Weekly' && rolloverFromPrevWeeks > 0 && (
            <span className="block mt-0.5">🔄 Includes {formatCurrency(rolloverFromPrevWeeks)} rollover from previous weeks</span>
          )}
          {period === 'Daily' && dailyBudgetWithRollover > dailyBudget && (
            <span className="block mt-0.5">🔄 Adjusted from unspent previous days</span>
          )}
        </p>

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

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Weekly Spending */}
        <div className="card-white p-4">
          <h3 className="text-xs font-bold text-slate-900 mb-3">Last 7 Days</h3>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
              <RTooltip content={<Tip />} />
              <Bar dataKey="amount" radius={[6, 6, 0, 0]} name="Spent">
                {weeklyData.map((e, i) => <Cell key={i} fill={theme.primary} fillOpacity={i === weeklyData.length - 1 ? 1 : 0.4} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Budget Utilization */}
        <div className="card-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-900">Budget Usage</h3>
            <Link href="/budget" className="text-[10px] font-semibold flex items-center gap-0.5" style={{ color: theme.primary }}>Details <ChevronRight size={10} /></Link>
          </div>
          <div className="space-y-2.5">
            {budgets.map(b => {
              const spent = monthTx.filter(t => t.category === b.name && t.type === 'expense').reduce((s, t) => s + t.amount, 0);
              const pct = b.budgeted > 0 ? (spent / b.budgeted) * 100 : 0;
              return (
                <div key={b.id}>
                  <div className="flex justify-between text-[10px] mb-0.5">
                    <span className="text-slate-600 font-medium">{b.name.split(' ')[0]}</span>
                    <span className={`font-bold ${pct > 100 ? 'text-red-500' : pct > 70 ? 'text-yellow-500' : 'text-slate-600'}`}>{pct.toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: theme.primaryBg }}>
                    <div className="h-1.5 rounded-full progress-bar" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: pct > 100 ? '#ef4444' : pct > 70 ? '#f59e0b' : theme.primary }} />
                  </div>
                </div>
              );
            })}
            {budgets.length === 0 && <p className="text-[10px] text-slate-400 py-3 text-center">Set up budget categories</p>}
          </div>
        </div>
      </div>

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

      {/* FAB with Expense/Income options */}
      {!showQuickAdd && !showFab && (
        <button onClick={() => setShowFab(true)} className="fixed bottom-20 md:bottom-6 right-4 w-14 h-14 rounded-full text-white shadow-lg flex items-center justify-center z-40" style={{ backgroundColor: theme.primary }}>
          <Plus size={24} />
        </button>
      )}

      {/* FAB expanded: choose Expense or Income */}
      {showFab && !showQuickAdd && (
        <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setShowFab(false)}>
          <div className="fixed bottom-36 md:bottom-24 right-4 space-y-2 z-50" onClick={e => e.stopPropagation()}>
            <button onClick={() => { setTxType('income'); setCategory('Salary'); setShowQuickAdd(true); setShowFab(false); }}
              className="flex items-center gap-2 bg-green-500 text-white rounded-full py-3 px-5 shadow-lg text-sm font-bold">
              <ArrowDownRight size={18} /> Add Income
            </button>
            <button onClick={() => { setTxType('expense'); setCategory(EXPENSE_CATEGORIES[0]); setShowQuickAdd(true); setShowFab(false); }}
              className="flex items-center gap-2 bg-red-500 text-white rounded-full py-3 px-5 shadow-lg text-sm font-bold">
              <ArrowUpRight size={18} /> Add Expense
            </button>
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      {showQuickAdd && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end md:items-center justify-center modal-backdrop" onClick={() => { setShowQuickAdd(false); setTxType('expense'); }}>
          <div className="bg-white w-full md:w-[420px] md:rounded-3xl rounded-t-3xl p-6 pb-8 mb-16 md:mb-0 space-y-4 modal-content max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-900">
              {txType === 'expense' ? 'Add Expense' : 'Add Income'}
            </h2>

            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"
              className="w-full text-3xl font-bold text-slate-900 border-b-2 py-2 outline-none"
              style={{ borderColor: txType === 'expense' ? '#ef4444' : '#22c55e' }} autoFocus />

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: theme.primary + '80' }}>Category</label>
              <div className="grid grid-cols-4 gap-2 mt-1.5">
                {(txType === 'expense' ? EXPENSE_CATEGORIES : ['Salary', 'Freelance', 'Gift', 'Investment', 'Refund', 'Other'] as const).map(cat => (
                  <button key={cat} onClick={() => setCategory(cat)} className="flex flex-col items-center gap-1 p-2 rounded-2xl transition-all" style={category === cat ? { backgroundColor: theme.primaryBg, outline: `2px solid ${theme.primary}`, outlineOffset: '-2px' } : {}}>
                    <CategoryIcon category={cat} size="sm" />
                    <span className="text-[9px] font-medium text-slate-600">{cat.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" className="input-tinted w-full" />

            {accounts.length > 0 && (
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: theme.primary + '80' }}>
                  {txType === 'expense' ? 'Pay from' : 'Receive to'}
                </label>
                <div className="flex gap-2 flex-wrap mt-1.5">
                  <button onClick={() => setPayFrom('')} className="text-xs py-1.5 px-3 rounded-full transition-colors"
                    style={!payFrom ? { backgroundColor: theme.primaryBg, outline: `2px solid ${theme.primary}`, outlineOffset: '-2px', color: theme.primaryText } : { border: '1px solid #e2e8f0', color: '#94a3b8' }}>
                    None
                  </button>
                  {accounts.map(a => {
                    const isCC = a.type === 'credit_card';
                    const isActive = payFrom === a.id;
                    return (
                      <button key={a.id} onClick={() => setPayFrom(a.id)} className="text-xs py-1.5 px-3 rounded-full flex items-center gap-1 transition-colors"
                        style={isActive
                          ? { backgroundColor: isCC ? '#fef2f2' : theme.primaryBg, outline: `2px solid ${isCC ? '#ef4444' : theme.primary}`, outlineOffset: '-2px', color: isCC ? '#dc2626' : theme.primaryText }
                          : { border: '1px solid #e2e8f0', color: '#94a3b8' }}>
                        <span>{a.icon}</span> {a.name}
                        {isCC && <span className="text-[8px] opacity-70">(credit)</span>}
                      </button>
                    );
                  })}
                </div>
                {payFrom && accounts.find(a => a.id === payFrom)?.type === 'credit_card' && txType === 'expense' && (
                  <p className="text-[9px] text-red-500 mt-1">💳 This will be charged to your credit card (adds to balance owed)</p>
                )}
              </div>
            )}

            <button onClick={handleAddTransaction} className="w-full text-white rounded-full py-3 font-bold text-sm btn-pill"
              style={{ backgroundColor: txType === 'expense' ? '#ef4444' : '#22c55e' }}>
              {txType === 'expense' ? 'Add Expense' : 'Add Income'}
            </button>
          </div>
        </div>
      )}

      {/* Total Balance */}
      {accounts.length > 0 && (
        <Link href="/wallet" className="rounded-2xl p-3 flex justify-between items-center card-white">
          <div className="flex items-center gap-2">
            <span className="text-sm">💰</span>
            <span className="text-xs font-semibold" style={{ color: theme.primaryText }}>Total Balance</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold text-green-600">{formatCurrency(totalBalance)}</span>
            <ChevronRight size={14} style={{ color: theme.primary }} />
          </div>
        </Link>
      )}
    </div>
  );
}
