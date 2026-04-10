'use client';

import { useState, useEffect } from 'react';
import { Plus, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { Transaction } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme-context';
import * as db from '@/lib/database';
import { formatCurrency, formatShortDate, getCurrentMonth, getMonthName, EXPENSE_CATEGORIES, CATEGORY_COLORS } from '@/lib/utils';
import CategoryIcon from '@/components/ui/CategoryIcon';
import DonutChart from '@/components/ui/DonutChart';
import TimeTabs from '@/components/ui/TimeTabs';

export default function ExpensesPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [month, setMonth] = useState(getCurrentMonth());
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [filter, setFilter] = useState('All');
  const [view, setView] = useState('Month');

  useEffect(() => {
    if (!user) return;
    db.getTransactions(month).then(setTransactions);
  }, [user, month]);

  const expenses = transactions.filter((t) => t.type === 'expense');
  const filtered = filter === 'All' ? expenses : expenses.filter((t) => t.category === filter);
  const totalSpent = expenses.reduce((s, t) => s + t.amount, 0);

  // Category breakdown
  const byCategory = expenses.reduce<Record<string, number>>((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {});
  const donutSegments = Object.entries(byCategory).map(([cat, val]) => ({
    label: cat, value: val, color: CATEGORY_COLORS[cat] || '#64748b',
  }));

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
    const tx = await db.addTransaction({ amount: parseFloat(amount), category, description: description || category, type: 'expense', date });
    if (tx) setTransactions((prev) => [tx, ...prev]);
    setAmount(''); setDescription(''); setShowModal(false);
  };

  const handleDelete = async (id: string) => {
    await db.deleteTransaction(id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Expenses</h1>
        <button onClick={() => setShowModal(true)} className="text-white rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-1.5 shadow transition-opacity hover:opacity-90" style={{ backgroundColor: theme.primary }}>
          <Plus size={18} /> Add
        </button>
      </div>

      {/* Month Selector */}
      <div className="flex items-center justify-center gap-4 bg-white rounded-xl py-3 shadow-sm border border-slate-100">
        <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-slate-100 rounded-lg"><ChevronLeft size={20} className="text-slate-600" /></button>
        <span className="text-sm font-semibold text-slate-800 min-w-[140px] text-center">{getMonthName(month)}</span>
        <button onClick={() => changeMonth(1)} className="p-1 hover:bg-slate-100 rounded-lg"><ChevronRight size={20} className="text-slate-600" /></button>
      </div>

      {/* Donut Chart + Summary */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-center gap-5">
          <DonutChart
            segments={donutSegments.length > 0 ? donutSegments : [{ label: 'None', value: 1, color: '#e2e8f0' }]}
            size={130}
            thickness={24}
            centerValue={formatCurrency(totalSpent)}
            centerLabel="total"
          />
          <div className="flex-1 space-y-1.5">
            {donutSegments.sort((a, b) => b.value - a.value).slice(0, 5).map((seg) => (
              <div key={seg.label} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                <span className="text-xs text-slate-600 truncate flex-1">{seg.label}</span>
                <span className="text-xs font-semibold text-slate-800">{formatCurrency(seg.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category Filter - Icon Grid */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
          <button onClick={() => setFilter('All')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${filter === 'All' ? '' : ''}`} style={filter === 'All' ? { outline: `2px solid ${theme.primary}`, outlineOffset: '-2px', backgroundColor: theme.primaryBg } : {}}>
            <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center">
              <span className="text-xs font-bold text-slate-500">ALL</span>
            </div>
            <span className="text-[10px] font-medium text-slate-500">All</span>
          </button>
          {EXPENSE_CATEGORIES.map((cat) => {
            const catAmount = byCategory[cat] || 0;
            return (
              <button key={cat} onClick={() => setFilter(cat)} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${filter === cat ? 'scale-105' : ''}`} style={filter === cat ? { outline: `2px solid ${theme.primary}`, outlineOffset: '-2px', backgroundColor: theme.primaryBg } : {}}>
                <CategoryIcon category={cat} size="md" />
                <span className="text-[10px] font-medium text-slate-500 text-center leading-tight">{cat.split(' ')[0]}</span>
                {catAmount > 0 && <span className="text-[9px] font-bold" style={{ color: theme.primary }}>₱{Math.round(catAmount)}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Transaction List */}
      {sortedDates.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
          <p className="text-slate-400">No expenses {filter !== 'All' ? `in ${filter}` : 'this month'}</p>
        </div>
      ) : (
        sortedDates.map((date) => (
          <div key={date}>
            <p className="text-xs font-bold text-slate-400 uppercase mb-2 px-1">{formatShortDate(date)}</p>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-50">
              {grouped[date].map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3.5 px-4">
                  <div className="flex items-center gap-3">
                    <CategoryIcon category={tx.category} size="md" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{tx.description}</p>
                      <p className="text-xs text-slate-400">{tx.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold text-red-500">-{formatCurrency(tx.amount)}</span>
                    <button onClick={() => handleDelete(tx.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} className="text-slate-300 hover:text-red-400" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Add Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end md:items-center justify-center modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="bg-white w-full md:w-[440px] md:rounded-2xl rounded-t-2xl p-6 pb-8 mb-16 md:mb-0 space-y-4 modal-content max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-900">Add Expense</h2>
            <div>
              <label className="text-xs text-slate-500 font-medium">Amount (PHP)</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full text-3xl font-bold text-slate-900 border-b-2 py-2 outline-none" style={{ borderColor: theme.primary }} autoFocus />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium mb-2 block">Category</label>
              <div className="grid grid-cols-4 gap-3">
                {EXPENSE_CATEGORIES.map((cat) => (
                  <button key={cat} onClick={() => setCategory(cat)} className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${category === cat ? 'scale-105' : 'hover:bg-slate-50'}`} style={category === cat ? { outline: `2px solid ${theme.primary}`, outlineOffset: '-2px', backgroundColor: theme.primaryBg } : {}}>
                    <CategoryIcon category={cat} size="sm" />
                    <span className="text-[10px] font-medium text-slate-600 text-center leading-tight">{cat.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm outline-none focus:border-blue-500" />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm outline-none focus:border-blue-500" />
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-600">Cancel</button>
              <button onClick={handleAdd} className="flex-1 py-3 text-white rounded-xl text-sm font-semibold" style={{ backgroundColor: theme.primary }}>Add Expense</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
