// ═══════════════════════════════════════════════════════
// Firebase Configuration — GoalForge
// ═══════════════════════════════════════════════════════
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  GoogleAuthProvider,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserPopupRedirectResolver,
} from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  persistentSingleTabManager,
  getFirestore
} from 'firebase/firestore';

// ── Config reads from .env.local (VITE_ prefix required by Vite) ──
// authDomain MUST be goalforage.firebaseapp.com (Firebase default) for popup auth.
// Only change to a custom domain if Firebase Hosting is configured on that domain.
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY             ?? 'AIzaSyD59ewUm8tQYj4Vg_a-vPEmJ3Rd5khVwtY',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN         ?? 'goalforage.firebaseapp.com',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID          ?? 'goalforage',
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET      ?? 'goalforage.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '47005570215',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID              ?? '1:47005570215:web:43050232fd7075dee27782',
};

console.log('[Firebase] Initializing with authDomain:', firebaseConfig.authDomain);

// Initialize Firebase App (guard against HMR double-init)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ── Auth: use initializeAuth with explicit persistence + popup resolver ──
// This fixes post-login redirect issues in Firebase v11+ with Vite/React:
//   • indexedDBLocalPersistence: stores the session in IndexedDB (survives page reloads)
//   • browserLocalPersistence: localStorage fallback for browsers without IndexedDB
//   • browserPopupRedirectResolver: ensures popup callbacks are always captured correctly
let authInstance;
try {
  authInstance = initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    popupRedirectResolver: browserPopupRedirectResolver,
  });
  console.log('[Firebase] ✓ Auth initialized with IndexedDB persistence + popup resolver.');
} catch (err) {
  // Already initialized (e.g. Vite HMR) — get existing instance
  authInstance = getAuth(app);
  console.warn('[Firebase] Auth already initialized, using existing instance:', err.code);
}
export const auth = authInstance;

// ── Google OAuth provider ──
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({ prompt: 'select_account' });

// ── Firestore: persistent cache with multi/single-tab manager ──
let dbInstance;
try {
  console.log('[Firestore] Attempting to initialize with persistent local cache...');
  const isMobile = typeof window !== 'undefined' && (
    !!window.Capacitor || 
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  );

  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: isMobile ? persistentSingleTabManager() : persistentMultipleTabManager()
    })
  });
  console.log(`[Firestore] ✓ Initialized with persistent cache (${isMobile ? 'single' : 'multi'}-tab).`);
} catch (err) {
  console.warn('[Firestore] ⚠️ Persistent cache failed, falling back to standard getFirestore:', err);
  try {
    dbInstance = getFirestore(app);
    console.log('[Firestore] ✓ Initialized via getFirestore fallback.');
  } catch (fallbackErr) {
    console.error('[Firestore] Critical initialization failure:', fallbackErr);
    throw fallbackErr;
  }
}

export const fireDb = dbInstance;
export default app;
