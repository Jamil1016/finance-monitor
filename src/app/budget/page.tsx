'use client';

import { useState, useEffect } from 'react';
import { BudgetCategory, Transaction } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import * as db from '@/lib/database';
import { formatCurrency, getCurrentMonth, getMonthName } from '@/lib/utils';

export default function BudgetPage() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<BudgetCategory[]>([]);
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, number>>({});
  const month = getCurrentMonth();

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    let saved = await db.getBudgets();
    if (saved.length === 0) {
      saved = await db.initDefaultBudgets();
    }
    const transactions = await db.getTransactions(month);
    const monthTx = transactions.filter((t) => t.type === 'expense');

    const withSpent = saved.map((b) => ({
      ...b,
      spent: monthTx
        .filter((t) => t.category === b.name || (b.name === 'Miscellaneous' && !saved.some((bb) => bb.name === t.category && bb.name !== 'Miscellaneous')))
        .reduce((sum, t) => sum + t.amount, 0),
    }));

    setBudgets(withSpent);
    const vals: Record<string, number> = {};
    withSpent.forEach((b) => (vals[b.id] = b.budgeted));
    setEditValues(vals);
  };

  const totalBudget = budgets.reduce((s, b) => s + b.budgeted, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const totalRemaining = totalBudget - totalSpent;
  const overallPct = totalBudget > 0 ? totalSpent / totalBudget : 0;

  const handleSave = async () => {
    await db.saveBudgets(budgets.map((b) => ({ id: b.id, budgeted: editValues[b.id] || b.budgeted })));
    setBudgets(budgets.map((b) => ({ ...b, budgeted: editValues[b.id] || b.budgeted })));
    setEditing(false);
  };

  const getBarColor = (pct: number) => pct >= 1 ? 'bg-red-500' : pct >= 0.7 ? 'bg-yellow-500' : 'bg-blue-500';

  const renderCategory = (b: BudgetCategory) => {
    const pct = b.budgeted > 0 ? b.spent / b.budgeted : 0;
    const remaining = b.budgeted - b.spent;
    return (
      <div key={b.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-900">{b.name}</span>
          {editing ? (
            <input type="number" value={editValues[b.id] || 0} onChange={(e) => setEditValues({ ...editValues, [b.id]: parseFloat(e.target.value) || 0 })} className="w-24 text-right text-sm border border-blue-300 rounded-lg px-2 py-1 outline-none focus:border-blue-500" />
          ) : (
            <span className="text-sm text-slate-500">{formatCurrency(b.spent)} / {formatCurrency(b.budgeted)}</span>
          )}
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2">
          <div className={`h-2 rounded-full progress-bar ${getBarColor(pct)}`} style={{ width: `${Math.min(pct * 100, 100)}%` }} />
        </div>
        <p className={`text-xs mt-1 ${remaining >= 0 ? 'text-slate-400' : 'text-red-500 font-medium'}`}>
          {remaining >= 0 ? `${formatCurrency(remaining)} left` : `Over by ${formatCurrency(Math.abs(remaining))}`}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Budget</h1>
          <p className="text-sm text-slate-500">{getMonthName(month)}</p>
        </div>
        <button onClick={() => (editing ? handleSave() : setEditing(true))} className={`text-sm font-semibold px-4 py-2 rounded-xl transition-colors ${editing ? 'bg-green-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
          {editing ? 'Save' : 'Edit Budget'}
        </button>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-end justify-between mb-3">
          <div><p className="text-xs text-slate-500">Total Spent</p><p className="text-2xl font-bold text-slate-900">{formatCurrency(totalSpent)}</p></div>
          <div className="text-right"><p className="text-xs text-slate-500">Budget</p><p className="text-lg font-semibold text-slate-400">{formatCurrency(totalBudget)}</p></div>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3">
          <div className={`h-3 rounded-full progress-bar ${getBarColor(overallPct)}`} style={{ width: `${Math.min(overallPct * 100, 100)}%` }} />
        </div>
        <p className={`text-sm font-medium mt-2 ${totalRemaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {totalRemaining >= 0 ? `${formatCurrency(totalRemaining)} remaining` : `Over budget by ${formatCurrency(Math.abs(totalRemaining))}`}
        </p>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Needs</h2>
        <div className="space-y-3">{budgets.filter((b) => b.type === 'needs').map(renderCategory)}</div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Wants & Buffer</h2>
        <div className="space-y-3">{budgets.filter((b) => b.type === 'wants').map(renderCategory)}</div>
      </div>
    </div>
  );
}
