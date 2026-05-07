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
  const { signIn, signUp, signInWithGoogle, signInWithGithub, resetPassword, loading } = useAuth();
  const [authError, setAuthError] = useState('');
  const [message, setMessage] = useState('');
  const [socialLoading, setSocialLoading] = useState('');

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

  const handleGoogleSignIn = async () => {
    setSocialLoading('google');
    setAuthError(''); setMessage('');
    const { error } = await signInWithGoogle();
    if (error) setAuthError(error.message);
    setSocialLoading('');
  };

  const handleGithubSignIn = async () => {
    setSocialLoading('github');
    setAuthError(''); setMessage('');
    const { error } = await signInWithGithub();
    if (error) setAuthError(error.message);
    setSocialLoading('');
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

        {/* Social Login Buttons */}
        {!isForgot && (
          <div className="flex flex-col gap-3 mb-6">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={!!socialLoading}
              className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-text-main text-sm font-black uppercase tracking-wider flex items-center justify-center gap-3 hover:bg-white/10 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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

            <button
              type="button"
              onClick={handleGithubSignIn}
              disabled={!!socialLoading}
              className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-text-main text-sm font-black uppercase tracking-wider flex items-center justify-center gap-3 hover:bg-white/10 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {socialLoading === 'github' ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  Continue with GitHub
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
        
        {/* Left Side Frame: Neural Interface Title Frame & Social Logins */}
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

          {/* Left Panel Body: Social buttons or instruction info */}
          {isForgot ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center text-accent-blue animate-pulse">
                <KeyRound size={20} />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black text-text-main uppercase tracking-wider">RECOVERY PORT MODULE</p>
                <p className="text-xs text-text-muted max-w-[200px] leading-relaxed mx-auto">
                  Authentication bypass protocol. Reset request is processed on the right verification terminal.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center gap-4 py-6">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={!!socialLoading}
                className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-text-main text-sm font-black uppercase tracking-wider flex items-center justify-center gap-3 hover:bg-white/10 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
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

              <button
                type="button"
                onClick={handleGithubSignIn}
                disabled={!!socialLoading}
                className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-text-main text-sm font-black uppercase tracking-wider flex items-center justify-center gap-3 hover:bg-white/10 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
              >
                {socialLoading === 'github' ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    Continue with GitHub
                  </>
                )}
              </button>
            </div>
          )}

          <div className="text-center text-[10px] font-black text-text-muted uppercase tracking-[0.25em] opacity-40">
            Secure OAuth Protocol
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
              disabled={loading || !!socialLoading}
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
