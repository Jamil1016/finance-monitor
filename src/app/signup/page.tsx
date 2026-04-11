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
  const { signUp } = useAuth();

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
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-4"><span className="text-3xl">📊</span></div>
          <h1 className="text-3xl font-bold text-white"><span className="text-white/80">Fin</span>Track</h1>
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
        </form>
      </div>
    </div>
  );
}
