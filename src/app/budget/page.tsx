'use client';

import { useState, useEffect } from 'react';
import { BudgetCategory } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme-context';
import * as db from '@/lib/database';
import { formatCurrency, getCurrentMonth, getMonthName } from '@/lib/utils';
import CategoryIcon from '@/components/ui/CategoryIcon';
import DonutChart from '@/components/ui/DonutChart';
import { CATEGORY_COLORS } from '@/lib/utils';

export default function BudgetPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
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
    if (saved.length === 0) saved = await db.initDefaultBudgets();
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

  const donutSegments = budgets.filter(b => b.spent > 0).map(b => ({
    label: b.name, value: b.spent, color: CATEGORY_COLORS[b.name] || '#64748b',
  }));

  const handleSave = async () => {
    await db.saveBudgets(budgets.map((b) => ({ id: b.id, budgeted: editValues[b.id] || b.budgeted })));
    setBudgets(budgets.map((b) => ({ ...b, budgeted: editValues[b.id] || b.budgeted })));
    setEditing(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Budget</h1>
          <p className="text-sm text-slate-500">{getMonthName(month)}</p>
        </div>
        <button onClick={() => (editing ? handleSave() : setEditing(true))} className="text-sm font-semibold px-4 py-2 rounded-xl transition-all" style={editing ? { backgroundColor: '#059669', color: 'white' } : { backgroundColor: 'white', border: '1px solid #e2e8f0', color: '#334155' }}>
          {editing ? 'Save' : 'Edit Budget'}
        </button>
      </div>

      {/* Overview with Donut */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-center gap-5">
          <DonutChart
            segments={donutSegments.length > 0 ? donutSegments : [{ label: 'Remaining', value: 1, color: '#e2e8f0' }]}
            size={120}
            thickness={22}
            centerValue={`${Math.round(overallPct * 100)}%`}
            centerLabel="used"
          />
          <div className="flex-1">
            <div className="space-y-2">
              <div>
                <p className="text-xs text-slate-500">Spent</p>
                <p className="text-xl font-bold text-slate-900">{formatCurrency(totalSpent)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Budget</p>
                <p className="text-lg font-semibold text-slate-400">{formatCurrency(totalBudget)}</p>
              </div>
              <p className={`text-sm font-semibold ${totalRemaining >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {totalRemaining >= 0 ? `${formatCurrency(totalRemaining)} left` : `Over by ${formatCurrency(Math.abs(totalRemaining))}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="space-y-3">
        {budgets.map((b) => {
          const pct = b.budgeted > 0 ? b.spent / b.budgeted : 0;
          const remaining = b.budgeted - b.spent;
          const barColor = pct >= 1 ? '#ef4444' : pct >= 0.7 ? '#f59e0b' : CATEGORY_COLORS[b.name] || theme.primary;

          return (
            <div key={b.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-3">
                <CategoryIcon category={b.name} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900">{b.name}</span>
                    {editing ? (
                      <input type="number" value={editValues[b.id] || 0} onChange={(e) => setEditValues({ ...editValues, [b.id]: parseFloat(e.target.value) || 0 })} className="w-24 text-right text-sm border rounded-lg px-2 py-1 outline-none" style={{ borderColor: theme.primary }} />
                    ) : (
                      <span className="text-sm font-bold text-slate-900">{formatCurrency(b.spent)}</span>
                    )}
                  </div>
                  {!editing && (
                    <span className="text-xs text-slate-400">of {formatCurrency(b.budgeted)}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-slate-100 rounded-full h-2.5">
                  <div className="h-2.5 rounded-full progress-bar" style={{ width: `${Math.min(pct * 100, 100)}%`, backgroundColor: barColor }} />
                </div>
                <span className="text-xs font-bold w-10 text-right" style={{ color: barColor }}>
                  {Math.round(pct * 100)}%
                </span>
              </div>
              <p className={`text-xs mt-1.5 ${remaining >= 0 ? 'text-slate-400' : 'text-red-500 font-medium'}`}>
                {remaining >= 0 ? `${formatCurrency(remaining)} remaining` : `Over by ${formatCurrency(Math.abs(remaining))}`}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
