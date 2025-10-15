// src/modules/auth.js
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { ref, get, set } from 'firebase/database';
import { auth, db } from '../config/firebase.js';

/**
 * Email użytkownika z uprawnieniami admina
 */
const ADMIN_EMAIL = 'slawomir.sprawski@gmail.com';

/**
 * Stan uwierzytelnienia użytkownika
 */
let currentUser = null;
let isAdmin = false;
let displayName = '';

/**
 * Logowanie użytkownika
 * @param {string} email - Email użytkownika
 * @param {string} password - Hasło użytkownika
 * @returns {Promise<Object>} - Dane zalogowanego użytkownika
 */
export async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    currentUser = userCredential.user;
    isAdmin = email === ADMIN_EMAIL;
    
    // Pobierz nazwę użytkownika z bazy danych
    await loadUserProfile();
    
    return {
      success: true,
      user: currentUser,
      isAdmin,
      displayName
    };
  } catch (error) {
    console.error('Błąd logowania:', error);
    throw new Error(getAuthErrorMessage(error.code));
  }
}

/**
 * Rejestracja nowego użytkownika
 * @param {string} email - Email użytkownika
 * @param {string} password - Hasło użytkownika
 * @returns {Promise<Object>} - Dane zarejestrowanego użytkownika
 */
export async function registerUser(email, password) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    currentUser = userCredential.user;
    isAdmin = email === ADMIN_EMAIL;
    
    // Utwórz domyślny profil użytkownika
    await set(ref(db, `users/${currentUser.uid}/profile`), {
      email: email,
      displayName: email.split('@')[0],
      createdAt: new Date().toISOString()
    });
    
    await loadUserProfile();
    
    return {
      success: true,
      user: currentUser,
      isAdmin,
      displayName
    };
  } catch (error) {
    console.error('Błąd rejestracji:', error);
    throw new Error(getAuthErrorMessage(error.code));
  }
}

/**
 * Wylogowanie użytkownika
 */
export async function logoutUser() {
  try {
    await signOut(auth);
    currentUser = null;
    isAdmin = false;
    displayName = '';
    return { success: true };
  } catch (error) {
    console.error('Błąd wylogowania:', error);
    throw new Error('Nie udało się wylogować');
  }
}

/**
 * Pobierz profil użytkownika z bazy danych
 */
export async function loadUserProfile() {
  if (!currentUser) return;
  
  try {
    const snapshot = await get(ref(db, `users/${currentUser.uid}/profile`));
    if (snapshot.exists()) {
      const profile = snapshot.val();
      displayName = profile.displayName || currentUser.email.split('@')[0];
    } else {
      displayName = currentUser.email.split('@')[0];
    }
  } catch (error) {
    console.error('Błąd ładowania profilu:', error);
    displayName = currentUser.email.split('@')[0];
  }
}

/**
 * Aktualizuj profil użytkownika
 * @param {string} newDisplayName - Nowa nazwa użytkownika
 */
export async function updateUserProfile(newDisplayName) {
  if (!currentUser) {
    throw new Error('Brak zalogowanego użytkownika');
  }
  
  try {
    // Aktualizuj w Firebase Auth
    await updateProfile(currentUser, {
      displayName: newDisplayName
    });
    
    // Aktualizuj w Realtime Database
    await set(ref(db, `users/${currentUser.uid}/profile`), {
      email: currentUser.email,
      displayName: newDisplayName,
      updatedAt: new Date().toISOString()
    });
    
    displayName = newDisplayName;
    return { success: true, displayName };
  } catch (error) {
    console.error('Błąd aktualizacji profilu:', error);
    throw new Error('Nie udało się zaktualizować profilu');
  }
}

/**
 * Nasłuchuj zmian stanu uwierzytelnienia
 * @param {Function} callback - Funkcja wywoływana przy zmianie stanu
 */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
      isAdmin = user.email === ADMIN_EMAIL;
      await loadUserProfile();
    } else {
      isAdmin = false;
      displayName = '';
    }
    callback({
      user: currentUser,
      isAdmin,
      displayName
    });
  });
}

/**
 * Pobierz aktualnego użytkownika
 */
export function getCurrentUser() {
  return currentUser;
}

/**
 * Sprawdź czy użytkownik jest adminem
 */
export function checkIsAdmin() {
  return isAdmin;
}

/**
 * Pobierz nazwę wyświetlaną użytkownika
 */
export function getDisplayName() {
  return displayName || (currentUser ? currentUser.email.split('@')[0] : '');
}

/**
 * Pobierz UID aktualnego użytkownika
 */
export function getUserId() {
  return currentUser ? currentUser.uid : null;
}

/**
 * Konwertuj kod błędu Firebase na przyjazną wiadomość
 * @param {string} errorCode - Kod błędu Firebase
 * @returns {string} - Przyjazna wiadomość błędu
 */
function getAuthErrorMessage(errorCode) {
  const errorMessages = {
    'auth/invalid-email': 'Nieprawidłowy adres email',
    'auth/user-disabled': 'Konto użytkownika zostało wyłączone',
    'auth/user-not-found': 'Nie znaleziono użytkownika',
    'auth/wrong-password': 'Nieprawidłowe hasło',
    'auth/email-already-in-use': 'Email jest już używany',
    'auth/weak-password': 'Hasło jest zbyt słabe (min. 6 znaków)',
    'auth/network-request-failed': 'Błąd połączenia sieciowego',
    'auth/too-many-requests': 'Zbyt wiele prób logowania. Spróbuj później',
    'auth/invalid-credential': 'Nieprawidłowe dane logowania'
  };
  
  return errorMessages[errorCode] || 'Wystąpił błąd. Spróbuj ponownie';
}