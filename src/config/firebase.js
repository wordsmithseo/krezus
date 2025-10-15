// src/config/firebase.js
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

/**
 * Konfiguracja Firebase dla aplikacji Krezus
 */
const firebaseConfig = {
  apiKey: "AIzaSyCnRc4rnq-xNf1Z9H_z-cfT7prqNgxQ_-0",
  authDomain: "krezus-e3070.firebaseapp.com",
  databaseURL: "https://krezus-e3070-default-rtdb.firebaseio.com",
  projectId: "krezus-e3070",
  storageBucket: "krezus-e3070.firebasestorage.app",
  messagingSenderId: "972913558013",
  appId: "1:972913558013:web:cf13f942374dadb99dd994"
};

// Inicjalizacja Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

export { app, db, auth };