import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, googleProvider } from '../lib/firebase';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithRedirect,
  signInWithPopup,
  getRedirectResult,
  signOut as firebaseSignOut,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { upsertUserProfile } from '../lib/firebaseDb';
import { Capacitor } from '@capacitor/core';

// ─────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────
const REDIRECT_KEY = 'gf_google_redirect_ts'; // localStorage key for redirect guard

const AuthContext = createContext(null);

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────
function normalizeUser(fbUser) {
  if (!fbUser) return null;
  return {
    id: fbUser.uid,
    uid: fbUser.uid,
    email: fbUser.email,
    displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
    photoURL: fbUser.photoURL,
    user_metadata: { full_name: fbUser.displayName },
  };
}

// ─────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────
export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    let alive = true;

    const boot = async () => {
      const isNative = Capacitor.isNativePlatform();

      // On desktop web, we never use redirect auth, so we don't await getRedirectResult.
      // Clean up any legacy redirect timestamp if it exists.
      if (!isNative) {
        localStorage.removeItem(REDIRECT_KEY);
      }

      // ── Was a Google redirect in progress? ──────────────────────────────
      // We store a timestamp in localStorage before calling signInWithRedirect.
      // localStorage survives page navigation (unlike sessionStorage which can
      // be cleared on cross-origin hops in some browsers).
      const redirectPending = isNative && !!localStorage.getItem(REDIRECT_KEY);

      if (redirectPending) {
        // MUST process the redirect result BEFORE setting up onAuthStateChanged.
        // If we set up the listener first, it may fire with null before
        // getRedirectResult() has had a chance to establish the auth session.
        console.log('[Auth] Redirect return detected — awaiting getRedirectResult...');
        try {
          const result = await getRedirectResult(auth);
          if (result?.user) {
            console.log('[Auth] ✓ Redirect sign-in complete:', result.user.uid);
          } else {
            console.warn('[Auth] getRedirectResult returned null (redirect may have been cancelled).');
          }
        } catch (err) {
          console.error('[Auth] getRedirectResult error:', err.code, err.message);
          if (alive) {
            setAuthError(`${firebaseMsg(err.code)} [${err.code || 'unknown'}]`);
          }
        } finally {
          localStorage.removeItem(REDIRECT_KEY);
        }
      }

      if (!alive) return;

      // ── Subscribe to auth state — single source of truth ───────────────
      // By the time we reach here, getRedirectResult (if needed) has already
      // been awaited, so onAuthStateChanged will fire with the FINAL, correct
      // auth state — never an intermediate null from a pending redirect.
      const unsub = onAuthStateChanged(auth, (fbUser) => {
        if (!alive) return;
        console.log('[Auth] onAuthStateChanged →', fbUser ? `✓ ${fbUser.uid}` : '✗ null');
        setUser(normalizeUser(fbUser));
        setLoading(false);

        if (fbUser) {
          upsertUserProfile(fbUser.uid, {
            displayName: fbUser.displayName,
            email: fbUser.email,
            photoURL: fbUser.photoURL,
          }).catch(e => console.warn('[Auth] profile sync (non-critical):', e));
        }
      });

      // Store cleanup
      return unsub;
    };

    // Hold a ref to the unsub fn returned asynchronously
    let unsub = null;
    boot().then(fn => { unsub = fn ?? null; });

    // Safety timeout — prevents infinite loading screen
    const timer = setTimeout(() => {
      if (alive) {
        console.warn('[Auth] Safety timeout — forcing loading=false');
        setLoading(false);
      }
    }, 15000);

    return () => {
      alive = false;
      if (unsub) unsub();
      clearTimeout(timer);
    };
  }, []);

  // ── Email Sign Up ──────────────────────────────────────
  const signUp = async (email, password, fullName) => {
    setAuthError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (fullName) await updateProfile(cred.user, { displayName: fullName });
      return { data: cred, error: null };
    } catch (err) {
      console.log("Project ID:", auth.app.options.projectId);
      console.log("Auth User:", auth.currentUser);
      console.log("Registration Email:", email);
      console.log("Firebase Error:", err);
      const msg = firebaseMsg(err.code);
      setAuthError(msg);
      return { data: null, error: { message: msg } };
    }
  };

  // ── Email Sign In ──────────────────────────────────────
  const signIn = async (email, password) => {
    setAuthError(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      return { data: cred, error: null };
    } catch (err) {
      const msg = firebaseMsg(err.code);
      setAuthError(msg);
      return { data: null, error: { message: msg } };
    }
  };

  // ── Google Sign-In (hybrid popup/redirect) ──────────────────────────────────
  // • Native App (Android/iOS): uses signInWithRedirect
  // • Web Browsers: uses signInWithPopup (ignores third-party cookie blocks on localhost)
  const signInWithGoogle = async () => {
    setAuthError(null);
    setSigningIn(true);

    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      try {
        localStorage.setItem(REDIRECT_KEY, Date.now().toString());
        console.log('[Auth] Native platform detected — using signInWithRedirect...');
        await signInWithRedirect(auth, googleProvider);
      } catch (err) {
        localStorage.removeItem(REDIRECT_KEY);
        setSigningIn(false);
        const msg = firebaseMsg(err.code);
        setAuthError(`${msg} [${err.code || 'unknown'}]`);
        console.error('[Auth] signInWithRedirect error:', err);
        return { data: null, error: { message: msg } };
      }
    } else {
      try {
        console.log('[Auth] Web browser environment detected — using signInWithPopup...');
        const result = await signInWithPopup(auth, googleProvider);
        console.log('[Auth] ✓ Google popup sign-in complete:', result.user.uid);
        setUser(normalizeUser(result.user));
        setSigningIn(false);
        return { data: result, error: null };
      } catch (err) {
        setSigningIn(false);
        if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
          console.warn('[Auth] Google sign-in popup closed by user.');
          return { data: null, error: null };
        }
        const msg = firebaseMsg(err.code);
        setAuthError(`${msg} [${err.code || 'unknown'}]`);
        console.error('[Auth] signInWithPopup error:', err);
        return { data: null, error: { message: msg } };
      }
    }
    return { data: null, error: null };
  };

  // ── Password Reset ─────────────────────────────────────
  const resetPassword = async (email) => {
    setAuthError(null);
    try {
      await sendPasswordResetEmail(auth, email);
      return { error: null };
    } catch (err) {
      const msg = firebaseMsg(err.code);
      setAuthError(msg);
      return { error: { message: msg } };
    }
  };

  // ── Sign Out ───────────────────────────────────────────
  const signOut = async () => {
    try {
      localStorage.removeItem(REDIRECT_KEY);
      await firebaseSignOut(auth);
      setUser(null);
    } catch (err) {
      console.error('[Auth] signOut error:', err);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signingIn,
      authError,
      setAuthError,
      signUp,
      signIn,
      signInWithGoogle,
      resetPassword,
      signOut,
      displayName: user?.displayName || user?.email?.split('@')[0] || 'User',
      isNative: Capacitor.isNativePlatform(),
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

// ─────────────────────────────────────────────────────────
// Firebase error codes → human-readable messages
// ─────────────────────────────────────────────────────────
function firebaseMsg(code) {
  const map = {
    'auth/email-already-in-use':                     'This email is already registered. Try signing in instead.',
    'auth/invalid-email':                            'Please enter a valid email address.',
    'auth/user-disabled':                            'This account has been disabled.',
    'auth/user-not-found':                           'No account found with this email.',
    'auth/wrong-password':                           'Incorrect password. Please try again.',
    'auth/weak-password':                            'Password must be at least 6 characters.',
    'auth/too-many-requests':                        'Too many attempts. Please wait and try again.',
    'auth/popup-closed-by-user':                     'Sign-in popup was closed. Please try again.',
    'auth/popup-blocked':                            'Popup blocked — please allow popups for this site.',
    'auth/cancelled-popup-request':                  'Sign-in was cancelled. Please try again.',
    'auth/account-exists-with-different-credential': 'An account exists with a different sign-in method.',
    'auth/invalid-credential':                       'Invalid credentials. Please try again.',
    'auth/network-request-failed':                   'Network error — please check your connection.',
    'auth/timeout':                                  'Request timed out. Please try again.',
    'auth/unauthorized-domain':                      '🚫 Domain not authorised. Add it in Firebase Console → Authentication → Authorised Domains.',
    'auth/operation-not-allowed':                    'Google sign-in is not enabled in Firebase Console.',
    'auth/internal-error':                           'Firebase internal error. Please try again.',
    'auth/redirect-cancelled-by-user':               'Sign-in was cancelled. Please try again.',
    'auth/redirect-operation-pending':               'A sign-in redirect is already in progress.',
    'auth/web-storage-unsupported':                  'Browser storage is blocked — please enable cookies/storage.',
  };
  return map[code] ?? `Sign-in error (${code ?? 'unknown'}). Please try again.`;
}