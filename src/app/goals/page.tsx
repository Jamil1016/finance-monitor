'use client';

import { useState, useEffect } from 'react';
import { Plus, Target, Trash2, Check, X, ChevronDown, ChevronUp, ArrowDown, ArrowUp, Pencil, Clock, Trophy, Sparkles } from 'lucide-react';
import { SavingsGoal, GoalTransaction, GoalCategory, GOAL_CATEGORIES, GOAL_TEMPLATES } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme-context';
import * as db from '@/lib/database';
import { formatCurrency, formatShortDate, getDaysRemaining } from '@/lib/utils';

function getMilestone(pct: number): { label: string; next: number; emoji: string } | null {
  if (pct >= 100) return { label: 'Goal Reached!', next: 100, emoji: '🎉' };
  if (pct >= 75) return { label: '75% - Almost there!', next: 100, emoji: '🔥' };
  if (pct >= 50) return { label: '50% - Halfway!', next: 75, emoji: '💪' };
  if (pct >= 25) return { label: '25% - Great start!', next: 50, emoji: '⭐' };
  return null;
}

export default function GoalsPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const [goalTx, setGoalTx] = useState<Record<string, GoalTransaction[]>>({});
  const [fundMode, setFundMode] = useState<{ id: string; type: 'deposit' | 'withdraw' } | null>(null);
  const [fundAmount, setFundAmount] = useState('');
  const [fundNote, setFundNote] = useState('');
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [form, setForm] = useState({
    name: '', target: '', deadline: '', color: '#3b82f6',
    category: 'other' as GoalCategory, icon: '🎯', notes: '',
  });

  useEffect(() => {
    if (!user) return;
    db.getGoals().then(setGoals);
  }, [user]);

  const loadGoalTx = async (goalId: string) => {
    if (goalTx[goalId]) return;
    const tx = await db.getGoalTransactions(goalId);
    setGoalTx((prev) => ({ ...prev, [goalId]: tx }));
  };

  const toggleExpand = (id: string) => {
    if (expandedGoal === id) {
      setExpandedGoal(null);
    } else {
      setExpandedGoal(id);
      loadGoalTx(id);
    }
  };

  const handleCreate = async () => {
    if (!form.name || !form.target) return;
    const goal = await db.addGoal({
      name: form.name, target: parseFloat(form.target), current: 0,
      deadline: form.deadline || '2026-12-31', color: form.color,
      category: form.category, icon: form.icon, notes: form.notes,
      priority: goals.length,
    });
    if (goal) setGoals((prev) => [...prev, goal]);
    resetForm();
  };

  const handleCreateFromTemplate = async (tpl: typeof GOAL_TEMPLATES[0]) => {
    const goal = await db.addGoal({
      name: tpl.name, target: tpl.target, current: 0,
      deadline: '2026-12-31', color: tpl.color,
      category: tpl.category, icon: tpl.icon, notes: '',
      priority: goals.length,
    });
    if (goal) setGoals((prev) => [...prev, goal]);
    setShowTemplates(false);
  };

  const handleFundSubmit = async () => {
    if (!fundMode || !fundAmount || parseFloat(fundAmount) <= 0) return;
    const goal = goals.find((g) => g.id === fundMode.id);
    if (!goal) return;

    const amt = parseFloat(fundAmount);
    const newCurrent = fundMode.type === 'deposit' ? goal.current + amt : Math.max(0, goal.current - amt);

    await db.updateGoalFunds(fundMode.id, newCurrent);
    const tx = await db.addGoalTransaction({
      goalId: fundMode.id, amount: amt, type: fundMode.type,
      note: fundNote || (fundMode.type === 'deposit' ? 'Added funds' : 'Withdrew funds'),
      date: new Date().toISOString().split('T')[0],
    });

    setGoals((prev) => prev.map((g) => g.id === fundMode.id ? { ...g, current: newCurrent } : g));
    if (tx) setGoalTx((prev) => ({ ...prev, [fundMode.id]: [tx, ...(prev[fundMode.id] || [])] }));
    setFundMode(null);
    setFundAmount('');
    setFundNote('');
  };

  const handleEditSave = async () => {
    if (!editingGoal) return;
    await db.updateGoal(editingGoal.id, {
      name: form.name, target: parseFloat(form.target) || editingGoal.target,
      deadline: form.deadline, color: form.color, category: form.category,
      icon: form.icon, notes: form.notes,
    });
    setGoals((prev) => prev.map((g) => g.id === editingGoal.id ? {
      ...g, name: form.name, target: parseFloat(form.target) || g.target,
      deadline: form.deadline, color: form.color, category: form.category,
      icon: form.icon, notes: form.notes,
    } : g));
    setEditingGoal(null);
    resetForm();
  };

  const startEdit = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setForm({
      name: goal.name, target: String(goal.target), deadline: goal.deadline,
      color: goal.color, category: goal.category, icon: goal.icon, notes: goal.notes,
    });
    setShowAdd(true);
  };

  const handleDelete = async (id: string) => {
    await db.deleteGoal(id);
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  const resetForm = () => {
    setForm({ name: '', target: '', deadline: '', color: '#3b82f6', category: 'other', icon: '🎯', notes: '' });
    setShowAdd(false);
    setEditingGoal(null);
  };

  const totalSaved = goals.reduce((s, g) => s + g.current, 0);
  const totalTarget = goals.reduce((s, g) => s + g.target, 0);
  const overallPct = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Savings Goals</h1>
          <p className="text-sm text-slate-500">{goals.length} goals &middot; {formatCurrency(totalSaved)} saved</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowTemplates(true)} className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            <Sparkles size={16} />
          </button>
          <button onClick={() => setShowAdd(true)} className="text-white rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-1.5 shadow transition-opacity hover:opacity-90" style={{ backgroundColor: theme.primary }}>
            <Plus size={18} /> New
          </button>
        </div>
      </div>

      {/* Overall Progress */}
      {goals.length > 0 && (
        <div className="rounded-2xl p-5 text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${theme.primaryDark}, ${theme.primary})` }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-white/70 text-xs">Total Saved</p>
              <p className="text-2xl font-bold">{formatCurrency(totalSaved)}</p>
            </div>
            <div className="text-right">
              <p className="text-white/70 text-xs">Total Target</p>
              <p className="text-lg font-semibold">{formatCurrency(totalTarget)}</p>
            </div>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2.5 mb-2">
            <div className="bg-white h-2.5 rounded-full progress-bar" style={{ width: `${Math.min(overallPct, 100)}%` }} />
          </div>
          <p className="text-xs text-white/70">{overallPct.toFixed(1)}% of all goals</p>
        </div>
      )}

      {/* Goals List */}
      {goals.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-slate-100">
          <Target size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No goals yet</p>
          <p className="text-slate-400 text-sm mt-1 mb-4">Start with a template or create your own</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setShowTemplates(true)} className="border border-slate-200 rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 flex items-center gap-1.5 hover:bg-slate-50">
              <Sparkles size={16} /> Templates
            </button>
            <button onClick={() => setShowAdd(true)} className="text-white rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-1.5 transition-opacity hover:opacity-90" style={{ backgroundColor: theme.primary }}>
              <Plus size={16} /> Custom Goal
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => {
            const pct = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;
            const remaining = goal.target - goal.current;
            const days = getDaysRemaining(goal.deadline);
            const monthlyNeeded = days > 0 && remaining > 0 ? remaining / (days / 30) : 0;
            const weeklyNeeded = days > 0 && remaining > 0 ? remaining / (days / 7) : 0;
            const dailyNeeded = days > 0 && remaining > 0 ? remaining / days : 0;
            const milestone = getMilestone(pct);
            const isExpanded = expandedGoal === goal.id;
            const catInfo = GOAL_CATEGORIES.find((c) => c.id === goal.category);
            const txList = goalTx[goal.id] || [];

            return (
              <div key={goal.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {/* Main Card */}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: goal.color + '15' }}>
                        {goal.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{goal.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          {catInfo && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: catInfo.color + '15', color: catInfo.color }}>
                              {catInfo.label}
                            </span>
                          )}
                          <span className="text-xs text-slate-400">
                            <Clock size={10} className="inline mr-0.5" />{days}d left
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => startEdit(goal)} className="p-1.5 hover:bg-blue-50 rounded-lg">
                        <Pencil size={13} className="text-slate-300 hover:text-blue-500" />
                      </button>
                      <button onClick={() => handleDelete(goal.id)} className="p-1.5 hover:bg-red-50 rounded-lg">
                        <Trash2 size={13} className="text-slate-300 hover:text-red-400" />
                      </button>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-bold text-slate-900">{formatCurrency(goal.current)}</span>
                    <span className="text-slate-400">{formatCurrency(goal.target)}</span>
                  </div>

                  {/* Milestone markers on progress bar */}
                  <div className="relative">
                    <div className="w-full bg-slate-100 rounded-full h-3">
                      <div className="h-3 rounded-full progress-bar relative" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: goal.color }}>
                        {pct >= 100 && <span className="absolute -right-1 -top-1 text-sm">🎉</span>}
                      </div>
                    </div>
                    {/* Milestone dots */}
                    <div className="absolute top-0 left-0 w-full h-3 flex items-center pointer-events-none">
                      {[25, 50, 75].map((m) => (
                        <div key={m} className="absolute w-1.5 h-1.5 rounded-full" style={{ left: `${m}%`, backgroundColor: pct >= m ? 'white' : '#cbd5e1', border: pct >= m ? `2px solid ${goal.color}` : 'none' }} />
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between mt-1.5">
                    <span className="text-xs font-semibold" style={{ color: goal.color }}>{pct.toFixed(1)}%</span>
                    {milestone && (
                      <span className="text-xs text-slate-500">{milestone.emoji} {milestone.label}</span>
                    )}
                  </div>

                  {/* Savings Pace */}
                  {remaining > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100">
                      <div className="text-center">
                        <p className="text-[10px] text-slate-400">Daily</p>
                        <p className="text-xs font-bold text-slate-700">{formatCurrency(dailyNeeded)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-slate-400">Weekly</p>
                        <p className="text-xs font-bold text-slate-700">{formatCurrency(weeklyNeeded)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-slate-400">Monthly</p>
                        <p className="text-xs font-bold text-slate-700">{formatCurrency(monthlyNeeded)}</p>
                      </div>
                    </div>
                  )}

                  {goal.notes && (
                    <p className="text-xs text-slate-400 mt-2 italic">"{goal.notes}"</p>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => setFundMode({ id: goal.id, type: 'deposit' })} className="flex-1 py-2 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-opacity hover:opacity-90" style={{ backgroundColor: '#059669' }}>
                      <ArrowDown size={14} /> Deposit
                    </button>
                    <button onClick={() => setFundMode({ id: goal.id, type: 'withdraw' })} className="flex-1 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 flex items-center justify-center gap-1 hover:bg-slate-50">
                      <ArrowUp size={14} /> Withdraw
                    </button>
                    <button onClick={() => toggleExpand(goal.id)} className="px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-500 hover:bg-slate-50">
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>

                {/* Fund Modal Inline */}
                {fundMode?.id === goal.id && (
                  <div className="px-5 pb-4 pt-0 border-t border-slate-100 bg-slate-50">
                    <p className="text-xs font-semibold text-slate-700 mt-3 mb-2">
                      {fundMode.type === 'deposit' ? '💰 Add Funds' : '📤 Withdraw Funds'}
                    </p>
                    <div className="flex gap-2">
                      <input type="number" value={fundAmount} onChange={(e) => setFundAmount(e.target.value)} placeholder="Amount" className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white" autoFocus />
                      <input type="text" value={fundNote} onChange={(e) => setFundNote(e.target.value)} placeholder="Note (optional)" className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white" />
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button onClick={handleFundSubmit} className="flex-1 py-2 text-white rounded-lg text-xs font-semibold" style={{ backgroundColor: fundMode.type === 'deposit' ? '#059669' : '#ef4444' }}>
                        <Check size={14} className="inline mr-1" />{fundMode.type === 'deposit' ? 'Add' : 'Withdraw'}
                      </button>
                      <button onClick={() => { setFundMode(null); setFundAmount(''); setFundNote(''); }} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-500">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Transaction History (expanded) */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50 px-5 py-3">
                    <p className="text-xs font-semibold text-slate-500 mb-2">Transaction History</p>
                    {txList.length === 0 ? (
                      <p className="text-xs text-slate-400 py-2">No transactions yet</p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {txList.map((tx) => (
                          <div key={tx.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${tx.type === 'deposit' ? 'bg-green-100' : 'bg-red-100'}`}>
                                {tx.type === 'deposit' ? <ArrowDown size={12} className="text-green-600" /> : <ArrowUp size={12} className="text-red-500" />}
                              </div>
                              <div>
                                <p className="text-xs font-medium text-slate-700">{tx.note}</p>
                                <p className="text-[10px] text-slate-400">{formatShortDate(tx.date)}</p>
                              </div>
                            </div>
                            <span className={`text-xs font-bold ${tx.type === 'deposit' ? 'text-green-600' : 'text-red-500'}`}>
                              {tx.type === 'deposit' ? '+' : '-'}{formatCurrency(tx.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end md:items-center justify-center modal-backdrop" onClick={() => setShowTemplates(false)}>
          <div className="bg-white w-full md:w-[440px] md:rounded-2xl rounded-t-2xl p-6 pb-8 mb-16 md:mb-0 modal-content max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">
                <Sparkles size={18} className="inline mr-2 text-yellow-500" />Goal Templates
              </h2>
              <button onClick={() => setShowTemplates(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X size={18} className="text-slate-400" />
              </button>
            </div>
            <div className="space-y-2">
              {GOAL_TEMPLATES.map((tpl, i) => (
                <button key={i} onClick={() => handleCreateFromTemplate(tpl)} className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 text-left transition-colors">
                  <span className="text-2xl">{tpl.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">{tpl.name}</p>
                    <p className="text-xs text-slate-400">Target: {formatCurrency(tpl.target)}</p>
                  </div>
                  <Plus size={16} className="text-slate-300" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Goal Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end md:items-center justify-center modal-backdrop" onClick={resetForm}>
          <div className="bg-white w-full md:w-[440px] md:rounded-2xl rounded-t-2xl p-6 pb-8 mb-16 md:mb-0 space-y-4 modal-content max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-900">{editingGoal ? 'Edit Goal' : 'New Savings Goal'}</h2>

            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Goal name" className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm outline-none focus:border-blue-500" autoFocus />

            <div>
              <label className="text-xs text-slate-500">Target Amount (PHP)</label>
              <input type="number" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} placeholder="0.00" className="w-full text-2xl font-bold border-b-2 py-2 outline-none" style={{ borderColor: theme.primary }} />
            </div>

            {/* Category */}
            <div>
              <label className="text-xs text-slate-500">Category</label>
              <div className="grid grid-cols-4 gap-2 mt-1">
                {GOAL_CATEGORIES.map((cat) => (
                  <button key={cat.id} onClick={() => setForm({ ...form, category: cat.id, icon: cat.icon, color: cat.color })}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl text-center transition-all ${form.category === cat.id ? 'scale-105' : 'hover:bg-slate-50'}`}
                    style={form.category === cat.id ? { outline: `2px solid ${cat.color}`, outlineOffset: '-2px', backgroundColor: cat.color + '10' } : {}}>
                    <span className="text-lg">{cat.icon}</span>
                    <span className="text-[9px] font-medium text-slate-600 leading-tight">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-500">Deadline</label>
              <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm outline-none focus:border-blue-500" />
            </div>

            <div>
              <label className="text-xs text-slate-500">Notes (optional)</label>
              <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. Down payment for condo" className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm outline-none focus:border-blue-500" />
            </div>

            <div>
              <label className="text-xs text-slate-500">Color</label>
              <div className="flex gap-2 mt-1">
                {['#1e40af', '#059669', '#7c3aed', '#dc2626', '#f59e0b', '#ec4899', '#06b6d4', '#f97316'].map((c) => (
                  <button key={c} onClick={() => setForm({ ...form, color: c })} className={`w-7 h-7 rounded-full border-2 transition-transform ${form.color === c ? 'border-slate-900 scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={resetForm} className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-600">Cancel</button>
              <button onClick={editingGoal ? handleEditSave : handleCreate} className="flex-1 py-3 text-white rounded-xl text-sm font-semibold" style={{ backgroundColor: theme.primary }}>
                {editingGoal ? 'Update Goal' : 'Create Goal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
