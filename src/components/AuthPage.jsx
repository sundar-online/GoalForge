import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Rocket, Eye, EyeOff, Loader2, Mail, KeyRound } from 'lucide-react';

export const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgot, setIsForgot] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signUp, resetPassword, loading } = useAuth();
  const [authError, setAuthError] = useState('');
  const [message, setMessage] = useState('');


  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError(''); setMessage('');

    if (isForgot) {
      const { error } = await resetPassword(email);
      if (error) setAuthError(error.message);
      else setMessage('Password reset email sent! Check your inbox.');
      return;
    }

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) setAuthError(error.message);
    } else {
      if (password.length < 6) {
        setAuthError('Password must be at least 6 characters.');
        return;
      }
      const { error } = await signUp(email, password, name);
      if (error) setAuthError(error.message);
    }
  };





  return (
    <div className="min-h-screen bg-bg-app flex items-center justify-center p-6 md:p-12 lg:p-16 relative overflow-hidden font-inter">
      {/* Cinematic background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] aspect-square bg-accent-blue/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] aspect-square bg-accent-blue/5 rounded-full blur-[120px]" />

      {/* MOBILE / APP VIEW (Single card container) */}
      <div className="lg:hidden w-full max-w-md bg-bg-card/70 backdrop-blur-2xl rounded-[40px] p-10 md:p-12 shadow-2xl border border-white/10 animate-in fade-in zoom-in-95 duration-500 relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent-blue text-white mb-6 shadow-lg shadow-accent-blue/40 ring-4 ring-accent-blue/10">
            <Rocket size={28} className="animate-bounce" />
          </div>
          <h1 className="text-3xl font-black text-text-main tracking-tighter mb-2">
            {isForgot ? 'Reset Password' : isLogin ? 'Neural Interface' : 'Initialize Protocol'}
          </h1>
          <p className="text-sm font-bold text-text-muted uppercase tracking-[0.2em] opacity-60">
            {isForgot ? 'Enter your email below' : isLogin ? 'Resuming Data Sync' : 'Creating New Identity'}
          </p>
        </div>



        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {authError && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-black text-center uppercase tracking-widest animate-in fade-in slide-in-from-top-2">
              {authError}
            </div>
          )}
          {message && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-black text-center uppercase tracking-widest animate-in fade-in slide-in-from-top-2">
              {message}
            </div>
          )}

          {!isLogin && !isForgot && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-widest px-1">Full Name</label>
              <input 
                type="text" 
                required 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                placeholder="Agent Name"
                className="w-full bg-bg-input/50 border border-border-light rounded-xl px-4 py-4 text-sm font-bold text-text-main outline-hidden focus:border-accent-blue focus:ring-4 focus:ring-accent-blue/10 transition-all placeholder:text-text-muted/30"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest px-1">
              {isForgot ? 'Your Email' : 'Email Terminal'}
            </label>
            <div className="relative">
              <input 
                type="email" 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@forge.com"
                className="w-full bg-bg-input/50 border border-border-light rounded-xl px-4 py-4 pr-12 text-sm font-bold text-text-main outline-hidden focus:border-accent-blue focus:ring-4 focus:ring-accent-blue/10 transition-all placeholder:text-text-muted/30"
              />
              <Mail size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted/30" />
            </div>
          </div>

          {!isForgot && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-widest px-1">Encryption Key</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  required 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  className="w-full bg-bg-input/50 border border-border-light rounded-xl px-4 py-4 pr-12 text-sm font-bold text-text-main outline-hidden focus:border-accent-blue focus:ring-4 focus:ring-accent-blue/10 transition-all placeholder:text-text-muted/30"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-accent-blue transition-colors p-1"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}

          {isLogin && !isForgot && (
            <div className="text-right -mt-2">
              <button
                type="button"
                onClick={() => { setIsForgot(true); setAuthError(''); setMessage(''); }}
                className="text-xs font-bold text-accent-blue hover:underline underline-offset-4 cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading || !!socialLoading}
            className="w-full py-5 rounded-2xl bg-accent-blue text-white text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-accent-blue/30 hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : isForgot ? (
              <>
                <KeyRound size={16} />
                Send Reset Link
              </>
            ) : isLogin ? (
              'Establish Link'
            ) : (
              'Secure Vault'
            )}
          </button>
        </form>

        <div className="mt-8 text-center space-y-3">
          {isForgot ? (
            <p className="text-xs font-bold text-text-muted">
              Remember your password?{' '}
              <button 
                type="button" 
                onClick={() => { setIsForgot(false); setAuthError(''); setMessage(''); }}
                className="text-accent-blue font-black hover:underline underline-offset-4 ml-1 cursor-pointer"
              >
                Sign in
              </button>
            </p>
          ) : (
            <p className="text-xs font-bold text-text-muted">
              {isLogin ? "New user? " : "Existing agent? "}
              <button 
                type="button" 
                onClick={() => { setIsLogin(!isLogin); setAuthError(''); setMessage(''); }}
                className="text-accent-blue font-black hover:underline underline-offset-4 ml-1 cursor-pointer"
              >
                {isLogin ? "Sign up" : "Sign in"}
              </button>
            </p>
          )}
        </div>
      </div>

      {/* DESKTOP / WEB VIEW (Side-by-side no-scroll panels) */}
      <div className="hidden lg:flex lg:flex-row lg:gap-8 lg:max-w-4xl lg:w-full lg:items-stretch lg:justify-center animate-in fade-in zoom-in-95 duration-500 relative z-10">
        
        {/* Left Side Frame: Neural Interface Title Frame & Secure Stats */}
        <div className="flex-1 bg-bg-card/70 backdrop-blur-2xl rounded-[40px] p-10 border border-white/10 flex flex-col justify-between shadow-2xl">
          {/* Framed Title Block */}
          <div className="border border-white/10 rounded-2xl p-6 bg-white/5 text-center relative overflow-hidden shadow-inner">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent-blue text-white mb-4 shadow-lg shadow-accent-blue/40">
              <Rocket size={22} className="animate-bounce" />
            </div>
            <h1 className="text-2xl font-black text-text-main tracking-tighter mb-1.5">
              {isForgot ? 'Reset Password' : isLogin ? 'Neural Interface' : 'Initialize Protocol'}
            </h1>
            <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] opacity-85">
              {isForgot ? 'Enter your email below' : isLogin ? 'Resuming Data Sync' : 'Creating New Identity'}
            </p>
          </div>

          {/* Left Panel Body: Cinematic instructions for full encryption */}
          <div className="flex-1 flex flex-col justify-center space-y-6 py-6 px-2">
            <div className="border border-white/5 rounded-2xl p-5 bg-white/[0.02] space-y-3">
              <div className="flex items-center gap-2 text-accent-blue">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-ping" />
                <p className="text-[10px] font-black uppercase tracking-widest">SYSTEM STATUS: READY</p>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                Welcome to GoalForge, your ultimate visual workspace designed to map goals, build high-frequency habits, and monitor real-time discipline.
              </p>
            </div>

            <div className="border border-white/5 rounded-2xl p-5 bg-white/[0.02] space-y-3">
              <div className="flex items-center gap-2 text-text-muted">
                <span className="w-1.5 h-1.5 rounded-full bg-text-muted/60" />
                <p className="text-[10px] font-black uppercase tracking-widest">ENCRYPTED IDENTITY</p>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                We safeguard your progress. Log in using your secure email credentials to seamlessly sync stats directly across your browser and native mobile applications.
              </p>
            </div>
          </div>

          <div className="text-center text-[10px] font-black text-text-muted uppercase tracking-[0.25em] opacity-40">
            Encrypted Core Terminal
          </div>
        </div>

        {/* Right Side Frame: Email Authentication Frame Heading & Form */}
        <div className="flex-1 bg-bg-card/70 backdrop-blur-2xl rounded-[40px] p-10 border border-white/10 flex flex-col justify-between shadow-2xl">
          {/* Framed Heading Block */}
          <div className="border border-white/10 rounded-2xl p-6 bg-white/5 text-center relative overflow-hidden shadow-inner">
            <span className="text-xs font-black text-text-muted uppercase tracking-[0.25em]">
              {isForgot ? 'Security Verification' : 'Email Authentication'}
            </span>
          </div>

          {/* Form wrapper */}
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-center gap-4 py-4">
            {authError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-black text-center uppercase tracking-widest animate-in fade-in slide-in-from-top-2">
                {authError}
              </div>
            )}
            {message && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-black text-center uppercase tracking-widest animate-in fade-in slide-in-from-top-2">
                {message}
              </div>
            )}

            {!isLogin && !isForgot && (
              <div className="space-y-1">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest px-1">Full Name</label>
                <input 
                  type="text" 
                  required 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Agent Name"
                  className="w-full bg-bg-input/50 border border-border-light rounded-xl px-4 py-3 text-sm font-bold text-text-main outline-hidden focus:border-accent-blue focus:ring-4 focus:ring-accent-blue/10 transition-all placeholder:text-text-muted/30"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-widest px-1">
                {isForgot ? 'Your Email' : 'Email Terminal'}
              </label>
              <div className="relative">
                <input 
                  type="email" 
                  required 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@forge.com"
                  className="w-full bg-bg-input/50 border border-border-light rounded-xl px-4 py-3 pr-12 text-sm font-bold text-text-main outline-hidden focus:border-accent-blue focus:ring-4 focus:ring-accent-blue/10 transition-all placeholder:text-text-muted/30"
                />
                <Mail size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted/30" />
              </div>
            </div>

            {!isForgot && (
              <div className="space-y-1">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest px-1">Encryption Key</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    minLength={6}
                    className="w-full bg-bg-input/50 border border-border-light rounded-xl px-4 py-3 pr-12 text-sm font-bold text-text-main outline-hidden focus:border-accent-blue focus:ring-4 focus:ring-accent-blue/10 transition-all placeholder:text-text-muted/30"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-accent-blue transition-colors p-1"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {isLogin && !isForgot && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => { setIsForgot(true); setAuthError(''); setMessage(''); }}
                  className="text-xs font-bold text-accent-blue hover:underline underline-offset-4 cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4 rounded-xl bg-accent-blue text-white text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-accent-blue/30 hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer mt-1"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : isForgot ? (
                <>
                  <KeyRound size={16} />
                  Send Reset Link
                </>
              ) : isLogin ? (
                'Establish Link'
              ) : (
                'Secure Vault'
              )}
            </button>
          </form>

          {/* Switch Switcher Link */}
          <div className="text-center pt-2">
            {isForgot ? (
              <p className="text-xs font-bold text-text-muted">
                Remember your password?{' '}
                <button 
                  type="button" 
                  onClick={() => { setIsForgot(false); setAuthError(''); setMessage(''); }}
                  className="text-accent-blue font-black hover:underline underline-offset-4 ml-1 cursor-pointer"
                >
                  Sign in
                </button>
              </p>
            ) : (
              <p className="text-xs font-bold text-text-muted">
                {isLogin ? "New user? " : "Existing agent? "}
                <button 
                  type="button" 
                  onClick={() => { setIsLogin(!isLogin); setAuthError(''); setMessage(''); }}
                  className="text-accent-blue font-black hover:underline underline-offset-4 ml-1 cursor-pointer"
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </button>
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
