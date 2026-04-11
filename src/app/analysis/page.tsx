'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { Transaction } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme-context';
import * as db from '@/lib/database';
import { formatCurrency, getCurrentMonth, CATEGORY_COLORS } from '@/lib/utils';
import TimeTabs from '@/components/ui/TimeTabs';
import DonutChart from '@/components/ui/DonutChart';

function getYearMonths(): string[] { const yr = new Date().getFullYear(); return Array.from({ length: 12 }, (_, i) => `${yr}-${String(i + 1).padStart(2, '0')}`); }
function shortMonth(m: string): string { const [, mo] = m.split('-').map(Number); return new Date(2026, mo - 1).toLocaleDateString('en-US', { month: 'short' }); }
function getToday(): string { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; }
function getWeekStart(): string { const n = new Date(); n.setDate(n.getDate() - (n.getDay() === 0 ? 6 : n.getDay() - 1)); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; }

export default function AnalysisPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [period, setPeriod] = useState('Monthly');
  const [monthTx, setMonthTx] = useState<Transaction[]>([]);
  const [yearData, setYearData] = useState<{ month: string; expenses: number; income: number }[]>([]);

  useEffect(() => {
    if (!user) return;
    db.getTransactions(getCurrentMonth()).then(setMonthTx);
    Promise.all(getYearMonths().map(async m => {
      const tx = await db.getTransactions(m);
      return { month: m, expenses: tx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0), income: tx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0) };
    })).then(setYearData);
  }, [user]);

  const today = getToday(); const weekStart = getWeekStart();
  const isYear = period === 'Year';
  const periodTx = monthTx.filter(t => { if (period === 'Daily') return t.date === today; if (period === 'Weekly') return t.date >= weekStart; return true; });

  const totalExpense = isYear ? yearData.reduce((s, d) => s + d.expenses, 0) : periodTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalIncome = isYear ? yearData.reduce((s, d) => s + d.income, 0) : periodTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);

  const catBreakdown = (isYear ? monthTx : periodTx).filter(t => t.type === 'expense').reduce<Record<string, number>>((a, t) => { a[t.category] = (a[t.category] || 0) + t.amount; return a; }, {});
  const donutSegments = Object.entries(catBreakdown).sort((a, b) => b[1] - a[1]).map(([c, v]) => ({ label: c, value: v, color: CATEGORY_COLORS[c] || '#64748b' }));

  const trendData = yearData.map(d => ({ name: shortMonth(d.month), income: d.income, expenses: d.expenses }));

  // Weekly pattern
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const daySpending = dayNames.map(day => {
    const total = monthTx.filter(t => {
      const d = new Date(t.date); const dn = d.getDay();
      const mapped = dn === 0 ? 'Sun' : dayNames[dn - 1];
      return mapped === day && t.type === 'expense';
    }).reduce((s, t) => s + t.amount, 0);
    return { day, amount: total };
  });

  const Tip = ({ active, payload }: any) => {
    if (!active || !payload) return null;
    return (<div className="bg-white rounded-2xl shadow-lg px-3 py-2 text-xs border-0">{payload.map((p: any, i: number) => (<p key={i} style={{ color: p.color }} className="font-semibold">{p.name}: {formatCurrency(p.value)}</p>))}</div>);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/" className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.primaryBg }}>
          <ArrowLeft size={18} style={{ color: theme.primary }} />
        </Link>
        <h1 className="text-xl font-bold text-slate-900">Analysis</h1>
      </div>

      {/* Summary hero */}
      <div className="rounded-3xl p-5 text-white" style={{ background: `linear-gradient(135deg, ${theme.headerGradient[0]}, ${theme.headerGradient[1]})` }}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-white/60 text-[10px] flex items-center gap-1"><TrendingUp size={10} /> Total Income</p>
            <p className="text-xl font-bold">{formatCurrency(totalIncome)}</p>
          </div>
          <div>
            <p className="text-white/60 text-[10px] flex items-center gap-1"><TrendingDown size={10} /> Total Expense</p>
            <p className="text-xl font-bold text-red-200">-{formatCurrency(totalExpense)}</p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-white/20 text-center">
          <p className="text-white/60 text-[10px]">Net Cash Flow</p>
          <p className={`text-lg font-bold ${totalIncome - totalExpense >= 0 ? '' : 'text-red-200'}`}>{formatCurrency(totalIncome - totalExpense)}</p>
        </div>
      </div>

      <TimeTabs active={period} onChange={setPeriod} tabs={['Daily', 'Weekly', 'Monthly', 'Year']} />

      {/* Income vs Expenses Bar */}
      <div className="card-white p-4">
        <h3 className="text-xs font-bold text-slate-900 mb-3">Income vs Expenses</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={trendData} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
            <RTooltip content={<Tip />} />
            <Bar dataKey="income" fill={theme.primary} radius={[4, 4, 0, 0]} name="Income" barSize={12} />
            <Bar dataKey="expenses" fill="#f87171" radius={[4, 4, 0, 0]} name="Expenses" barSize={12} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-6 mt-2">
          <span className="flex items-center gap-1.5 text-[10px] text-slate-500"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: theme.primary }} />Income</span>
          <span className="flex items-center gap-1.5 text-[10px] text-slate-500"><span className="w-3 h-3 rounded-sm bg-red-400" />Expenses</span>
        </div>
      </div>

      {/* Spending by Category */}
      <div className="card-white p-4">
        <h3 className="text-xs font-bold text-slate-900 mb-3">Spending by Category</h3>
        <div className="flex items-center gap-4">
          <DonutChart segments={donutSegments.length > 0 ? donutSegments : [{ label: 'None', value: 1, color: '#e2e8f0' }]} size={130} thickness={24} centerValue={formatCurrency(totalExpense)} centerLabel="total" />
          <div className="flex-1 space-y-2">
            {donutSegments.map((s, i) => {
              const pct = totalExpense > 0 ? (s.value / totalExpense * 100) : 0;
              return (
                <div key={s.label}>
                  <div className="flex justify-between text-[10px] mb-0.5">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />{s.label}</span>
                    <span className="font-bold text-slate-700">{pct.toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: s.color + '20' }}>
                    <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: s.color }} />
                  </div>
                </div>
              );
            })}
            {donutSegments.length === 0 && <p className="text-xs text-slate-400">No data</p>}
          </div>
        </div>
      </div>

      {/* Spending by Day of Week */}
      <div className="card-white p-4">
        <h3 className="text-xs font-bold text-slate-900 mb-3">Spending by Day of Week</h3>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={daySpending}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
            <RTooltip content={<Tip />} />
            <Bar dataKey="amount" radius={[6, 6, 0, 0]} name="Spent">
              {daySpending.map((_, i) => <Cell key={i} fill={theme.primary} fillOpacity={0.6 + (i === daySpending.length - 1 ? 0.4 : 0)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Trend Line */}
      <div className="card-white p-4">
        <h3 className="text-xs font-bold text-slate-900 mb-3">Expense Trend</h3>
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={trendData}>
            <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={theme.primary} stopOpacity={0.15} /><stop offset="95%" stopColor={theme.primary} stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
            <RTooltip content={<Tip />} />
            <Area type="monotone" dataKey="expenses" stroke={theme.primary} fill="url(#ag)" strokeWidth={2} name="Expenses" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
