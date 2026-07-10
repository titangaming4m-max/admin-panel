import React, { useState } from 'react';

interface AdminLoginProps {
  onLogin: (password: string) => void;
}

export default function AdminLogin({ onLogin }: AdminLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulate database lookup & encryption check
    setTimeout(() => {
      if (username === 'admin' && password === 'admin123') {
        onLogin(password);
      } else {
        setError('Invalid username or password. (Default: admin / admin123)');
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col gap-6">
        
        {/* Logo and Greeting */}
        <div className="text-center flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-2xl bg-[#22c55e] flex items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-green-900/30">
            ZH
          </div>
          <h2 className="text-white font-black text-2xl tracking-tight uppercase mt-2">
            ZYRO HUB™ ADMIN
          </h2>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
            Secure Control Center Login
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold p-3.5 rounded-xl flex items-center gap-2">
              <i className="fa-solid fa-circle-exclamation"></i>
              <span>{error}</span>
            </div>
          )}

          {/* Username Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">
              Admin Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <i className="fa-solid fa-user text-xs"></i>
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-9 pr-4 text-white text-sm font-medium focus:outline-none focus:border-green-500 transition-colors"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                Password
              </label>
              <span className="text-[10px] text-slate-500 font-semibold cursor-help hover:text-slate-400">
                Forgot?
              </span>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <i className="fa-solid fa-lock text-xs"></i>
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-9 pr-4 text-white text-sm font-medium focus:outline-none focus:border-green-500 transition-colors"
              />
            </div>
          </div>

          {/* Remember and Remember Me toggles */}
          <div className="flex items-center justify-between py-1">
            <label className="flex items-center gap-2 text-slate-400 text-xs font-semibold cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-800 bg-slate-950 text-green-500 focus:ring-0 focus:ring-offset-0"
              />
              <span>Remember Login</span>
            </label>
            <span className="text-emerald-500 font-extrabold text-[10px] uppercase tracking-widest flex items-center gap-1 select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Encrypted</span>
            </span>
          </div>

          {/* Login Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#22c55e] hover:bg-[#1fbd58] disabled:bg-emerald-800 text-white font-bold text-xs uppercase tracking-wider py-4 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-green-950/20 cursor-pointer active:scale-[0.99] transition-all"
          >
            {loading ? (
              <>
                <i className="fa-solid fa-spinner animate-spin text-sm"></i>
                <span>Verifying Session...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-shield-halved text-xs"></i>
                <span>Access Dashboard</span>
              </>
            )}
          </button>
        </form>

        {/* Demo Help Watermark */}
        <div className="text-center mt-2">
          <p className="text-[10px] text-slate-600 font-semibold uppercase tracking-wider leading-relaxed">
            Authorized admin access only.<br/>
            All sessions are monitored and encrypted.
          </p>
        </div>

      </div>
    </div>
  );
}
