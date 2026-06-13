import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Rocket, Eye, EyeOff, Loader2, Mail, KeyRound, AlertTriangle } from 'lucide-react';

export const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgot, setIsForgot] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signUp, signInWithGoogle, resetPassword, loading, signingIn, authError: contextAuthError, setAuthError: clearContextError } = useAuth();
  const [authError, setAuthError] = useState('');
  const [message, setMessage] = useState('');
  const [socialLoading, setSocialLoading] = useState('');

  // Combine local + context errors — context error wins (it has Firebase error codes)
  const displayError = contextAuthError || authError;

  const isAndroidAPK = typeof window !== 'undefined' && (
    !!window.Capacitor || 
    navigator.userAgent.includes('wv') || 
    (navigator.userAgent.includes('Android') && !navigator.userAgent.includes('Chrome'))
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError(''); setMessage('');

    if (isForgot) {
      const { error } = await resetPassword(email);
      if (error) setAuthError(error.message);
      else setMessage('Password reset email sent! Check your inbox.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setAuthError('Invalid email format.');
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

  const handleGoogleSignIn = async () => {
    setSocialLoading('google');
    setAuthError('');
    if (clearContextError) clearContextError(null);
    setMessage('');
    // For web: signInWithPopup returns when the popup closes (success or cancel)
    // For mobile: signInWithRedirect navigates away — this line won't continue
    const { error } = await signInWithGoogle();
    if (error) setAuthError(error.message);
    setSocialLoading(''); // Only reaches here on web (popup resolved)
  };

  // Show full-screen redirect loading overlay while Google redirects
  if (signingIn || socialLoading === 'google') {
    return (
      <div className="min-h-screen bg-bg-app flex flex-col items-center justify-center gap-6 font-inter">
        <div className="absolute w-80 h-80 rounded-full bg-accent-blue/15 blur-[40px] animate-pulse" />
        <div className="relative w-[120px] h-[120px]">
          <div className="absolute inset-0 rounded-full border-[1.5px] border-accent-blue/20 animate-[spin_3s_linear_infinite]">
            <div className="absolute top-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-accent-blue shadow-[0_0_12px_rgba(77,124,255,0.8)]" />
          </div>
          <div className="absolute inset-4 rounded-full border border-indigo-400/10 animate-[spin_5s_linear_infinite_reverse]">
            <div className="absolute bottom-[-3px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-indigo-400" />
          </div>
          <div className="absolute inset-[30px] rounded-2xl bg-linear-to-br from-accent-blue to-indigo-400 flex items-center justify-center shadow-lg shadow-accent-blue/40">
            <svg width="28" height="28" viewBox="0 0 48 48"><path fill="#ffffff" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#ffffffcc" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#ffffffaa" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#ffffff88" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          </div>
        </div>
        <div className="text-center relative z-10">
          <h2 className="text-xl font-black text-text-main tracking-tighter">Connecting to Google</h2>
          <p className="text-xs font-bold text-text-muted uppercase tracking-[0.2em] mt-1 animate-pulse">Redirecting to Google Sign-In...</p>
        </div>
      </div>
    );
  }





  return (
    <main
      aria-label="Sign in to GoalForge"
      className="min-h-screen bg-bg-app flex items-center justify-center p-6 md:p-12 lg:p-16 relative overflow-hidden font-inter"
    >
      {/* Cinematic background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] aspect-square bg-accent-blue/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] aspect-square bg-accent-blue/5 rounded-full blur-[120px]" />

      {/* MOBILE / APP VIEW (Single card container) */}
      <div className="lg:hidden w-full max-w-md bg-bg-card/70 backdrop-blur-2xl rounded-[40px] p-10 md:p-12 shadow-2xl border border-border-light animate-in fade-in zoom-in-95 duration-500 relative z-10">
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

        {/* Social Login Buttons */}
        {!isForgot && (
          <div className="flex flex-col gap-3 mb-6 animate-in fade-in duration-500">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading || !!socialLoading}
              className="w-full py-4 rounded-2xl bg-bg-input border border-border-med text-text-main text-sm font-black uppercase tracking-wider flex items-center justify-center gap-3 hover:bg-bg-input/80 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {socialLoading === 'google' ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                  Continue with Google
                </>
              )}
            </button>
          </div>
        )}

        {/* Divider */}
        {!isForgot && (
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-[1px] bg-border-light" />
            <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Or with email</span>
            <div className="flex-1 h-[1px] bg-border-light" />
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {displayError && (
            <div role="alert" className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold text-center tracking-wide animate-in fade-in slide-in-from-top-2 flex items-start gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" aria-hidden="true" />
              <span>{displayError}</span>
            </div>
          )}
          {message && (
            <div role="status" className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-black text-center uppercase tracking-widest animate-in fade-in slide-in-from-top-2">
              {message}
            </div>
          )}

          {!isLogin && !isForgot && (
            <div className="space-y-1.5">
              <label htmlFor="mobile-signup-name" className="text-[10px] font-black text-text-muted uppercase tracking-widest px-1">Full Name</label>
              <input
                id="mobile-signup-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Agent Name"
                autoComplete="name"
                className="w-full bg-bg-input/50 border border-border-light rounded-xl px-4 py-4 text-sm font-bold text-text-main outline-hidden focus:border-accent-blue focus:ring-4 focus:ring-accent-blue/10 transition-all placeholder:text-text-muted/30"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="mobile-email" className="text-[10px] font-black text-text-muted uppercase tracking-widest px-1">
              {isForgot ? 'Your Email' : 'Email Terminal'}
            </label>
            <div className="relative">
              <input
                id="mobile-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@forge.com"
                autoComplete="email"
                className="w-full bg-bg-input/50 border border-border-light rounded-xl px-4 py-4 pr-12 text-sm font-bold text-text-main outline-hidden focus:border-accent-blue focus:ring-4 focus:ring-accent-blue/10 transition-all placeholder:text-text-muted/30"
              />
              <Mail size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted/30" aria-hidden="true" />
            </div>
          </div>

          {!isForgot && (
            <div className="space-y-1.5">
              <label htmlFor="mobile-password" className="text-[10px] font-black text-text-muted uppercase tracking-widest px-1">Password</label>
              <div className="relative">
                <input
                  id="mobile-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  className="w-full bg-bg-input/50 border border-border-light rounded-xl px-4 py-4 pr-12 text-sm font-bold text-text-main outline-hidden focus:border-accent-blue focus:ring-4 focus:ring-accent-blue/10 transition-all placeholder:text-text-muted/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-pressed={showPassword}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-controls="mobile-password"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-accent-blue transition-colors p-1"
                >
                  {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
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
            disabled={loading}
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
        <div className="flex-1 bg-bg-card/70 backdrop-blur-2xl rounded-[40px] p-10 border border-border-light flex flex-col justify-between shadow-2xl">
          {/* Framed Title Block */}
          <div className="border border-border-light rounded-2xl p-6 bg-bg-input/50 text-center relative overflow-hidden shadow-inner">
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
            {!isForgot && (
              <div className="space-y-4 animate-in fade-in duration-500">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading || !!socialLoading}
                  className="w-full py-4 rounded-2xl bg-bg-input border border-border-med text-text-main text-sm font-black uppercase tracking-wider flex items-center justify-center gap-3 hover:bg-bg-input/80 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                >
                  {socialLoading === 'google' ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                      </svg>
                      Continue with Google
                    </>
                  )}
                </button>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-[1px] bg-border-light" />
                  <span className="text-[9px] font-black text-text-muted/60 uppercase tracking-[0.2em]">Or system info</span>
                  <div className="flex-1 h-[1px] bg-border-light" />
                </div>
              </div>
            )}

            <div className="border border-border-light rounded-2xl p-5 bg-bg-input/20 space-y-3">
              <div className="flex items-center gap-2 text-accent-blue">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-ping" />
                <p className="text-[10px] font-black uppercase tracking-widest">SYSTEM STATUS: READY</p>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                Welcome to GoalForge, your ultimate visual workspace designed to map goals, build high-frequency habits, and monitor real-time discipline.
              </p>
            </div>
          </div>

          <div className="text-center text-[10px] font-black text-text-muted uppercase tracking-[0.25em] opacity-40">
            Encrypted Core Terminal
          </div>
        </div>

        {/* Right Side Frame: Email Authentication Frame Heading & Form */}
        <div className="flex-1 bg-bg-card/70 backdrop-blur-2xl rounded-[40px] p-10 border border-border-light flex flex-col justify-between shadow-2xl">
          {/* Framed Heading Block */}
          <div className="border border-border-light rounded-2xl p-6 bg-bg-input/50 text-center relative overflow-hidden shadow-inner">
            <span className="text-xs font-black text-text-muted uppercase tracking-[0.25em]">
              {isForgot ? 'Security Verification' : 'Email Authentication'}
            </span>
          </div>

          {/* Form wrapper */}
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-center gap-4 py-4">
            {displayError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold text-center tracking-wide animate-in fade-in slide-in-from-top-2 flex items-start gap-2">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>{displayError}</span>
              </div>
            )}
            {message && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-black text-center uppercase tracking-widest animate-in fade-in slide-in-from-top-2">
                {message}
              </div>
            )}

            {!isLogin && !isForgot && (
              <div className="space-y-1">
                <label htmlFor="desktop-signup-name" className="text-[10px] font-black text-text-muted uppercase tracking-widest px-1">Full Name</label>
                <input
                  id="desktop-signup-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Agent Name"
                  autoComplete="name"
                  className="w-full bg-bg-input/50 border border-border-light rounded-xl px-4 py-3 text-sm font-bold text-text-main outline-hidden focus:border-accent-blue focus:ring-4 focus:ring-accent-blue/10 transition-all placeholder:text-text-muted/30"
                />
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="desktop-email" className="text-[10px] font-black text-text-muted uppercase tracking-widest px-1">
                {isForgot ? 'Your Email' : 'Email Terminal'}
              </label>
              <div className="relative">
                <input
                  id="desktop-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@forge.com"
                  autoComplete="email"
                  className="w-full bg-bg-input/50 border border-border-light rounded-xl px-4 py-3 pr-12 text-sm font-bold text-text-main outline-hidden focus:border-accent-blue focus:ring-4 focus:ring-accent-blue/10 transition-all placeholder:text-text-muted/30"
                />
                <Mail size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted/30" aria-hidden="true" />
              </div>
            </div>

            {!isForgot && (
              <div className="space-y-1">
                <label htmlFor="desktop-password" className="text-[10px] font-black text-text-muted uppercase tracking-widest px-1">Password</label>
                <div className="relative">
                  <input
                    id="desktop-password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    minLength={6}
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    className="w-full bg-bg-input/50 border border-border-light rounded-xl px-4 py-3 pr-12 text-sm font-bold text-text-main outline-hidden focus:border-accent-blue focus:ring-4 focus:ring-accent-blue/10 transition-all placeholder:text-text-muted/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-pressed={showPassword}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-controls="desktop-password"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-accent-blue transition-colors p-1"
                  >
                    {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
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
    </main>
  );
};
