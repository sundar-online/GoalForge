import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, googleProvider } from '../lib/firebase';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
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

    // Process redirect results IMMEDIATELY (don't await)
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          console.log('✓ Successfully completed Google Redirect sign-in:', result.user);
        }
      })
      .catch((error) => {
        console.error('✗ Error during Google Redirect sign-in:', error);
        // Don't block loading on redirect errors
      });

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
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

  // ── Google Sign-In (OPTIMIZED FOR MOBILE) ──────────────────────────────────
  const signInWithGoogle = async () => {
    try {
      setAuthError(null);
      setSigningIn(true);

      const isAndroidAPK = typeof window !== 'undefined' && (
        !!window.Capacitor || 
        navigator.userAgent.includes('wv') || 
        (navigator.userAgent.includes('Android') && !navigator.userAgent.includes('Chrome'))
      );

      console.log('[Auth] Google Sign-In detected as:', isAndroidAPK ? 'Android APK' : 'Web');

      if (isAndroidAPK) {
        // ✅ MOBILE: Use redirect (doesn't block on slow networks)
        // The page will reload automatically when redirect completes
        console.log('[Auth] Using signInWithRedirect for mobile...');
        await signInWithRedirect(auth, googleProvider);
        // Don't await completion - redirect will reload the page
        return { data: null, error: null };
      } else {
        // ✅ WEB: Use popup with timeout
        console.log('[Auth] Using signInWithPopup for web...');
        const signInPromise = signInWithPopup(auth, googleProvider);
        
        // Race against a 15-second timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('auth/timeout')), 15000);
        });

        try {
          const result = await Promise.race([signInPromise, timeoutPromise]);
          setSigningIn(false);
          return { data: result, error: null };
        } catch (error) {
          if (error.message === 'auth/timeout') {
            setAuthError('Sign-in took too long. Please try again.');
            console.error('[Auth] Google Sign-In timeout after 15 seconds');
          }
          throw error;
        }
      }
    } catch (error) {
      setSigningIn(false);
      const message = getFirebaseErrorMessage(error.code || error.message);
      setAuthError(message);
      console.error('[Auth] Google Sign-In error:', error);
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