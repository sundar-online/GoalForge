import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Rocket, Eye, EyeOff, Loader2 } from 'lucide-react';

export const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signUp, error, loading } = useAuth();
  const [authError, setAuthError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError(''); setMessage('');
    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) setAuthError(error.message);
    } else {
      const { data, error } = await signUp(email, password, name);
      if (error) { setAuthError(error.message); }
      else if (data?.user && data?.session === null) {
        setMessage('Check your email for the confirmation link!');
      }
    }
  };

  return (
    <div className="min-h-screen bg-bg-app flex items-center justify-center p-6 relative overflow-hidden font-inter">
      
      {/* Cinematic background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] aspect-square bg-accent-blue/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] aspect-square bg-accent-blue/5 rounded-full blur-[120px]" />

      <div className="w-full max-w-md bg-bg-card/70 backdrop-blur-2xl rounded-[40px] p-10 md:p-12 shadow-2xl border border-white/10 relative z-10 animate-in fade-in zoom-in-95 duration-500">
        
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent-blue text-white mb-6 shadow-lg shadow-accent-blue/40 ring-4 ring-accent-blue/10">
            <Rocket size={28} className="animate-bounce" />
          </div>
          <h1 className="text-3xl font-black text-text-main tracking-tighter mb-2">
            {isLogin ? 'Neural Interface' : 'Initialize Protocol'}
          </h1>
          <p className="text-sm font-bold text-text-muted uppercase tracking-[0.2em] opacity-60">
            {isLogin ? 'Resuming Data Sync' : 'Creating New Identity'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <AnimatePresence mode="wait">
            {authError && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-black text-center uppercase tracking-widest"
              >
                {authError}
              </motion.div>
            )}
            {message && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-black text-center uppercase tracking-widest"
              >
                {message}
              </motion.div>
            )}
          </AnimatePresence>

          {!isLogin && (
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
            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest px-1">Email Terminal</label>
            <input 
              type="email" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@forge.com"
              className="w-full bg-bg-input/50 border border-border-light rounded-xl px-4 py-4 text-sm font-bold text-text-main outline-hidden focus:border-accent-blue focus:ring-4 focus:ring-accent-blue/10 transition-all placeholder:text-text-muted/30"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest px-1">Encryption Key</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-5 rounded-2xl bg-accent-blue text-white text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-accent-blue/30 hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          >
            {loading ? <Loader2 size={20} className="animate-spin mx-auto" /> : (isLogin ? 'Establish Link' : 'Secure Vault')}
          </button>
        </form>

        <div className="mt-10 text-center">
          <p className="text-xs font-bold text-text-muted">
            {isLogin ? "New user? " : "Existing agent? "}
            <button 
              type="button" 
              onClick={() => { setIsLogin(!isLogin); setAuthError(''); setMessage(''); }}
              className="text-accent-blue font-black hover:underline underline-offset-4 ml-1"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
      
      <p className="absolute bottom-8 text-center w-full text-[10px] font-black text-text-muted uppercase tracking-[0.3em] opacity-40">
        Secured by Forge-Sync Protocol
      </p>
    </div>
  );
};
