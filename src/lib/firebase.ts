import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Inisialisasi Firebase (mencegah re-initialization saat SSR / Next.js Fast Refresh)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Ekspor modul Auth & Provider
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Ekspor modul Firestore Database
const db = getFirestore(app);

// Ekspor modul Cloud Storage
const storage = getStorage(app);
// Berikan toleransi retry waktu panjang (1 jam) untuk file video dan media berukuran raksasa
storage.maxUploadRetryTime = 3600000; // 1 hour for large media/video files
storage.maxOperationRetryTime = 3600000; // 1 hour for storage operations

export { app, auth, googleProvider, db, storage };
