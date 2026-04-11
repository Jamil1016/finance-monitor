'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, AlertCircle, Clock, Check, X, FileText, ArrowRight, CreditCard, Wallet, Banknote, ArrowLeftRight, ChevronDown, ChevronUp, History } from 'lucide-react';
import Link from 'next/link';
import { Account, Liability, PaymentRecord, ACCOUNT_ICONS } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme-context';
import * as db from '@/lib/database';
import { formatCurrency, getDaysRemaining } from '@/lib/utils';

export default function WalletPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddLiability, setShowAddLiability] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferFrom, setTransferFrom] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [showPayModal, setShowPayModal] = useState<{ type: 'credit_card' | 'liability'; id: string; name: string; balance: number } | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payFromAccount, setPayFromAccount] = useState('');
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editingLiability, setEditingLiability] = useState<Liability | null>(null);

  const [accForm, setAccForm] = useState({ name: '', balance: '', creditLimit: '', billingDay: '', type: 'bank' as string, icon: '🏦', color: '#3b82f6' });
  const [libForm, setLibForm] = useState({ name: '', creditor: '', totalAmount: '', remainingAmount: '', monthlyPayment: '', deadline: '', notes: '', color: '#ef4444' });

  useEffect(() => {
    if (!user) return;
    db.getAccounts().then(setAccounts);
    db.getLiabilities().then(setLiabilities);
  }, [user]);

  const regularAccounts = accounts.filter(a => a.type !== 'credit_card');
  const creditCards = accounts.filter(a => a.type === 'credit_card');
  const totalAssets = regularAccounts.reduce((s, a) => s + a.balance, 0);
  const totalCreditDebt = creditCards.reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = liabilities.reduce((s, l) => s + l.remainingAmount, 0) + totalCreditDebt;
  const netWorth = totalAssets - totalLiabilities;
  const monthlyDebtPayment = liabilities.reduce((s, l) => s + l.monthlyPayment, 0);

  // --- Account handlers ---
  const handleSaveAccount = async () => {
    if (!accForm.name) return;
    const isCC = accForm.type === 'credit_card';
    // Credit card: balance = 0 (owe nothing), creditLimit = what user entered
    // Regular: balance = what user entered, creditLimit = 0
    const balance = isCC ? 0 : (parseFloat(accForm.balance) || 0);
    const creditLimit = isCC ? (parseFloat(accForm.creditLimit) || 0) : 0;
    const billingDay = isCC ? (parseInt(accForm.billingDay) || 0) : 0;

    if (editingAccount) {
      await db.updateAccount(editingAccount.id, { name: accForm.name, balance: isCC ? editingAccount.balance : balance, type: accForm.type as any, icon: accForm.icon, color: accForm.color });
      if (isCC) {
        const { supabase } = await import('@/lib/supabase');
        await supabase.from('accounts').update({ credit_limit: creditLimit, billing_day: billingDay }).eq('id', editingAccount.id);
      }
      setAccounts(prev => prev.map(a => a.id === editingAccount.id ? { ...a, name: accForm.name, balance: isCC ? a.balance : balance, creditLimit: isCC ? creditLimit : 0, billingDay: isCC ? billingDay : 0, type: accForm.type as any, icon: accForm.icon, color: accForm.color } : a));
    } else {
      const acc = await db.addAccount({ name: accForm.name, balance, creditLimit, billingDay, type: accForm.type as any, icon: accForm.icon, color: accForm.color });
      if (acc) setAccounts(prev => [...prev, acc]);
    }
    resetAccForm();
  };

  const startEditAccount = (acc: Account) => {
    setEditingAccount(acc);
    setAccForm({ name: acc.name, balance: String(acc.balance), creditLimit: String(acc.creditLimit || 0), billingDay: String(acc.billingDay || ''), type: acc.type, icon: acc.icon, color: acc.color });
    setShowAddAccount(true);
  };

  const handleDeleteAccount = async (id: string) => {
    await db.deleteAccount(id);
    setAccounts(prev => prev.filter(a => a.id !== id));
  };

  const resetAccForm = () => {
    setAccForm({ name: '', balance: '', creditLimit: '', billingDay: '', type: 'bank', icon: '🏦', color: '#3b82f6' });
    setShowAddAccount(false);
    setEditingAccount(null);
  };

  // --- Liability handlers ---
  const handleSaveLiability = async () => {
    if (!libForm.name || !libForm.remainingAmount) return;
    if (editingLiability) {
      await db.updateLiability(editingLiability.id, {
        name: libForm.name, creditor: libForm.creditor,
        remaining_amount: parseFloat(libForm.remainingAmount) || 0,
        monthly_payment: parseFloat(libForm.monthlyPayment) || 0,
        deadline: libForm.deadline, notes: libForm.notes, color: libForm.color,
      });
      setLiabilities(prev => prev.map(l => l.id === editingLiability.id ? {
        ...l, name: libForm.name, creditor: libForm.creditor,
        remainingAmount: parseFloat(libForm.remainingAmount) || 0,
        monthlyPayment: parseFloat(libForm.monthlyPayment) || 0,
        deadline: libForm.deadline, notes: libForm.notes, color: libForm.color,
      } : l));
    } else {
      const lib = await db.addLiability({
        name: libForm.name, creditor: libForm.creditor,
        totalAmount: parseFloat(libForm.totalAmount) || parseFloat(libForm.remainingAmount) || 0,
        remainingAmount: parseFloat(libForm.remainingAmount) || 0,
        monthlyPayment: parseFloat(libForm.monthlyPayment) || 0,
        deadline: libForm.deadline, notes: libForm.notes, color: libForm.color,
      });
      if (lib) setLiabilities(prev => [...prev, lib]);
    }
    resetLibForm();
  };

  const startEditLiability = (lib: Liability) => {
    setEditingLiability(lib);
    setLibForm({
      name: lib.name, creditor: lib.creditor,
      totalAmount: String(lib.totalAmount), remainingAmount: String(lib.remainingAmount),
      monthlyPayment: String(lib.monthlyPayment), deadline: lib.deadline,
      notes: lib.notes, color: lib.color,
    });
    setShowAddLiability(true);
  };

  const handleDeleteLiability = async (id: string) => {
    await db.deleteLiability(id);
    setLiabilities(prev => prev.filter(l => l.id !== id));
  };

  const resetLibForm = () => {
    setLibForm({ name: '', creditor: '', totalAmount: '', remainingAmount: '', monthlyPayment: '', deadline: '', notes: '', color: '#ef4444' });
    setShowAddLiability(false);
    setEditingLiability(null);
  };

  const handlePay = async () => {
    if (!showPayModal || !payAmount || parseFloat(payAmount) <= 0) return;
    const amt = parseFloat(payAmount);

    if (showPayModal.type === 'credit_card') {
      // Reduce credit card balance
      const cc = accounts.find(a => a.id === showPayModal.id);
      if (cc) {
        const newBal = Math.max(0, cc.balance - amt);
        await db.updateAccountBalance(cc.id, newBal);
        setAccounts(prev => prev.map(a => a.id === cc.id ? { ...a, balance: newBal } : a));
      }
    } else {
      // Reduce liability remaining amount
      const lib = liabilities.find(l => l.id === showPayModal.id);
      if (lib) {
        const newRemaining = Math.max(0, lib.remainingAmount - amt);
        await db.updateLiability(lib.id, { remaining_amount: newRemaining });
        setLiabilities(prev => prev.map(l => l.id === lib.id ? { ...l, remainingAmount: newRemaining } : l));
      }
    }

    // Deduct from paying account
    const payingAcc = payFromAccount ? accounts.find(a => a.id === payFromAccount) : null;
    if (payingAcc && payingAcc.type !== 'credit_card') {
      const newBal = payingAcc.balance - amt;
      await db.updateAccountBalance(payingAcc.id, newBal);
      setAccounts(prev => prev.map(a => a.id === payingAcc.id ? { ...a, balance: newBal } : a));
    }

    // Log payment history
    const now = new Date();
    await db.addPaymentRecord({
      targetType: showPayModal.type,
      targetId: showPayModal.id,
      targetName: showPayModal.name,
      amount: amt,
      paidFrom: payingAcc?.name || 'Unknown',
      date: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`,
      time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    });

    setShowPayModal(null); setPayAmount(''); setPayFromAccount('');
  };

  const toggleHistory = async (id: string) => {
    if (showHistory === id) { setShowHistory(null); return; }
    const records = await db.getPaymentHistory(id);
    setPaymentHistory(records);
    setShowHistory(id);
  };

  const handleTransfer = async () => {
    if (!transferFrom || !transferTo || !transferAmount || transferFrom === transferTo) return;
    const amt = parseFloat(transferAmount);
    if (amt <= 0) return;
    const from = accounts.find(a => a.id === transferFrom);
    const to = accounts.find(a => a.id === transferTo);
    if (!from || !to) return;
    await db.updateAccountBalance(from.id, from.balance - amt);
    await db.updateAccountBalance(to.id, to.balance + amt);
    setAccounts(prev => prev.map(a => {
      if (a.id === from.id) return { ...a, balance: a.balance - amt };
      if (a.id === to.id) return { ...a, balance: a.balance + amt };
      return a;
    }));
    setTransferFrom(''); setTransferTo(''); setTransferAmount(''); setShowTransfer(false);
  };

  const typeIcons: Record<string, string> = { bank: '🏦', ewallet: '📱', cash: '💵' };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">Wallet</h1>

      {/* Net Worth Card */}
      <div className="rounded-2xl p-5 text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${theme.primaryDark}, ${theme.primary})` }}>
        <p className="text-white/70 text-xs font-medium">Net Worth</p>
        <p className={`text-3xl font-bold mt-1 ${netWorth < 0 ? 'text-red-200' : ''}`}>{formatCurrency(netWorth)}</p>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <p className="text-white/60 text-[10px]">Total Assets</p>
            <p className="text-lg font-semibold text-green-200">{formatCurrency(totalAssets)}</p>
          </div>
          <div>
            <p className="text-white/60 text-[10px]">Total Liabilities</p>
            <p className="text-lg font-semibold text-red-200">{formatCurrency(totalLiabilities)}</p>
          </div>
        </div>
      </div>

      {/* ====== ACCOUNTS ====== */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Accounts</h2>
          <div className="flex gap-2">
            {accounts.length >= 2 && (
              <button onClick={() => setShowTransfer(true)} className="text-xs font-semibold flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-slate-100" style={{ color: theme.primary }}>
                <ArrowLeftRight size={14} /> Transfer
              </button>
            )}
            <button onClick={() => setShowAddAccount(true)} className="text-xs font-semibold flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-slate-100" style={{ color: theme.primary }}>
              <Plus size={14} /> Add
            </button>
          </div>
        </div>

        {regularAccounts.length === 0 && creditCards.length === 0 ? (
          <button onClick={() => setShowAddAccount(true)} className="w-full bg-white rounded-2xl p-8 shadow-sm border border-dashed border-slate-300 text-center hover:bg-slate-50">
            <Wallet size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm text-slate-500 font-medium">Add your first account</p>
            <p className="text-xs text-slate-400">BPI, Maya, GCash, Cash...</p>
          </button>
        ) : (
          <>
          <div className="space-y-2">
            {regularAccounts.map(acc => (
              <div key={acc.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: acc.color + '15' }}>
                  {acc.icon || typeIcons[acc.type] || '🏦'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{acc.name}</p>
                  <p className="text-xs text-slate-400 capitalize">{acc.type === 'ewallet' ? 'E-Wallet' : acc.type}</p>
                </div>
                <p className="text-base font-bold text-slate-900">{formatCurrency(acc.balance)}</p>
                <div className="flex gap-0.5">
                  <button onClick={() => startEditAccount(acc)} className="p-1.5 hover:bg-blue-50 rounded-lg"><Pencil size={13} className="text-slate-300 hover:text-blue-500" /></button>
                  <button onClick={() => handleDeleteAccount(acc.id)} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={13} className="text-slate-300 hover:text-red-400" /></button>
                </div>
              </div>
            ))}
            <div className="rounded-xl p-3 flex justify-between items-center" style={{ backgroundColor: theme.surfaceBg }}>
              <span className="text-sm font-semibold text-slate-600">Total Assets</span>
              <span className="text-base font-bold text-green-600">{formatCurrency(totalAssets)}</span>
            </div>
          </div>

          {/* Credit Cards Section */}
          {creditCards.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-2">💳 Credit Cards</h3>
              <div className="space-y-2">
                {creditCards.map(cc => {
                  const available = (cc.creditLimit || 0) - cc.balance;
                  const usedPct = cc.creditLimit > 0 ? (cc.balance / cc.creditLimit) * 100 : 0;
                  // Calculate days until due
                  const now = new Date();
                  const thisMonth = now.getDate();
                  const dueDay = cc.billingDay || 0;
                  let daysUntilDue = 0;
                  if (dueDay > 0) {
                    if (dueDay >= thisMonth) {
                      daysUntilDue = dueDay - thisMonth;
                    } else {
                      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                      daysUntilDue = daysInMonth - thisMonth + dueDay;
                    }
                  }
                  const dueUrgent = dueDay > 0 && daysUntilDue <= 5;
                  return (
                    <div key={cc.id} className="bg-white rounded-xl p-4 shadow-sm border border-red-100">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl bg-red-50">💳</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900">{cc.name}</p>
                          <div className="flex items-center gap-2">
                            {cc.creditLimit > 0 && <span className="text-[10px] text-slate-400">Limit: {formatCurrency(cc.creditLimit)}</span>}
                            {dueDay > 0 && (
                              <span className={`text-[10px] font-medium flex items-center gap-0.5 ${dueUrgent ? 'text-red-500' : 'text-slate-400'}`}>
                                {dueUrgent && <AlertCircle size={9} />}
                                Due: {dueDay}th ({daysUntilDue}d)
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-0.5">
                          <button onClick={() => startEditAccount(cc)} className="p-1.5 hover:bg-blue-50 rounded-lg"><Pencil size={13} className="text-slate-300 hover:text-blue-500" /></button>
                          <button onClick={() => handleDeleteAccount(cc.id)} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={13} className="text-slate-300 hover:text-red-400" /></button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg p-2 bg-red-50 text-center">
                          <p className="text-[9px] text-red-400">Balance Owed</p>
                          <p className="text-sm font-bold text-red-500">{formatCurrency(cc.balance)}</p>
                        </div>
                        <div className="rounded-lg p-2 text-center" style={{ backgroundColor: theme.surfaceBg }}>
                          <p className="text-[9px]" style={{ color: theme.primary }}>Available</p>
                          <p className="text-sm font-bold" style={{ color: theme.primary }}>{formatCurrency(Math.max(0, available))}</p>
                        </div>
                      </div>
                      {cc.creditLimit > 0 && (
                        <div className="mt-2">
                          <div className="w-full h-1.5 rounded-full bg-slate-100">
                            <div className="h-1.5 rounded-full progress-bar" style={{ width: `${Math.min(usedPct, 100)}%`, backgroundColor: usedPct > 80 ? '#ef4444' : usedPct > 50 ? '#f59e0b' : theme.primary }} />
                          </div>
                          <p className="text-[9px] text-slate-400 mt-0.5">{usedPct.toFixed(0)}% used</p>
                        </div>
                      )}
                      <div className="flex gap-2 mt-2">
                        {cc.balance > 0 && (
                          <button onClick={() => setShowPayModal({ type: 'credit_card', id: cc.id, name: cc.name, balance: cc.balance })}
                            className="flex-1 py-2 rounded-xl text-xs font-bold text-white" style={{ backgroundColor: theme.primary }}>
                            Pay {formatCurrency(cc.balance)}
                          </button>
                        )}
                        <button onClick={() => toggleHistory(cc.id)}
                          className="py-2 px-3 rounded-xl text-xs font-medium border flex items-center gap-1" style={{ borderColor: theme.primary + '40', color: theme.primary }}>
                          <History size={12} /> {showHistory === cc.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      </div>
                      {showHistory === cc.id && (
                        <div className="mt-2 pt-2 border-t border-slate-100">
                          <p className="text-[10px] font-semibold text-slate-500 mb-1.5">Payment History</p>
                          {paymentHistory.length === 0 ? (
                            <p className="text-[10px] text-slate-400 py-2">No payments yet</p>
                          ) : (
                            <div className="space-y-1.5 max-h-40 overflow-y-auto">
                              {paymentHistory.map(p => (
                                <div key={p.id} className="flex items-center justify-between rounded-lg p-2" style={{ backgroundColor: theme.surfaceBg }}>
                                  <div>
                                    <p className="text-[10px] font-medium text-slate-700">Paid from {p.paidFrom}</p>
                                    <p className="text-[9px] text-slate-400">{p.date} {p.time && `· ${p.time}`}</p>
                                  </div>
                                  <span className="text-xs font-bold text-green-600">-{formatCurrency(p.amount)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div className="rounded-xl p-3 flex justify-between items-center bg-red-50">
                  <span className="text-sm font-semibold text-red-600">Credit Card Debt</span>
                  <span className="text-base font-bold text-red-600">{formatCurrency(totalCreditDebt)}</span>
                </div>
              </div>
            </div>
          )}
          </>
        )}
      </div>

      {/* ====== LIABILITIES ====== */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Liabilities</h2>
          <button onClick={() => setShowAddLiability(true)} className="text-xs font-semibold flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-slate-100" style={{ color: theme.primary }}>
            <Plus size={14} /> Add
          </button>
        </div>

        {liabilities.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center">
            <Check size={32} className="mx-auto text-green-400 mb-2" />
            <p className="text-sm text-slate-500 font-medium">No liabilities!</p>
            <p className="text-xs text-slate-400">Tap + to add loans, debts, or credit cards</p>
          </div>
        ) : (
          <div className="space-y-2">
            {liabilities.map(lib => {
              const paidPct = lib.totalAmount > 0 ? ((lib.totalAmount - lib.remainingAmount) / lib.totalAmount) * 100 : 0;
              const days = lib.deadline ? getDaysRemaining(lib.deadline) : null;
              const isUrgent = days !== null && days <= 7;

              return (
                <div key={lib.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: lib.color + '15' }}>
                      <CreditCard size={20} style={{ color: lib.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-900">{lib.name}</p>
                        <div className="flex gap-0.5">
                          <button onClick={() => startEditLiability(lib)} className="p-1.5 hover:bg-blue-50 rounded-lg"><Pencil size={13} className="text-slate-300 hover:text-blue-500" /></button>
                          <button onClick={() => handleDeleteLiability(lib.id)} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={13} className="text-slate-300 hover:text-red-400" /></button>
                        </div>
                      </div>
                      {lib.creditor && <p className="text-xs text-slate-400">{lib.creditor}</p>}

                      <div className="flex items-center justify-between mt-2">
                        <span className="text-base font-bold text-red-500">{formatCurrency(lib.remainingAmount)}</span>
                        {lib.totalAmount > 0 && <span className="text-xs text-slate-400">of {formatCurrency(lib.totalAmount)}</span>}
                      </div>

                      {lib.totalAmount > 0 && (
                        <div className="w-full bg-slate-100 rounded-full h-2 mt-2">
                          <div className="h-2 rounded-full bg-green-500 progress-bar" style={{ width: `${paidPct}%` }} />
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-2">
                        {lib.monthlyPayment > 0 && (
                          <span className="text-xs text-slate-500">{formatCurrency(lib.monthlyPayment)}/month</span>
                        )}
                        {days !== null && (
                          <span className={`text-xs font-medium flex items-center gap-0.5 ${isUrgent ? 'text-red-500' : 'text-slate-400'}`}>
                            {isUrgent && <AlertCircle size={11} />}
                            <Clock size={11} /> {days}d until deadline
                          </span>
                        )}
                      </div>

                      {lib.notes && <p className="text-[10px] text-slate-400 mt-1 italic">"{lib.notes}"</p>}
                      <div className="flex gap-2 mt-2">
                        {lib.remainingAmount > 0 && (
                          <button onClick={() => setShowPayModal({ type: 'liability', id: lib.id, name: lib.name, balance: lib.remainingAmount })}
                            className="flex-1 py-2 rounded-xl text-xs font-bold text-white" style={{ backgroundColor: theme.primary }}>
                            Make Payment
                          </button>
                        )}
                        <button onClick={() => toggleHistory(lib.id)}
                          className="py-2 px-3 rounded-xl text-xs font-medium border flex items-center gap-1" style={{ borderColor: theme.primary + '40', color: theme.primary }}>
                          <History size={12} /> {showHistory === lib.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      </div>
                      {showHistory === lib.id && (
                        <div className="mt-2 pt-2 border-t border-slate-100">
                          <p className="text-[10px] font-semibold text-slate-500 mb-1.5">Payment History</p>
                          {paymentHistory.length === 0 ? (
                            <p className="text-[10px] text-slate-400 py-2">No payments yet</p>
                          ) : (
                            <div className="space-y-1.5 max-h-40 overflow-y-auto">
                              {paymentHistory.map(p => (
                                <div key={p.id} className="flex items-center justify-between rounded-lg p-2" style={{ backgroundColor: theme.surfaceBg }}>
                                  <div>
                                    <p className="text-[10px] font-medium text-slate-700">Paid from {p.paidFrom}</p>
                                    <p className="text-[9px] text-slate-400">{p.date} {p.time && `· ${p.time}`}</p>
                                  </div>
                                  <span className="text-xs font-bold text-green-600">-{formatCurrency(p.amount)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="bg-red-50 rounded-xl p-3 flex justify-between items-center">
              <div>
                <span className="text-sm font-semibold text-red-700">Total Owed</span>
                {monthlyDebtPayment > 0 && <p className="text-[10px] text-red-500">{formatCurrency(monthlyDebtPayment)}/month payments</p>}
              </div>
              <span className="text-base font-bold text-red-600">{formatCurrency(totalLiabilities)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Income Link */}
      <Link href="/income" className="flex items-center justify-between bg-white rounded-xl p-4 shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: theme.primaryBg }}>
            <FileText size={18} style={{ color: theme.primary }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Income & Payslips</p>
            <p className="text-xs text-slate-400">Scan payslips, track salary & tax</p>
          </div>
        </div>
        <ArrowRight size={16} className="text-slate-400" />
      </Link>

      {/* Add/Edit Account Modal */}
      {showAddAccount && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end md:items-center justify-center modal-backdrop" onClick={resetAccForm}>
          <div className="bg-white w-full md:w-[420px] md:rounded-2xl rounded-t-2xl p-6 pb-8 mb-16 md:mb-0 space-y-4 modal-content max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-900">{editingAccount ? 'Edit Account' : 'Add Account'}</h2>

            <input type="text" value={accForm.name} onChange={e => setAccForm({ ...accForm, name: e.target.value })} placeholder="Account name (e.g. BPI, Maya)" className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm outline-none focus:border-blue-500" autoFocus />

            {accForm.type === 'credit_card' ? (
              <>
                <div>
                  <label className="text-xs text-slate-500">Credit Limit (PHP)</label>
                  <input type="number" value={accForm.creditLimit} onChange={e => setAccForm({ ...accForm, creditLimit: e.target.value })} placeholder="e.g. 50000" className="w-full text-2xl font-bold border-b-2 py-2 outline-none" style={{ borderColor: '#ef4444' }} />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Payment Due Day (1-31)</label>
                  <input type="number" min="1" max="31" value={accForm.billingDay} onChange={e => setAccForm({ ...accForm, billingDay: e.target.value })} placeholder="e.g. 25" className="input-tinted w-full mt-1" />
                  <p className="text-[10px] text-slate-400 mt-1">Day of each month when payment is due. Balance starts at ₱0.</p>
                </div>
              </>
            ) : (
              <div>
                <label className="text-xs text-slate-500">Current Balance (PHP)</label>
                <input type="number" value={accForm.balance} onChange={e => setAccForm({ ...accForm, balance: e.target.value })} placeholder="0.00" className="w-full text-2xl font-bold border-b-2 py-2 outline-none" style={{ borderColor: theme.primary }} />
              </div>
            )}

            <div>
              <label className="text-xs text-slate-500">Type</label>
              <div className="flex gap-2 mt-1">
                {ACCOUNT_ICONS.map(t => (
                  <button key={t.type} onClick={() => setAccForm({ ...accForm, type: t.type, icon: t.icon, color: t.color })}
                    className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-xl transition-all`}
                    style={accForm.type === t.type ? { outline: `2px solid ${t.color}`, outlineOffset: '-2px', backgroundColor: t.color + '10' } : { border: '1px solid #e2e8f0' }}>
                    <span className="text-xl">{t.icon}</span>
                    <span className="text-[10px] font-medium text-slate-600">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={resetAccForm} className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-600">Cancel</button>
              <button onClick={handleSaveAccount} className="flex-1 py-3 text-white rounded-xl text-sm font-semibold" style={{ backgroundColor: theme.primary }}>
                {editingAccount ? 'Update' : 'Add Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Liability Modal */}
      {showAddLiability && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end md:items-center justify-center modal-backdrop" onClick={resetLibForm}>
          <div className="bg-white w-full md:w-[420px] md:rounded-2xl rounded-t-2xl p-6 pb-8 mb-16 md:mb-0 space-y-4 modal-content max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-900">{editingLiability ? 'Edit Liability' : 'Add Liability'}</h2>

            <input type="text" value={libForm.name} onChange={e => setLibForm({ ...libForm, name: e.target.value })} placeholder="Loan name (e.g. Company Loan)" className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm outline-none focus:border-blue-500" autoFocus />

            <input type="text" value={libForm.creditor} onChange={e => setLibForm({ ...libForm, creditor: e.target.value })} placeholder="Creditor (e.g. Nanoninth, BPI)" className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm outline-none focus:border-blue-500" />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 font-medium uppercase">Original Amount</label>
                <input type="number" value={libForm.totalAmount} onChange={e => setLibForm({ ...libForm, totalAmount: e.target.value })} placeholder="0.00" className="w-full border border-slate-200 rounded-lg py-2 px-3 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-medium uppercase">Remaining</label>
                <input type="number" value={libForm.remainingAmount} onChange={e => setLibForm({ ...libForm, remainingAmount: e.target.value })} placeholder="0.00" className="w-full border border-red-300 rounded-lg py-2 px-3 text-sm font-bold text-red-600 outline-none focus:border-red-500" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 font-medium uppercase">Monthly Payment</label>
                <input type="number" value={libForm.monthlyPayment} onChange={e => setLibForm({ ...libForm, monthlyPayment: e.target.value })} placeholder="0.00" className="w-full border border-slate-200 rounded-lg py-2 px-3 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-medium uppercase">Deadline</label>
                <input type="date" value={libForm.deadline} onChange={e => setLibForm({ ...libForm, deadline: e.target.value })} className="w-full border border-slate-200 rounded-lg py-2 px-3 text-sm outline-none focus:border-blue-500" />
              </div>
            </div>

            <input type="text" value={libForm.notes} onChange={e => setLibForm({ ...libForm, notes: e.target.value })} placeholder="Notes (optional)" className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm outline-none focus:border-blue-500" />

            <div>
              <label className="text-xs text-slate-500">Color</label>
              <div className="flex gap-2 mt-1">
                {['#ef4444', '#f59e0b', '#8b5cf6', '#3b82f6', '#ec4899', '#64748b'].map(c => (
                  <button key={c} onClick={() => setLibForm({ ...libForm, color: c })} className={`w-7 h-7 rounded-full border-2 ${libForm.color === c ? 'border-slate-900 scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={resetLibForm} className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-600">Cancel</button>
              <button onClick={handleSaveLiability} className="flex-1 py-3 text-white rounded-xl text-sm font-semibold bg-red-500">
                {editingLiability ? 'Update' : 'Add Liability'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pay Credit Card / Liability Modal */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end md:items-center justify-center modal-backdrop" onClick={() => setShowPayModal(null)}>
          <div className="bg-white w-full md:w-[420px] md:rounded-3xl rounded-t-3xl p-6 pb-8 mb-16 md:mb-0 space-y-4 modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-900">
              Pay {showPayModal.name}
            </h2>
            <p className="text-xs text-slate-500">
              Outstanding: <span className="font-bold text-red-500">{formatCurrency(showPayModal.balance)}</span>
            </p>

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: theme.primary + '80' }}>Payment Amount (PHP)</label>
              <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0.00" className="w-full text-2xl font-bold border-b-2 py-2 outline-none" style={{ borderColor: theme.primary }} autoFocus />
              <div className="flex gap-2 mt-2">
                <button onClick={() => setPayAmount(String(showPayModal.balance))} className="text-[10px] font-bold px-3 py-1 rounded-full" style={{ backgroundColor: theme.primaryBg, color: theme.primaryText }}>
                  Pay Full ({formatCurrency(showPayModal.balance)})
                </button>
                {showPayModal.balance > 1000 && (
                  <button onClick={() => setPayAmount(String(Math.round(showPayModal.balance / 2)))} className="text-[10px] font-bold px-3 py-1 rounded-full border border-slate-200 text-slate-500">
                    Pay Half
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: theme.primary + '80' }}>Pay From</label>
              <div className="flex gap-2 flex-wrap mt-1.5">
                {regularAccounts.map(acc => (
                  <button key={acc.id} onClick={() => setPayFromAccount(acc.id)} className="text-xs py-2 px-3 rounded-full flex items-center gap-1.5 transition-colors"
                    style={payFromAccount === acc.id ? { backgroundColor: theme.primaryBg, outline: `2px solid ${theme.primary}`, outlineOffset: '-2px', color: theme.primaryText } : { border: '1px solid #e2e8f0', color: '#94a3b8' }}>
                    <span>{acc.icon}</span> {acc.name}
                    <span className="text-[9px] opacity-60">({formatCurrency(acc.balance)})</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowPayModal(null)} className="flex-1 btn-pill border text-slate-600" style={{ borderColor: '#e2e8f0' }}>Cancel</button>
              <button onClick={handlePay} className="flex-1 btn-pill text-white" style={{ backgroundColor: theme.primary }}>
                Pay {payAmount ? formatCurrency(parseFloat(payAmount)) : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransfer && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end md:items-center justify-center modal-backdrop" onClick={() => setShowTransfer(false)}>
          <div className="bg-white w-full md:w-[420px] md:rounded-3xl rounded-t-3xl p-6 pb-8 mb-16 md:mb-0 space-y-4 modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-900">Transfer Between Accounts</h2>

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: theme.primaryText + '80' }}>From</label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {accounts.map(a => (
                  <button key={a.id} onClick={() => setTransferFrom(a.id)}
                    className="text-xs py-2 px-3 rounded-full flex items-center gap-1.5 transition-colors"
                    style={transferFrom === a.id ? { backgroundColor: theme.primaryBg, outline: `2px solid ${theme.primary}`, outlineOffset: '-2px', color: theme.primaryText } : { border: '1px solid #e2e8f0', color: '#64748b' }}>
                    <span>{a.icon}</span> {a.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-center"><ArrowLeftRight size={20} style={{ color: theme.primary }} /></div>

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: theme.primaryText + '80' }}>To</label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {accounts.filter(a => a.id !== transferFrom).map(a => (
                  <button key={a.id} onClick={() => setTransferTo(a.id)}
                    className="text-xs py-2 px-3 rounded-full flex items-center gap-1.5 transition-colors"
                    style={transferTo === a.id ? { backgroundColor: theme.primaryBg, outline: `2px solid ${theme.primary}`, outlineOffset: '-2px', color: theme.primaryText } : { border: '1px solid #e2e8f0', color: '#64748b' }}>
                    <span>{a.icon}</span> {a.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: theme.primaryText + '80' }}>Amount (PHP)</label>
              <input type="number" value={transferAmount} onChange={e => setTransferAmount(e.target.value)} placeholder="0.00" className="w-full text-2xl font-bold border-b-2 py-2 outline-none" style={{ borderColor: theme.primary }} autoFocus />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowTransfer(false)} className="flex-1 btn-pill border text-slate-600" style={{ borderColor: '#e2e8f0' }}>Cancel</button>
              <button onClick={handleTransfer} className="flex-1 btn-pill text-white" style={{ backgroundColor: theme.primary }}>Transfer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
