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
    <div style={{ minHeight: '100vh', background: 'var(--bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative', overflow: 'hidden' }}>
      
      {/* Soft background blobs */}
      <div style={{ position: 'absolute', top: -100, left: -100, width: 400, height: 400, background: 'var(--accent-blue-light)', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.6 }} />
      <div style={{ position: 'absolute', bottom: -100, right: -100, width: 400, height: 400, background: 'var(--accent-blue-light)', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.6 }} />

      <div style={{ width: '100%', maxWidth: 400, background: 'var(--bg-float)', borderRadius: 28, padding: '40px 32px', boxShadow: 'var(--shadow-float)', border: '1px solid var(--border-light)', backdropFilter: 'blur(20px)', position: 'relative', zIndex: 10 }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 16, background: 'var(--accent-blue)', color: 'white', marginBottom: 20, boxShadow: '0 8px 24px rgba(77,124,255,0.3)' }}>
            <Rocket size={24} />
          </div>
          <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
            {isLogin ? 'Welcome back' : 'Create account'}
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)' }}>
            {isLogin ? 'Sign in to continue your journey.' : 'Start forging your goals today.'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {authError && (
            <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
              {authError}
            </div>
          )}
          {message && (
            <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', color: '#22c55e', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
              {message}
            </div>
          )}

          {!isLogin && (
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Full Name</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid transparent', borderRadius: 14, padding: '14px 16px', fontSize: 15, fontWeight: 500, color: 'var(--text-main)', outline: 'none', transition: 'all 0.2s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}
                onFocus={e => { e.target.style.background = 'var(--bg-card)'; e.target.style.borderColor = 'var(--border-med)'; e.target.style.boxShadow = '0 0 0 4px var(--accent-blue-light)'; }}
                onBlur={e => { e.target.style.background = 'var(--bg-input)'; e.target.style.borderColor = 'transparent'; e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.02)'; }}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid transparent', borderRadius: 14, padding: '14px 16px', fontSize: 15, fontWeight: 500, color: 'var(--text-main)', outline: 'none', transition: 'all 0.2s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}
              onFocus={e => { e.target.style.background = 'var(--bg-card)'; e.target.style.borderColor = 'var(--border-med)'; e.target.style.boxShadow = '0 0 0 4px var(--accent-blue-light)'; }}
              onBlur={e => { e.target.style.background = 'var(--bg-input)'; e.target.style.borderColor = 'transparent'; e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.02)'; }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid transparent', borderRadius: 14, padding: '14px 44px 14px 16px', fontSize: 15, fontWeight: 500, color: 'var(--text-main)', outline: 'none', transition: 'all 0.2s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}
                onFocus={e => { e.target.style.background = 'var(--bg-card)'; e.target.style.borderColor = 'var(--border-med)'; e.target.style.boxShadow = '0 0 0 4px var(--accent-blue-light)'; }}
                onBlur={e => { e.target.style.background = 'var(--bg-input)'; e.target.style.borderColor = 'transparent'; e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.02)'; }}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex' }}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: '16px', borderRadius: 14, background: 'var(--accent-blue)', color: 'white', border: 'none', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s', boxShadow: '0 4px 14px rgba(77,124,255,0.3)', opacity: loading ? 0.7 : 1 }}
            onMouseEnter={e => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={e => !loading && (e.currentTarget.style.transform = 'none')}
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)' }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button type="button" onClick={() => { setIsLogin(!isLogin); setAuthError(''); setMessage(''); }}
              style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', fontWeight: 700, cursor: 'pointer', padding: 0, fontSize: 14 }}>
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
      
      <p style={{ position: 'absolute', bottom: 20, textAlign: 'center', width: '100%', fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
        Secured by Supabase Auth • No spam, ever.
      </p>
    </div>
  );
};
