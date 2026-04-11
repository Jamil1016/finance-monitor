'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, AlertTriangle, TrendingDown, Clock, Check, X } from 'lucide-react';
import { BudgetCategory } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme-context';
import * as db from '@/lib/database';
import { formatCurrency, getCurrentMonth, getMonthName, CATEGORY_COLORS } from '@/lib/utils';
import CategoryIcon from '@/components/ui/CategoryIcon';
import DonutChart from '@/components/ui/DonutChart';

function getDaysLeftInMonth(): number {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return lastDay - now.getDate() + 1;
}

function getDaysInMonth(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
}

export default function BudgetPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [budgets, setBudgets] = useState<BudgetCategory[]>([]);
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, number>>({});
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatBudget, setNewCatBudget] = useState('');
  const [newCatType, setNewCatType] = useState<'needs' | 'wants'>('needs');
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

  const daysLeft = getDaysLeftInMonth();
  const daysTotal = getDaysInMonth();
  const daysPassed = daysTotal - daysLeft;
  const dailyAllowance = daysLeft > 0 ? Math.max(0, totalRemaining / daysLeft) : 0;

  // Spending pace: expected spend by now vs actual
  const expectedSpendByNow = totalBudget * (daysPassed / daysTotal);
  const paceStatus = totalSpent <= expectedSpendByNow ? 'under' : 'over';
  const paceDiff = Math.abs(totalSpent - expectedSpendByNow);
  const projectedMonthEnd = daysPassed > 0 ? (totalSpent / daysPassed) * daysTotal : 0;
  const projectedOverUnder = totalBudget - projectedMonthEnd;

  const donutSegments = budgets.filter(b => b.spent > 0).map(b => ({
    label: b.name, value: b.spent, color: CATEGORY_COLORS[b.name] || '#64748b',
  }));

  // Savings this month
  const monthlySavings = totalBudget - totalSpent;

  const handleSave = async () => {
    await db.saveBudgets(budgets.map((b) => ({ id: b.id, budgeted: editValues[b.id] || b.budgeted })));
    setBudgets(budgets.map((b) => ({ ...b, budgeted: editValues[b.id] || b.budgeted })));
    setEditing(false);
  };

  const handleAddCategory = async () => {
    if (!newCatName || !newCatBudget) return;
    // Use initDefaultBudgets pattern but single
    const user2 = (await (await import('@/lib/supabase')).supabase.auth.getUser()).data.user;
    if (!user2) return;
    const { supabase } = await import('@/lib/supabase');
    const { data } = await supabase.from('budgets').insert({
      user_id: user2.id, name: newCatName, budgeted: parseFloat(newCatBudget),
      type: newCatType, icon: 'CircleDot',
    }).select().single();
    if (data) {
      setBudgets((prev) => [...prev, { id: data.id, name: data.name, budgeted: Number(data.budgeted), spent: 0, type: data.type, icon: data.icon }]);
    }
    setNewCatName(''); setNewCatBudget(''); setShowAddCategory(false);
  };

  const handleDeleteCategory = async (id: string) => {
    const { supabase } = await import('@/lib/supabase');
    await supabase.from('budgets').delete().eq('id', id);
    setBudgets((prev) => prev.filter((b) => b.id !== id));
  };

  const needsBudgets = budgets.filter((b) => b.type === 'needs');
  const wantsBudgets = budgets.filter((b) => b.type === 'wants');

  const renderCategory = (b: BudgetCategory) => {
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
                <div className="flex items-center gap-1">
                  <input type="number" value={editValues[b.id] || 0} onChange={(e) => setEditValues({ ...editValues, [b.id]: parseFloat(e.target.value) || 0 })} className="w-20 text-right text-sm border rounded-lg px-2 py-1 outline-none" style={{ borderColor: theme.primary }} />
                  <button onClick={() => handleDeleteCategory(b.id)} className="p-1 hover:bg-red-50 rounded-lg"><Trash2 size={13} className="text-slate-300 hover:text-red-400" /></button>
                </div>
              ) : (
                <span className="text-sm font-bold text-slate-900">{formatCurrency(b.spent)}</span>
              )}
            </div>
            {!editing && <span className="text-xs text-slate-400">of {formatCurrency(b.budgeted)}</span>}
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
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Budget</h1>
          <p className="text-sm text-slate-500">{getMonthName(month)}</p>
        </div>
        <div className="flex gap-2">
          {editing && (
            <button onClick={() => setShowAddCategory(true)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              <Plus size={16} />
            </button>
          )}
          <button onClick={() => (editing ? handleSave() : setEditing(true))} className="text-sm font-semibold px-4 py-2 rounded-xl transition-all" style={editing ? { backgroundColor: '#059669', color: 'white' } : { backgroundColor: 'white', border: '1px solid #e2e8f0', color: '#334155' }}>
            {editing ? 'Save' : 'Edit'}
          </button>
        </div>
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
          <div className="flex-1 space-y-2">
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

      {/* Insights Row */}
      <div className="grid grid-cols-3 gap-2">
        {/* Daily Allowance */}
        <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 text-center">
          <p className="text-[10px] text-slate-400 font-medium">Daily Allowance</p>
          <p className="text-sm font-bold" style={{ color: theme.primary }}>{formatCurrency(dailyAllowance)}</p>
          <p className="text-[9px] text-slate-400">{daysLeft} days left</p>
        </div>

        {/* Spending Pace */}
        <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 text-center">
          <p className="text-[10px] text-slate-400 font-medium">Pace</p>
          <p className={`text-sm font-bold ${paceStatus === 'under' ? 'text-green-600' : 'text-red-500'}`}>
            {paceStatus === 'under' ? <TrendingDown size={12} className="inline mr-0.5" /> : <AlertTriangle size={12} className="inline mr-0.5" />}
            {formatCurrency(paceDiff)}
          </p>
          <p className="text-[9px] text-slate-400">{paceStatus === 'under' ? 'under pace' : 'over pace'}</p>
        </div>

        {/* Projected Savings */}
        <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 text-center">
          <p className="text-[10px] text-slate-400 font-medium">Month-End</p>
          <p className={`text-sm font-bold ${projectedOverUnder >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {projectedOverUnder >= 0 ? `Save ${formatCurrency(projectedOverUnder)}` : `Over ${formatCurrency(Math.abs(projectedOverUnder))}`}
          </p>
          <p className="text-[9px] text-slate-400">projected</p>
        </div>
      </div>

      {/* Spending Pace Alert */}
      {paceStatus === 'over' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">Slow down!</p>
            <p className="text-xs text-red-600 mt-0.5">
              At this rate, you'll overspend by {formatCurrency(Math.abs(projectedOverUnder))} this month.
              Try to keep daily spending under {formatCurrency(dailyAllowance)}.
            </p>
          </div>
        </div>
      )}

      {/* Budget Saved Summary */}
      {monthlySavings > 0 && !editing && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <Check size={20} className="text-green-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-green-800">On track! {formatCurrency(monthlySavings)} unspent</p>
            <p className="text-xs text-green-600">
              {daysLeft} days left &middot; {formatCurrency(dailyAllowance)}/day budget remaining
            </p>
          </div>
        </div>
      )}

      {/* Needs */}
      {needsBudgets.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Needs</h2>
          <div className="space-y-3">{needsBudgets.map(renderCategory)}</div>
        </div>
      )}

      {/* Wants */}
      {wantsBudgets.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Wants & Buffer</h2>
          <div className="space-y-3">{wantsBudgets.map(renderCategory)}</div>
        </div>
      )}

      {/* Add Category Modal */}
      {showAddCategory && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end md:items-center justify-center modal-backdrop" onClick={() => setShowAddCategory(false)}>
          <div className="bg-white w-full md:w-[400px] md:rounded-2xl rounded-t-2xl p-6 pb-8 mb-16 md:mb-0 space-y-4 modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-900">Add Budget Category</h2>

            <input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Category name" className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm outline-none focus:border-blue-500" autoFocus />

            <div>
              <label className="text-xs text-slate-500">Monthly Budget (PHP)</label>
              <input type="number" value={newCatBudget} onChange={(e) => setNewCatBudget(e.target.value)} placeholder="0.00" className="w-full text-xl font-bold border-b-2 py-2 outline-none" style={{ borderColor: theme.primary }} />
            </div>

            <div>
              <label className="text-xs text-slate-500">Type</label>
              <div className="flex gap-2 mt-1">
                <button onClick={() => setNewCatType('needs')} className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${newCatType === 'needs' ? 'text-white' : 'border border-slate-200 text-slate-600'}`} style={newCatType === 'needs' ? { backgroundColor: theme.primary } : {}}>
                  Needs
                </button>
                <button onClick={() => setNewCatType('wants')} className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${newCatType === 'wants' ? 'text-white' : 'border border-slate-200 text-slate-600'}`} style={newCatType === 'wants' ? { backgroundColor: theme.primary } : {}}>
                  Wants
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowAddCategory(false)} className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-600">Cancel</button>
              <button onClick={handleAddCategory} className="flex-1 py-3 text-white rounded-xl text-sm font-semibold" style={{ backgroundColor: theme.primary }}>Add Category</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
