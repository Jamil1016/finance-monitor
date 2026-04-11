'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Eye, EyeOff, LogIn } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    const { error } = await signIn(email, password);
    if (error) { setError(error); setLoading(false); } else { router.push('/'); }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #00D09C 0%, #00916D 50%, #F0FDF9 50%)' }}>
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo.png" alt="FinTrack" className="w-40 mx-auto" />
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white rounded-3xl p-6 space-y-4 shadow-xl">
          <h2 className="text-xl font-bold text-slate-900 text-center">Welcome</h2>

          {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-2xl">{error}</div>}

          <div>
            <label className="text-xs font-medium text-slate-500">Username Or Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="example@example.com"
              className="input-tinted w-full mt-1" required />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500">Password</label>
            <div className="relative mt-1">
              <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Your password" className="input-tinted w-full pr-10" required />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-3 text-slate-400">
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full btn-pill text-white flex items-center justify-center gap-2"
            style={{ backgroundColor: '#00D09C' }}>
            {loading ? 'Signing in...' : <><LogIn size={16} /> Log In</>}
          </button>

          <p className="text-center text-xs text-slate-400">
            Forgot Password? <Link href="/signup" className="font-semibold" style={{ color: '#00D09C' }}>Sign Up</Link>
          </p>

          <div className="flex items-center gap-3 pt-2">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[10px] text-slate-400">or sign up with</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <div className="flex justify-center gap-4">
            {['🔵', '🟢', '🍎'].map((e, i) => (
              <button key={i} type="button" className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-lg hover:bg-slate-50">{e}</button>
            ))}
          </div>
        </form>
      </div>
    </div>
  );
}
