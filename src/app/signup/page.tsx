'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Eye, EyeOff, UserPlus } from 'lucide-react';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp, signInWithProvider } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    const { error } = await signUp(email, password, name);
    setLoading(false);
    if (error) { setError(error); } else { setSuccess(true); }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(180deg, #00D09C 0%, #00916D 100%)' }}>
        <div className="w-full max-w-sm bg-white rounded-3xl p-8 text-center shadow-xl">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><UserPlus size={28} className="text-green-600" /></div>
          <h2 className="text-xl font-bold text-slate-900">Account Created!</h2>
          <p className="text-sm text-slate-500 mt-2">Check your email to verify, then sign in.</p>
          <Link href="/login" className="mt-6 inline-block btn-pill text-white px-8" style={{ backgroundColor: '#00D09C' }}>Go to Sign In</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #00D09C 0%, #00916D 50%, #F0FDF9 50%)' }}>
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="FinTrack" className="w-40 mx-auto" />
        </div>

        <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white rounded-3xl p-6 space-y-4 shadow-xl">
          <h2 className="text-xl font-bold text-slate-900 text-center">Create Account</h2>
          {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-2xl">{error}</div>}

          <div>
            <label className="text-xs font-medium text-slate-500">Full Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="example@example.com" className="input-tinted w-full mt-1" required />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="example@example.com" className="input-tinted w-full mt-1" required />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Password</label>
            <div className="relative mt-1">
              <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" className="input-tinted w-full pr-10" required minLength={6} />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-3 text-slate-400">{showPw ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full btn-pill text-white flex items-center justify-center gap-2" style={{ backgroundColor: '#00D09C' }}>
            {loading ? 'Creating...' : <><UserPlus size={16} /> Sign Up</>}
          </button>

          <p className="text-center text-xs text-slate-400">
            Already have an account? <Link href="/login" className="font-semibold" style={{ color: '#00D09C' }}>Sign In</Link>
          </p>

          <div className="flex items-center gap-3 pt-2">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[10px] text-slate-400">or sign up with</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <div className="flex justify-center gap-3">
            <button type="button" onClick={() => signInWithProvider('google')} className="flex-1 h-11 rounded-xl border border-slate-200 flex items-center justify-center gap-2 hover:bg-slate-50 text-xs font-medium text-slate-600">
              <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Google
            </button>
            <button type="button" onClick={() => signInWithProvider('facebook')} className="flex-1 h-11 rounded-xl border border-slate-200 flex items-center justify-center gap-2 hover:bg-slate-50 text-xs font-medium text-slate-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              Facebook
            </button>
            <button type="button" onClick={() => signInWithProvider('github')} className="flex-1 h-11 rounded-xl border border-slate-200 flex items-center justify-center gap-2 hover:bg-slate-50 text-xs font-medium text-slate-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#333"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
              GitHub
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
