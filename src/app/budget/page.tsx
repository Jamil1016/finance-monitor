'use client';

import { useState, useEffect } from 'react';
import { Transaction, BudgetCategory } from '@/lib/types';
import { getItems, saveItems, KEYS } from '@/lib/storage';
import { formatCurrency, getCurrentMonth, getMonthName, generateId } from '@/lib/utils';

const DEFAULT_BUDGETS: BudgetCategory[] = [
  { id: '1', name: 'Food & Groceries', budgeted: 6000, spent: 0, type: 'needs', icon: 'UtensilsCrossed' },
  { id: '2', name: 'Utilities & Phone', budgeted: 2500, spent: 0, type: 'needs', icon: 'Zap' },
  { id: '3', name: 'Personal Care', budgeted: 1500, spent: 0, type: 'needs', icon: 'Heart' },
  { id: '4', name: 'Social & Leisure', budgeted: 3000, spent: 0, type: 'wants', icon: 'Users' },
  { id: '5', name: 'Miscellaneous', budgeted: 5844, spent: 0, type: 'wants', icon: 'ShoppingBag' },
];

export default function BudgetPage() {
  const [budgets, setBudgets] = useState<BudgetCategory[]>([]);
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, number>>({});
  const month = getCurrentMonth();

  useEffect(() => {
    let saved = getItems<BudgetCategory>(KEYS.BUDGETS);
    if (saved.length === 0) {
      saved = DEFAULT_BUDGETS;
      saveItems(KEYS.BUDGETS, saved);
    }

    const transactions = getItems<Transaction>(KEYS.TRANSACTIONS);
    const monthTx = transactions.filter((t) => t.date.startsWith(month) && t.type === 'expense');

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
  }, [month]);

  const totalBudget = budgets.reduce((s, b) => s + b.budgeted, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const totalRemaining = totalBudget - totalSpent;
  const overallPct = totalBudget > 0 ? totalSpent / totalBudget : 0;

  const handleSave = () => {
    const updated = budgets.map((b) => ({ ...b, budgeted: editValues[b.id] || b.budgeted }));
    saveItems(KEYS.BUDGETS, updated);
    setBudgets(updated);
    setEditing(false);
  };

  const getBarColor = (pct: number) => {
    if (pct >= 1) return 'bg-red-500';
    if (pct >= 0.7) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const needsBudgets = budgets.filter((b) => b.type === 'needs');
  const wantsBudgets = budgets.filter((b) => b.type === 'wants');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Budget</h1>
          <p className="text-sm text-slate-500">{getMonthName(month)}</p>
        </div>
        <button
          onClick={() => (editing ? handleSave() : setEditing(true))}
          className={`text-sm font-semibold px-4 py-2 rounded-xl transition-colors ${
            editing ? 'bg-green-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          {editing ? 'Save' : 'Edit Budget'}
        </button>
      </div>

      {/* Overall Summary */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-xs text-slate-500">Total Spent</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalSpent)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Budget</p>
            <p className="text-lg font-semibold text-slate-400">{formatCurrency(totalBudget)}</p>
          </div>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3">
          <div className={`h-3 rounded-full progress-bar ${getBarColor(overallPct)}`} style={{ width: `${Math.min(overallPct * 100, 100)}%` }} />
        </div>
        <p className={`text-sm font-medium mt-2 ${totalRemaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {totalRemaining >= 0 ? `${formatCurrency(totalRemaining)} remaining` : `Over budget by ${formatCurrency(Math.abs(totalRemaining))}`}
        </p>
      </div>

      {/* Needs */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Needs</h2>
        <div className="space-y-3">
          {needsBudgets.map((b) => {
            const pct = b.budgeted > 0 ? b.spent / b.budgeted : 0;
            const remaining = b.budgeted - b.spent;
            return (
              <div key={b.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-900">{b.name}</span>
                  {editing ? (
                    <input
                      type="number"
                      value={editValues[b.id] || 0}
                      onChange={(e) => setEditValues({ ...editValues, [b.id]: parseFloat(e.target.value) || 0 })}
                      className="w-24 text-right text-sm border border-blue-300 rounded-lg px-2 py-1 outline-none focus:border-blue-500"
                    />
                  ) : (
                    <span className="text-sm text-slate-500">
                      {formatCurrency(b.spent)} / {formatCurrency(b.budgeted)}
                    </span>
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
          })}
        </div>
      </div>

      {/* Wants */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Wants & Buffer</h2>
        <div className="space-y-3">
          {wantsBudgets.map((b) => {
            const pct = b.budgeted > 0 ? b.spent / b.budgeted : 0;
            const remaining = b.budgeted - b.spent;
            return (
              <div key={b.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-900">{b.name}</span>
                  {editing ? (
                    <input
                      type="number"
                      value={editValues[b.id] || 0}
                      onChange={(e) => setEditValues({ ...editValues, [b.id]: parseFloat(e.target.value) || 0 })}
                      className="w-24 text-right text-sm border border-blue-300 rounded-lg px-2 py-1 outline-none focus:border-blue-500"
                    />
                  ) : (
                    <span className="text-sm text-slate-500">
                      {formatCurrency(b.spent)} / {formatCurrency(b.budgeted)}
                    </span>
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
          })}
        </div>
      </div>
    </div>
  );
}
