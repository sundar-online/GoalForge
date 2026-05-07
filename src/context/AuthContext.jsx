import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, googleProvider } from '../lib/firebase';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { upsertUserProfile } from '../lib/firebaseDb';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Normalize the user object so the rest of the app gets a consistent shape
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

        // Sync profile to Firestore (fire-and-forget)
        upsertUserProfile(firebaseUser.uid, {
          displayName: normalizedUser.displayName,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ── Email / Password Sign Up ──────────────────────────
  const signUp = async (email, password, fullName) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      // Set the display name
      if (fullName) {
        await updateProfile(result.user, { displayName: fullName });
      }
      return { data: result, error: null };
    } catch (error) {
      return { data: null, error: { message: getFirebaseErrorMessage(error.code) } };
    }
  };

  // ── Email / Password Sign In ──────────────────────────
  const signIn = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return { data: result, error: null };
    } catch (error) {
      return { data: null, error: { message: getFirebaseErrorMessage(error.code) } };
    }
  };

  // ── Google Sign-In ────────────────────────────────────
  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return { data: result, error: null };
    } catch (error) {
      return { data: null, error: { message: getFirebaseErrorMessage(error.code) } };
    }
  };

  // ── Password Reset ────────────────────────────────────
  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { error: null };
    } catch (error) {
      return { error: { message: getFirebaseErrorMessage(error.code) } };
    }
  };

  // ── Sign Out ──────────────────────────────────────────
  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';

  return (
    <AuthContext.Provider value={{
      user,
      loading,
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
  };
  return messages[code] || 'An unexpected error occurred. Please try again.';
}
