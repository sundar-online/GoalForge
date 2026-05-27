import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, googleProvider } from '../lib/firebase';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  browserPopupRedirectResolver,
  signOut as firebaseSignOut,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { upsertUserProfile } from '../lib/firebaseDb';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    // Set a timeout to prevent infinite loading (safety net)
    const loadingTimeout = setTimeout(() => {
      if (loading) {
        console.warn('[Auth] Loading timeout - setting loading to false');
        setLoading(false);
      }
    }, 5000); // 5 second timeout

    // Process redirect results (handles mobile/redirect-flow completions)
    getRedirectResult(auth, browserPopupRedirectResolver)
      .then((result) => {
        if (result?.user) {
          console.log('[Auth] ✓ Google Redirect sign-in completed:', result.user.email);
          // onAuthStateChanged will fire immediately after this and set the user
        }
      })
      .catch((error) => {
        console.error('[Auth] ✗ Google Redirect sign-in error:', error.code, error.message);
        // Don't block loading on redirect errors
      });

    // Listen for auth state changes — this is the single source of truth
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        console.log('[Auth] onAuthStateChanged: user signed in:', firebaseUser.email);
        const normalizedUser = {
          id: firebaseUser.uid,
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          photoURL: firebaseUser.photoURL,
          user_metadata: {
            full_name: firebaseUser.displayName,
          },
        };
        setUser(normalizedUser);

        // Sync profile in background (fire-and-forget, non-blocking)
        upsertUserProfile(firebaseUser.uid, {
          displayName: normalizedUser.displayName,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
        }).catch(err => console.warn('[Auth] Profile sync failed:', err));
      } else {
        console.log('[Auth] onAuthStateChanged: no user (signed out)');
        setUser(null);
      }
      
      clearTimeout(loadingTimeout);
      setLoading(false);
    });

    return () => {
      unsubscribe();
      clearTimeout(loadingTimeout);
    };
  }, []);

  // ── Email / Password Sign Up ──────────────────────────
  const signUp = async (email, password, fullName) => {
    try {
      setAuthError(null);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      if (fullName) {
        await updateProfile(result.user, { displayName: fullName });
      }
      return { data: result, error: null };
    } catch (error) {
      const message = getFirebaseErrorMessage(error.code);
      setAuthError(message);
      return { data: null, error: { message } };
    }
  };

  // ── Email / Password Sign In ──────────────────────────
  const signIn = async (email, password) => {
    try {
      setAuthError(null);
      const result = await signInWithEmailAndPassword(auth, email, password);
      return { data: result, error: null };
    } catch (error) {
      const message = getFirebaseErrorMessage(error.code);
      setAuthError(message);
      return { data: null, error: { message } };
    }
  };

  // ── Google Sign-In (Popup for Web, Redirect for Android APK) ────────────
  const signInWithGoogle = async () => {
    try {
      setAuthError(null);
      setSigningIn(true);

      const isAndroidAPK = typeof window !== 'undefined' && (
        !!window.Capacitor || 
        navigator.userAgent.includes('wv') || 
        (navigator.userAgent.includes('Android') && !navigator.userAgent.includes('Chrome'))
      );

      console.log('[Auth] Google Sign-In mode:', isAndroidAPK ? 'Android APK (redirect)' : 'Web (popup)');

      if (isAndroidAPK) {
        // MOBILE: signInWithRedirect — page reloads when done; getRedirectResult handles completion
        await signInWithRedirect(auth, googleProvider);
        return { data: null, error: null };
      } else {
        // WEB: signInWithPopup — resolves after user selects account
        // Pass browserPopupRedirectResolver explicitly for Firebase v11+ compatibility
        console.log('[Auth] Opening Google sign-in popup...');
        const result = await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
        console.log('[Auth] ✓ Popup sign-in completed for:', result.user.email);
        // onAuthStateChanged will update user state — just clear the loading flag
        setSigningIn(false);
        return { data: result, error: null };
      }
    } catch (error) {
      setSigningIn(false);
      // Ignore user-cancelled popup — not a real error
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        console.log('[Auth] Google popup closed by user.');
        return { data: null, error: null };
      }
      const message = getFirebaseErrorMessage(error.code || error.message);
      setAuthError(message);
      console.error('[Auth] Google Sign-In error:', error.code, error.message);
      return { data: null, error: { message } };
    }
  };

  // ── Password Reset ────────────────────────────────────
  const resetPassword = async (email) => {
    try {
      setAuthError(null);
      await sendPasswordResetEmail(auth, email);
      return { error: null };
    } catch (error) {
      const message = getFirebaseErrorMessage(error.code);
      setAuthError(message);
      return { error: { message } };
    }
  };

  // ── Sign Out ──────────────────────────────────────────
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('[Auth] Sign-out error:', error);
    }
  };

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signingIn,
      authError,
      signUp,
      signIn,
      signInWithGoogle,
      resetPassword,
      signOut,
      displayName
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

// ── Firebase Error Code → User-Friendly Message ─────────
function getFirebaseErrorMessage(code) {
  const messages = {
    'auth/email-already-in-use': 'This email is already registered. Try signing in instead.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-disabled': 'This account has been disabled. Contact support.',
    'auth/user-not-found': 'No account found with this email. Sign up first.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
    'auth/popup-closed-by-user': 'Sign-in popup was closed. Please try again.',
    'auth/popup-blocked': 'Sign-in popup was blocked. Please allow popups for this site.',
    'auth/account-exists-with-different-credential': 'An account already exists with this email but using a different sign-in method.',
    'auth/invalid-credential': 'Invalid email or password. Please check and try again.',
    'auth/network-request-failed': 'Network error. Please check your connection.',
    'auth/timeout': 'Sign-in timed out. Please try again.',
  };
  return messages[code] || 'An unexpected error occurred. Please try again.';
}