// src/modules/auth.js - Moduł autoryzacji z zarządzaniem użytkownikami v1.3.0
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';

import { ref, get, set, update, onValue, push } from 'firebase/database';
import { db } from '../config/firebase.js';

const auth = getAuth();

let currentUser = null;

/**
 * Rejestracja nowego użytkownika
 */
export async function registerUser(email, password, displayName) {
  try {
    console.log('📝 Rejestracja użytkownika:', email);
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    await updateProfile(user, { displayName });
    
    // Zapisz profil użytkownika w bazie danych
    await set(ref(db, `users/${user.uid}/profile`), {
      displayName,
      email,
      createdAt: new Date().toISOString()
    });
    
    // Utwórz pierwszego użytkownika budżetu (właściciel konta)
    const firstBudgetUser = {
      id: `user_${Date.now()}`,
      name: displayName,
      isOwner: true,
      createdAt: new Date().toISOString()
    };
    
    await set(ref(db, `users/${user.uid}/budget/budgetUsers/${firstBudgetUser.id}`), firstBudgetUser);
    
    console.log('✅ Użytkownik zarejestrowany:', displayName);
    return user;
  } catch (error) {
    console.error('❌ Błąd rejestracji:', error);
    throw new Error(getAuthErrorMessage(error.code));
  }
}

/**
 * Logowanie użytkownika
 */
export async function loginUser(email, password) {
  try {
    console.log('🔐 Logowanie użytkownika:', email);
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ Użytkownik zalogowany:', userCredential.user.displayName || email);
    
    return userCredential.user;
  } catch (error) {
    console.error('❌ Błąd logowania:', error);
    throw new Error(getAuthErrorMessage(error.code));
  }
}

/**
 * Wylogowanie użytkownika
 */
export async function logoutUser() {
  try {
    console.log('👋 Wylogowywanie użytkownika');
    await signOut(auth);
    currentUser = null;
    console.log('✅ Użytkownik wylogowany');
  } catch (error) {
    console.error('❌ Błąd wylogowania:', error);
    throw error;
  }
}

/**
 * Nasłuchuj na zmiany stanu uwierzytelnienia
 */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    callback(user);
  });
}

/**
 * Pobierz aktualnego użytkownika
 */
export function getCurrentUser() {
  return currentUser || auth.currentUser;
}

/**
 * Pobierz ID użytkownika
 */
export function getUserId() {
  const user = getCurrentUser();
  return user ? user.uid : null;
}

/**
 * Pobierz nazwę wyświetlaną użytkownika
 */
export async function getDisplayName(uid) {
  try {
    const user = getCurrentUser();
    
    if (user && user.uid === uid && user.displayName) {
      return user.displayName;
    }
    
    const profileRef = ref(db, `users/${uid}/profile`);
    const snapshot = await get(profileRef);
    
    if (snapshot.exists()) {
      const profile = snapshot.val();
      return profile.displayName || profile.email || 'Użytkownik';
    }
    
    return 'Użytkownik';
  } catch (error) {
    console.error('❌ Błąd pobierania nazwy użytkownika:', error);
    return 'Użytkownik';
  }
}

/**
 * Aktualizuj nazwę wyświetlaną użytkownika
 */
export async function updateDisplayName(uid, newDisplayName) {
  try {
    console.log('📝 Aktualizacja nazwy użytkownika:', newDisplayName);
    
    const user = getCurrentUser();
    
    if (!user || user.uid !== uid) {
      throw new Error('Nie masz uprawnień do tej operacji');
    }
    
    await updateProfile(user, { displayName: newDisplayName });
    
    await update(ref(db, `users/${uid}/profile`), {
      displayName: newDisplayName,
      updatedAt: new Date().toISOString()
    });
    
    console.log('✅ Nazwa użytkownika zaktualizowana');
    
    if (window.onDisplayNameUpdate) {
      window.onDisplayNameUpdate(newDisplayName);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Błąd aktualizacji nazwy użytkownika:', error);
    throw error;
  }
}

// ==================== UŻYTKOWNICY BUDŻETU ====================

/**
 * Pobierz wszystkich użytkowników budżetu
 */
export async function getBudgetUsers(uid) {
  try {
    const usersRef = ref(db, `users/${uid}/budget/budgetUsers`);
    const snapshot = await get(usersRef);
    
    if (!snapshot.exists()) {
      return [];
    }
    
    const users = [];
    snapshot.forEach((childSnapshot) => {
      users.push({
        id: childSnapshot.key,
        ...childSnapshot.val()
      });
    });
    
    return users.sort((a, b) => {
      if (a.isOwner && !b.isOwner) return -1;
      if (!a.isOwner && b.isOwner) return 1;
      return a.name.localeCompare(b.name);
    });
    
  } catch (error) {
    console.error('❌ Błąd pobierania użytkowników budżetu:', error);
    return [];
  }
}

/**
 * Dodaj nowego użytkownika budżetu
 */
export async function addBudgetUser(uid, userName) {
  try {
    console.log('➕ Dodawanie użytkownika budżetu:', userName);
    
    const newUser = {
      id: `user_${Date.now()}`,
      name: userName.trim(),
      isOwner: false,
      createdAt: new Date().toISOString()
    };
    
    await set(ref(db, `users/${uid}/budget/budgetUsers/${newUser.id}`), newUser);
    
    console.log('✅ Użytkownik budżetu dodany:', userName);
    return newUser;
    
  } catch (error) {
    console.error('❌ Błąd dodawania użytkownika budżetu:', error);
    throw error;
  }
}

/**
 * Aktualizuj użytkownika budżetu
 */
export async function updateBudgetUser(uid, userId, updates) {
  try {
    console.log('📝 Aktualizacja użytkownika budżetu:', userId);
    
    await update(ref(db, `users/${uid}/budget/budgetUsers/${userId}`), {
      ...updates,
      updatedAt: new Date().toISOString()
    });
    
    console.log('✅ Użytkownik budżetu zaktualizowany');
    return true;
    
  } catch (error) {
    console.error('❌ Błąd aktualizacji użytkownika budżetu:', error);
    throw error;
  }
}

/**
 * Usuń użytkownika budżetu
 */
export async function deleteBudgetUser(uid, userId) {
  try {
    console.log('🗑️ Usuwanie użytkownika budżetu:', userId);
    
    // Sprawdź czy to nie właściciel
    const userRef = ref(db, `users/${uid}/budget/budgetUsers/${userId}`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists() && snapshot.val().isOwner) {
      throw new Error('Nie można usunąć właściciela konta');
    }
    
    await set(userRef, null);
    
    console.log('✅ Użytkownik budżetu usunięty');
    return true;
    
  } catch (error) {
    console.error('❌ Błąd usuwania użytkownika budżetu:', error);
    throw error;
  }
}

/**
 * Subskrybuj real-time aktualizacje użytkowników budżetu
 */
export function subscribeToBudgetUsers(uid, callback) {
  const usersRef = ref(db, `users/${uid}/budget/budgetUsers`);
  
  return onValue(usersRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    
    const users = [];
    snapshot.forEach((childSnapshot) => {
      users.push({
        id: childSnapshot.key,
        ...childSnapshot.val()
      });
    });
    
    const sorted = users.sort((a, b) => {
      if (a.isOwner && !b.isOwner) return -1;
      if (!a.isOwner && b.isOwner) return 1;
      return a.name.localeCompare(b.name);
    });
    
    callback(sorted);
  });
}

/**
 * Pomocnicza funkcja do tłumaczenia błędów Firebase Auth
 */
function getAuthErrorMessage(errorCode) {
  const errorMessages = {
    'auth/email-already-in-use': 'Ten adres email jest już używany',
    'auth/invalid-email': 'Nieprawidłowy adres email',
    'auth/operation-not-allowed': 'Operacja niedozwolona',
    'auth/weak-password': 'Hasło jest za słabe',
    'auth/user-disabled': 'Konto użytkownika zostało wyłączone',
    'auth/user-not-found': 'Nie znaleziono użytkownika',
    'auth/wrong-password': 'Nieprawidłowe hasło',
    'auth/too-many-requests': 'Zbyt wiele prób logowania. Spróbuj później',
    'auth/network-request-failed': 'Błąd połączenia sieciowego',
    'auth/invalid-credential': 'Nieprawidłowe dane logowania'
  };

  return errorMessages[errorCode] || 'Wystąpił nieznany błąd';
}