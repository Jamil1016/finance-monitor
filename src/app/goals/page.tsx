'use client';

import { useState, useEffect } from 'react';
import { Plus, Target, Trash2, Edit3, Check, X } from 'lucide-react';
import { SavingsGoal } from '@/lib/types';
import { getItems, saveItems, addItem, deleteItem, KEYS } from '@/lib/storage';
import { formatCurrency, generateId, getDaysRemaining } from '@/lib/utils';

const DEFAULT_GOALS: SavingsGoal[] = [
  { id: '1', name: '2026 Savings Target', target: 400000, current: 51000, deadline: '2026-12-31', color: '#1e40af' },
  { id: '2', name: 'Emergency Fund', target: 150000, current: 0, deadline: '2028-06-30', color: '#059669' },
  { id: '3', name: 'Pag-IBIG MP2', target: 120000, current: 0, deadline: '2031-04-01', color: '#7c3aed' },
];

export default function GoalsPage() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [addAmount, setAddAmount] = useState('');
  const [form, setForm] = useState({ name: '', target: '', deadline: '', color: '#3b82f6' });

  useEffect(() => {
    let saved = getItems<SavingsGoal>(KEYS.GOALS);
    if (saved.length === 0) {
      saved = DEFAULT_GOALS;
      saveItems(KEYS.GOALS, saved);
    }
    setGoals(saved);
  }, []);

  const handleCreate = () => {
    if (!form.name || !form.target) return;
    const goal: SavingsGoal = {
      id: generateId(),
      name: form.name,
      target: parseFloat(form.target),
      current: 0,
      deadline: form.deadline || '2026-12-31',
      color: form.color,
    };
    setGoals(addItem(KEYS.GOALS, goal));
    setForm({ name: '', target: '', deadline: '', color: '#3b82f6' });
    setShowAdd(false);
  };

  const handleAddFunds = (id: string) => {
    if (!addAmount || parseFloat(addAmount) <= 0) return;
    const updated = goals.map((g) =>
      g.id === id ? { ...g, current: g.current + parseFloat(addAmount) } : g
    );
    saveItems(KEYS.GOALS, updated);
    setGoals(updated);
    setAddAmount('');
    setEditId(null);
  };

  const handleDelete = (id: string) => {
    setGoals(deleteItem<SavingsGoal>(KEYS.GOALS, id));
  };

  const totalSaved = goals.reduce((s, g) => s + g.current, 0);
  const totalTarget = goals.reduce((s, g) => s + g.target, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Savings Goals</h1>
          <p className="text-sm text-slate-500">
            {formatCurrency(totalSaved)} saved across {goals.length} goals
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-1.5 shadow transition-colors"
        >
          <Plus size={18} /> New Goal
        </button>
      </div>

      {/* Goals List */}
      <div className="space-y-4">
        {goals.map((goal) => {
          const pct = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;
          const remaining = goal.target - goal.current;
          const days = getDaysRemaining(goal.deadline);
          const monthlyNeeded = days > 0 ? remaining / (days / 30) : 0;

          return (
            <div key={goal.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 card-hover">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: goal.color + '20' }}
                  >
                    <Target size={20} style={{ color: goal.color }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{goal.name}</h3>
                    <p className="text-xs text-slate-400">{days} days remaining</p>
                  </div>
                </div>
                <button onClick={() => handleDelete(goal.id)} className="p-1.5 hover:bg-red-50 rounded-lg">
                  <Trash2 size={14} className="text-slate-300 hover:text-red-400" />
                </button>
              </div>

              {/* Progress */}
              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-bold text-slate-900">{formatCurrency(goal.current)}</span>
                  <span className="text-slate-400">{formatCurrency(goal.target)}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3">
                  <div
                    className="h-3 rounded-full progress-bar"
                    style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: goal.color }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-xs text-slate-400">{pct.toFixed(1)}%</span>
                  {remaining > 0 && (
                    <span className="text-xs text-slate-400">
                      ~{formatCurrency(monthlyNeeded)}/month needed
                    </span>
                  )}
                </div>
              </div>

              {/* Add Funds */}
              {editId === goal.id ? (
                <div className="flex gap-2 mt-3">
                  <input
                    type="number"
                    value={addAmount}
                    onChange={(e) => setAddAmount(e.target.value)}
                    placeholder="Amount"
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                    autoFocus
                  />
                  <button
                    onClick={() => handleAddFunds(goal.id)}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={() => { setEditId(null); setAddAmount(''); }}
                    className="px-3 py-2 bg-slate-200 text-slate-600 rounded-lg"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditId(goal.id)}
                  className="w-full mt-2 py-2 border border-dashed border-slate-300 rounded-xl text-sm text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} /> Add Funds
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* New Goal Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center modal-backdrop" onClick={() => setShowAdd(false)}>
          <div className="bg-white w-full md:w-[440px] md:rounded-2xl rounded-t-2xl p-6 space-y-4 modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-900">New Savings Goal</h2>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Goal name"
              className="w-full border border-slate-200 rounded-lg py-2.5 px-3 text-sm outline-none focus:border-blue-500"
              autoFocus
            />
            <div>
              <label className="text-xs text-slate-500">Target Amount (PHP)</label>
              <input
                type="number"
                value={form.target}
                onChange={(e) => setForm({ ...form, target: e.target.value })}
                placeholder="0.00"
                className="w-full text-2xl font-bold border-b-2 border-blue-500 py-2 outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Deadline</label>
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                className="w-full border border-slate-200 rounded-lg py-2.5 px-3 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Color</label>
              <div className="flex gap-2 mt-1">
                {['#1e40af', '#059669', '#7c3aed', '#dc2626', '#f59e0b', '#ec4899'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setForm({ ...form, color: c })}
                    className={`w-8 h-8 rounded-full border-2 ${form.color === c ? 'border-slate-900 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-600">
                Cancel
              </button>
              <button onClick={handleCreate} className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold">
                Create Goal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
