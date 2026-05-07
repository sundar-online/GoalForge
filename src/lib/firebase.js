// ═══════════════════════════════════════════════════════
// Firebase Configuration — GoalForge
// ═══════════════════════════════════════════════════════
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD59ewUm8tQYj4Vg_a-vPEmJ3Rd5khVwtY",
  authDomain: "goalforage.firebaseapp.com",
  projectId: "goalforage",
  storageBucket: "goalforage.firebasestorage.app",
  messagingSenderId: "47005570215",
  appId: "1:47005570215:web:43050232fd7075dee27782"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Auth
export const auth = getAuth(app);

// Auth Providers
export const googleProvider = new GoogleAuthProvider();

// Firestore
export const fireDb = getFirestore(app);

export default app;
