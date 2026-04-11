'use client';

import { useState } from 'react';
import { ArrowLeft, User, Lock, Palette, Trash2, LogOut, ChevronRight, Shield } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme-context';
import { supabase } from '@/lib/supabase';

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { theme, togglePicker } = useTheme();
  const [showChangePw, setShowChangePw] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [deleting, setDeleting] = useState(false);

  const displayName = user?.user_metadata?.display_name || 'User';
  const email = user?.email || '';

  const handleChangePassword = async () => {
    if (newPassword.length < 6) { setPwMsg('Password must be at least 6 characters'); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) setPwMsg(error.message);
    else { setPwMsg('Password changed successfully!'); setNewPassword(''); setTimeout(() => { setShowChangePw(false); setPwMsg(''); }, 2000); }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    // Delete all user data first
    const tables = ['transactions', 'budgets', 'goals', 'goal_transactions', 'accounts', 'liabilities', 'monthly_income', 'profiles'];
    for (const table of tables) {
      await supabase.from(table).delete().eq('user_id', user?.id);
    }
    await supabase.auth.signOut();
    setDeleting(false);
  };

  const MenuItem = ({ icon: Icon, label, desc, onClick, danger }: { icon: any; label: string; desc?: string; onClick: () => void; danger?: boolean }) => (
    <button onClick={onClick} className="w-full flex items-center gap-3 p-3 rounded-2xl hover:opacity-80 transition-colors text-left" style={{ backgroundColor: danger ? '#fef2f2' : theme.surfaceBg }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: danger ? '#fee2e2' : theme.primaryBg }}>
        <Icon size={18} style={{ color: danger ? '#ef4444' : theme.primary }} />
      </div>
      <div className="flex-1">
        <p className={`text-sm font-semibold ${danger ? 'text-red-600' : 'text-slate-900'}`}>{label}</p>
        {desc && <p className="text-[10px] text-slate-400">{desc}</p>}
      </div>
      <ChevronRight size={16} className="text-slate-300" />
    </button>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/" className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.primaryBg }}>
          <ArrowLeft size={18} style={{ color: theme.primary }} />
        </Link>
        <h1 className="text-xl font-bold text-slate-900">Settings</h1>
      </div>

      {/* Profile Card */}
      <div className="card-white p-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold" style={{ backgroundColor: theme.primary }}>
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-base font-bold text-slate-900">{displayName}</p>
          <p className="text-xs text-slate-400">{email}</p>
        </div>
      </div>

      {/* Menu Items */}
      <div className="card-white p-3 space-y-2">
        <MenuItem icon={Palette} label="Theme & Design" desc="Change app colors and style" onClick={togglePicker} />
        <MenuItem icon={Lock} label="Change Password" desc="Update your login password" onClick={() => setShowChangePw(true)} />
      </div>

      <div className="card-white p-3 space-y-2">
        <MenuItem icon={LogOut} label="Log Out" desc="Sign out of your account" onClick={signOut} />
      </div>

      <p className="text-center text-[10px] text-slate-400 pt-4">FinTrack v1.0 &middot; Built with Next.js + Supabase</p>

      {/* Change Password Modal */}
      {showChangePw && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end md:items-center justify-center modal-backdrop" onClick={() => setShowChangePw(false)}>
          <div className="bg-white w-full md:w-[400px] md:rounded-3xl rounded-t-3xl p-6 pb-8 mb-16 md:mb-0 space-y-4 modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-900">Change Password</h2>
            {pwMsg && <p className={`text-xs px-3 py-2 rounded-2xl ${pwMsg.includes('success') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{pwMsg}</p>}
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password (min 6 chars)" className="input-tinted w-full" autoFocus />
            <div className="flex gap-3">
              <button onClick={() => setShowChangePw(false)} className="flex-1 btn-pill border text-slate-600" style={{ borderColor: '#e2e8f0' }}>Cancel</button>
              <button onClick={handleChangePassword} className="flex-1 btn-pill text-white" style={{ backgroundColor: theme.primary }}>Change Password</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end md:items-center justify-center modal-backdrop" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white w-full md:w-[400px] md:rounded-3xl rounded-t-3xl p-6 pb-8 mb-16 md:mb-0 space-y-4 modal-content" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3"><Trash2 size={24} className="text-red-500" /></div>
              <h2 className="text-lg font-bold text-slate-900">Delete Account</h2>
              <p className="text-xs text-slate-500 mt-2">Are you sure? This will permanently delete all your data including transactions, budgets, goals, and income records.</p>
              <p className="text-xs text-red-500 font-semibold mt-2">This action cannot be undone.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 btn-pill border text-slate-600" style={{ borderColor: '#e2e8f0' }}>Cancel</button>
              <button onClick={handleDeleteAccount} disabled={deleting} className="flex-1 btn-pill text-white bg-red-500">{deleting ? 'Deleting...' : 'Yes, Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
