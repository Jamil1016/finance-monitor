'use client';

import { useState, useEffect } from 'react';
import { Plus, ChevronLeft, ChevronRight, Trash2, TrendingDown, TrendingUp, Flame, Search, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { Transaction, Account } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme-context';
import * as db from '@/lib/database';
import { formatCurrency, formatShortDate, getCurrentMonth, getMonthName, EXPENSE_CATEGORIES, CATEGORY_COLORS } from '@/lib/utils';
import CategoryIcon from '@/components/ui/CategoryIcon';
import DonutChart from '@/components/ui/DonutChart';
import TimeTabs from '@/components/ui/TimeTabs';
import { getCurrentTime, getCurrentLocation } from '@/lib/location';

function getDaysLeftInMonth(): number {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return lastDay - now.getDate() + 1;
}

function getStartOfWeek(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0];
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

export default function ExpensesPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [prevMonthTx, setPrevMonthTx] = useState<Transaction[]>([]);
  const [month, setMonth] = useState(getCurrentMonth());
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [txType, setTxType] = useState<'expense' | 'income'>('expense');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [payFrom, setPayFrom] = useState<string>('');
  const [filter, setFilter] = useState('All');
  const [timeFilter, setTimeFilter] = useState('Month');
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    if (!user) return;
    db.getTransactions(month).then(setAllTransactions);
    db.getAccounts().then(setAccounts);
    // Load previous month for comparison
    const [y, m] = month.split('-').map(Number);
    const prev = new Date(y, m - 2);
    const prevMonth = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
    db.getTransactions(prevMonth).then(setPrevMonthTx);
  }, [user, month]);

  // Time filtering
  const today = getToday();
  const weekStart = getStartOfWeek();
  const timeFiltered = allTransactions.filter((t) => {
    if (timeFilter === 'Today') return t.date === today;
    if (timeFilter === 'Week') return t.date >= weekStart;
    return true; // Month - already filtered by month
  });

  const expenses = timeFiltered.filter((t) => t.type === 'expense');
  const incomes = timeFiltered.filter((t) => t.type === 'income');
  const filtered = (filter === 'All' ? timeFiltered : timeFiltered.filter((t) => t.category === filter))
    .filter((t) => !search || t.description.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase()));

  const totalSpent = expenses.reduce((s, t) => s + t.amount, 0);
  const totalIncome = incomes.reduce((s, t) => s + t.amount, 0);

  // Monthly budget & daily limit
  const monthExpenses = allTransactions.filter((t) => t.type === 'expense');
  const monthSpent = monthExpenses.reduce((s, t) => s + t.amount, 0);
  const daysLeft = getDaysLeftInMonth();
  const monthBudget = 18844; // TODO: pull from budgets
  const dailyLimit = daysLeft > 0 ? Math.max(0, (monthBudget - monthSpent) / daysLeft) : 0;
  const todaySpent = allTransactions.filter((t) => t.date === today && t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const todayRemaining = Math.max(0, dailyLimit - todaySpent);

  // Spending streak (days under daily limit)
  const streakDays = (() => {
    let streak = 0;
    const now = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const daySpent = allTransactions.filter((t) => t.date === dateStr && t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      if (daySpent <= dailyLimit && daySpent >= 0) streak++;
      else break;
    }
    return streak;
  })();

  // Month comparison
  const prevMonthSpent = prevMonthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const monthChange = prevMonthSpent > 0 ? ((monthSpent - prevMonthSpent) / prevMonthSpent) * 100 : 0;

  // Top category
  const byCategory = expenses.reduce<Record<string, number>>((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {});
  const donutSegments = Object.entries(byCategory).map(([cat, val]) => ({
    label: cat, value: val, color: CATEGORY_COLORS[cat] || '#64748b',
  }));
  const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];

  const grouped = filtered.reduce<Record<string, Transaction[]>>((acc, tx) => {
    (acc[tx.date] = acc[tx.date] || []).push(tx);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const changeMonth = (dir: number) => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + dir);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleAdd = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    const amt = parseFloat(amount);
    const time = getCurrentTime();
    const location = await getCurrentLocation();
    const tx = await db.addTransaction({ amount: amt, category, description: description || category, type: txType, date, time, location });
    if (tx) setAllTransactions((prev) => [tx, ...prev]);

    // Deduct/add from selected account (credit card works in reverse)
    if (payFrom) {
      const acc = accounts.find(a => a.id === payFrom);
      if (acc) {
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

    setAmount(''); setDescription(''); setPayFrom(''); setShowModal(false); setTxType('expense');
  };

  const handleDelete = async (id: string) => {
    await db.deleteTransaction(id);
    setAllTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Expenses</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowSearch(!showSearch)} className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50">
            <Search size={16} className="text-slate-500" />
          </button>
          <button onClick={() => setShowModal(true)} className="text-white rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-1.5 shadow transition-opacity hover:opacity-90" style={{ backgroundColor: theme.primary }}>
            <Plus size={18} /> Add
          </button>
        </div>
      </div>

      {/* Search */}
      {showSearch && (
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search transactions..." className="w-full border border-slate-200 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-blue-500" autoFocus />
      )}

      {/* Month Selector */}
      <div className="flex items-center justify-center gap-4 bg-white rounded-xl py-3 shadow-sm border border-slate-100">
        <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-slate-100 rounded-lg"><ChevronLeft size={20} className="text-slate-600" /></button>
        <span className="text-sm font-semibold text-slate-800 min-w-[140px] text-center">{getMonthName(month)}</span>
        <button onClick={() => changeMonth(1)} className="p-1 hover:bg-slate-100 rounded-lg"><ChevronRight size={20} className="text-slate-600" /></button>
      </div>

      {/* Time Filter */}
      <TimeTabs active={timeFilter} onChange={setTimeFilter} />

      {/* Insights Row */}
      <div className="grid grid-cols-3 gap-2">
        {/* Daily Limit */}
        <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 text-center">
          <p className="text-[10px] text-slate-400 font-medium">Today Left</p>
          <p className={`text-sm font-bold ${todayRemaining > 0 ? 'text-green-600' : 'text-red-500'}`}>
            {formatCurrency(todayRemaining)}
          </p>
          <p className="text-[9px] text-slate-400">of {formatCurrency(dailyLimit)}/day</p>
        </div>

        {/* Spending Streak */}
        <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 text-center">
          <p className="text-[10px] text-slate-400 font-medium">Streak</p>
          <p className="text-sm font-bold text-orange-500">
            <Flame size={12} className="inline mr-0.5" />{streakDays} days
          </p>
          <p className="text-[9px] text-slate-400">under daily limit</p>
        </div>

        {/* Month Comparison */}
        <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 text-center">
          <p className="text-[10px] text-slate-400 font-medium">vs Last Month</p>
          {prevMonthSpent > 0 ? (
            <>
              <p className={`text-sm font-bold ${monthChange <= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {monthChange <= 0 ? <TrendingDown size={12} className="inline mr-0.5" /> : <TrendingUp size={12} className="inline mr-0.5" />}
                {Math.abs(monthChange).toFixed(0)}%
              </p>
              <p className="text-[9px] text-slate-400">{monthChange <= 0 ? 'less' : 'more'} spending</p>
            </>
          ) : (
            <p className="text-xs text-slate-400 mt-1">No data</p>
          )}
        </div>
      </div>

      {/* Donut + Summary */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-center gap-5">
          <DonutChart
            segments={donutSegments.length > 0 ? donutSegments : [{ label: 'None', value: 1, color: '#e2e8f0' }]}
            size={120}
            thickness={22}
            centerValue={formatCurrency(totalSpent)}
            centerLabel={timeFilter.toLowerCase()}
          />
          <div className="flex-1 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-red-500 font-semibold">Expenses: {formatCurrency(totalSpent)}</span>
            </div>
            {totalIncome > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-green-600 font-semibold">Income: {formatCurrency(totalIncome)}</span>
              </div>
            )}
            {topCategory && (
              <div className="mt-2 pt-2 border-t border-slate-100">
                <p className="text-[10px] text-slate-400">Top category</p>
                <p className="text-xs font-bold text-slate-700">{topCategory[0]}: {formatCurrency(topCategory[1])}</p>
              </div>
            )}
            {donutSegments.slice(0, 3).map((seg) => (
              <div key={seg.label} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                <span className="text-[10px] text-slate-500 truncate flex-1">{seg.label}</span>
                <span className="text-[10px] font-semibold text-slate-700">{formatCurrency(seg.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category Filter Grid */}
      <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100">
        <div className="grid grid-cols-5 gap-1.5">
          <button onClick={() => setFilter('All')} className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl transition-all`} style={filter === 'All' ? { outline: `2px solid ${theme.primary}`, outlineOffset: '-2px', backgroundColor: theme.primaryBg } : {}}>
            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center"><span className="text-[9px] font-bold text-slate-500">ALL</span></div>
            <span className="text-[9px] font-medium text-slate-500">All</span>
          </button>
          {EXPENSE_CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setFilter(cat)} className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl transition-all`} style={filter === cat ? { outline: `2px solid ${theme.primary}`, outlineOffset: '-2px', backgroundColor: theme.primaryBg } : {}}>
              <CategoryIcon category={cat} size="sm" />
              <span className="text-[9px] font-medium text-slate-500 text-center leading-tight">{cat.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Transaction List */}
      {sortedDates.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-slate-100">
          <p className="text-slate-400">No transactions {timeFilter !== 'Month' ? timeFilter.toLowerCase() : 'this month'}</p>
        </div>
      ) : (
        sortedDates.map((date) => (
          <div key={date}>
            <p className="text-xs font-bold text-slate-400 uppercase mb-2 px-1">{formatShortDate(date)}</p>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-50">
              {grouped[date].map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 px-4">
                  <div className="flex items-center gap-3">
                    <CategoryIcon category={tx.category} size="md" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{tx.description}</p>
                      <p className="text-xs text-slate-400">
                        {tx.category}
                        {tx.time && <span> · {tx.time}</span>}
                        {tx.location && <span> · 📍{tx.location}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-sm font-bold ${tx.type === 'expense' ? 'text-red-500' : 'text-green-500'}`}>
                      {tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount)}
                    </span>
                    <button onClick={() => handleDelete(tx.id)} className="p-1 hover:bg-red-50 rounded-lg"><Trash2 size={13} className="text-slate-300 hover:text-red-400" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end md:items-center justify-center modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="bg-white w-full md:w-[440px] md:rounded-2xl rounded-t-2xl p-6 pb-8 mb-16 md:mb-0 space-y-4 modal-content max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Expense / Income Toggle */}
            <div className="flex bg-slate-100 rounded-xl p-1">
              <button onClick={() => setTxType('expense')} className={`flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-all ${txType === 'expense' ? 'bg-red-500 text-white shadow-sm' : 'text-slate-500'}`}>
                <ArrowUpCircle size={16} /> Expense
              </button>
              <button onClick={() => setTxType('income')} className={`flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-all ${txType === 'income' ? 'bg-green-500 text-white shadow-sm' : 'text-slate-500'}`}>
                <ArrowDownCircle size={16} /> Income
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-500 font-medium">Amount (PHP)</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full text-3xl font-bold text-slate-900 border-b-2 py-2 outline-none" style={{ borderColor: txType === 'expense' ? '#ef4444' : '#22c55e' }} autoFocus />
            </div>

            <div>
              <label className="text-xs text-slate-500 font-medium mb-2 block">Category</label>
              <div className="grid grid-cols-4 gap-2">
                {(txType === 'expense' ? EXPENSE_CATEGORIES : ['Salary', 'Freelance', 'Gift', 'Investment', 'Refund', 'Other'] as const).map((cat) => (
                  <button key={cat} onClick={() => setCategory(cat)} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all`} style={category === cat ? { outline: `2px solid ${theme.primary}`, outlineOffset: '-2px', backgroundColor: theme.primaryBg } : {}}>
                    <CategoryIcon category={cat} size="sm" />
                    <span className="text-[9px] font-medium text-slate-600 text-center leading-tight">{cat.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm outline-none focus:border-blue-500" />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm outline-none focus:border-blue-500" />

            {/* Pay From Account */}
            {accounts.length > 0 && (
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: theme.primary + '80' }}>{txType === 'expense' ? 'Pay from' : 'Receive to'}</label>
                <div className="flex gap-2 flex-wrap mt-1.5">
                  <button onClick={() => setPayFrom('')} className="text-xs py-2 px-3 rounded-full transition-colors"
                    style={!payFrom ? { backgroundColor: theme.primaryBg, outline: `2px solid ${theme.primary}`, outlineOffset: '-2px', color: theme.primaryText } : { border: '1px solid #e2e8f0', color: '#94a3b8' }}>
                    None
                  </button>
                  {accounts.map(acc => {
                    const isCC = acc.type === 'credit_card';
                    const isActive = payFrom === acc.id;
                    return (
                      <button key={acc.id} onClick={() => setPayFrom(acc.id)} className="text-xs py-2 px-3 rounded-full flex items-center gap-1.5 transition-colors"
                        style={isActive
                          ? { backgroundColor: isCC ? '#fef2f2' : theme.primaryBg, outline: `2px solid ${isCC ? '#ef4444' : theme.primary}`, outlineOffset: '-2px', color: isCC ? '#dc2626' : theme.primaryText }
                          : { border: '1px solid #e2e8f0', color: '#94a3b8' }}>
                        <span>{acc.icon}</span> {acc.name}
                        {isCC && <span className="text-[8px] opacity-70">(credit)</span>}
                      </button>
                    );
                  })}
                </div>
                {payFrom && accounts.find(a => a.id === payFrom)?.type === 'credit_card' && txType === 'expense' && (
                  <p className="text-[9px] text-red-500 mt-1">💳 Charged to credit card (adds to balance owed)</p>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-600">Cancel</button>
              <button onClick={handleAdd} className="flex-1 py-3 text-white rounded-xl text-sm font-semibold" style={{ backgroundColor: txType === 'expense' ? '#ef4444' : '#22c55e' }}>
                {txType === 'expense' ? 'Add Expense' : 'Add Income'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
