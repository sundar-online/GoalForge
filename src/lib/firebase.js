// ═══════════════════════════════════════════════════════
// Firebase Configuration — GoalForge
// ═══════════════════════════════════════════════════════
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  getFirestore
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD59ewUm8tQYj4Vg_a-vPEmJ3Rd5khVwtY",
  authDomain: "goalforage.firebaseapp.com",
  projectId: "goalforage",
  storageBucket: "goalforage.firebasestorage.app",
  messagingSenderId: "47005570215",
  appId: "1:47005570215:web:43050232fd7075dee27782"
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Auth setup
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Firestore initialization with resilient multi-tab offline persistence & fallback
let dbInstance;
try {
  console.log('[Firestore] Attempting to initialize with persistent local cache...');
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
  console.log('✓ Firestore initialized successfully with persistent multiple-tab cache.');
} catch (err) {
  console.warn('⚠️ Failed to initialize persistent local cache, falling back to standard getFirestore:', err);
  try {
    dbInstance = getFirestore(app);
    console.log('✓ Firestore initialized successfully using standard getFirestore fallback.');
  } catch (fallbackErr) {
    console.error('Critical Firestore initialization failure:', fallbackErr);
    throw fallbackErr;
  }
}

export const fireDb = dbInstance;
export default app;
