'use client';

import { useState, useEffect } from 'react';
import { Plus, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { Transaction } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import * as db from '@/lib/database';
import { formatCurrency, formatShortDate, getCurrentMonth, getMonthName, EXPENSE_CATEGORIES, CATEGORY_COLORS } from '@/lib/utils';

export default function ExpensesPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [month, setMonth] = useState(getCurrentMonth());
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    if (!user) return;
    db.getTransactions(month).then(setTransactions);
  }, [user, month]);

  const filtered = filter === 'All' ? transactions : transactions.filter((t) => t.category === filter);
  const totalSpent = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

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
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Expenses</h1>
          <p className="text-sm text-slate-500">Total: {formatCurrency(totalSpent)}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-1.5 shadow transition-colors">
          <Plus size={18} /> Add
        </button>
      </div>

      <div className="flex items-center justify-center gap-4 bg-white rounded-xl py-3 shadow-sm border border-slate-100">
        <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-slate-100 rounded-lg"><ChevronLeft size={20} className="text-slate-600" /></button>
        <span className="text-sm font-semibold text-slate-800 min-w-[140px] text-center">{getMonthName(month)}</span>
        <button onClick={() => changeMonth(1)} className="p-1 hover:bg-slate-100 rounded-lg"><ChevronRight size={20} className="text-slate-600" /></button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        {['All', ...EXPENSE_CATEGORIES].map((cat) => (
          <button key={cat} onClick={() => setFilter(cat)} className={`text-xs py-1.5 px-3 rounded-full whitespace-nowrap transition-colors ${filter === cat ? 'bg-blue-600 text-white font-medium' : 'bg-white text-slate-600 border border-slate-200'}`}>
            {cat}
          </button>
        ))}
      </div>

      {sortedDates.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-slate-100"><p className="text-slate-400">No expenses this month</p></div>
      ) : (
        sortedDates.map((date) => (
          <div key={date}>
            <p className="text-xs font-semibold text-slate-400 uppercase mb-2 px-1">{formatShortDate(date)}</p>
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 divide-y divide-slate-50">
              {grouped[date].map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: CATEGORY_COLORS[tx.category] || '#64748b' }}>{tx.category.charAt(0)}</div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{tx.description}</p>
                      <p className="text-xs text-slate-400">{tx.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-semibold text-red-500">-{formatCurrency(tx.amount)}</span>
                    <button onClick={() => handleDelete(tx.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} className="text-slate-300 hover:text-red-400" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="bg-white w-full md:w-[440px] md:rounded-2xl rounded-t-2xl p-6 space-y-4 modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-900">Add Expense</h2>
            <div>
              <label className="text-xs text-slate-500 font-medium">Amount (PHP)</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full text-3xl font-bold text-slate-900 border-b-2 border-blue-500 py-2 outline-none" autoFocus />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium">Category</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {EXPENSE_CATEGORIES.map((cat) => (
                  <button key={cat} onClick={() => setCategory(cat)} className={`text-xs py-2 px-3 rounded-lg border transition-colors ${category === cat ? 'bg-blue-50 border-blue-500 text-blue-700 font-medium' : 'border-slate-200 text-slate-600'}`}>{cat}</button>
                ))}
              </div>
            </div>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" className="w-full border border-slate-200 rounded-lg py-2.5 px-3 text-sm outline-none focus:border-blue-500" />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full border border-slate-200 rounded-lg py-2.5 px-3 text-sm outline-none focus:border-blue-500" />
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-600">Cancel</button>
              <button onClick={handleAdd} className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold">Add Expense</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
