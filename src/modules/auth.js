// src/modules/auth.js - Moduł autoryzacji
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';

import { ref, get, set, update, onValue, off } from 'firebase/database';
import { db } from '../config/firebase.js';

const auth = getAuth();

let currentUser = null;
let messagesUnsubscribe = null;

/**
 * Rejestracja nowego użytkownika
 */
export async function registerUser(email, password, displayName) {
  try {
    console.log('📝 Rejestracja użytkownika:', email);
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Ustaw nazwę użytkownika
    await updateProfile(user, { displayName });
    
    // Zapisz nazwę użytkownika w bazie danych
    await set(ref(db, `users/${user.uid}/profile`), {
      displayName,
      email,
      createdAt: new Date().toISOString()
    });
    
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
    
    // Wyczyść listener wiadomości
    if (messagesUnsubscribe) {
      messagesUnsubscribe();
      messagesUnsubscribe = null;
    }
    
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
    
    if (user) {
      // Subskrybuj wiadomości użytkownika
      subscribeToMessages(user.uid);
    } else {
      // Wyczyść listener wiadomości
      if (messagesUnsubscribe) {
        messagesUnsubscribe();
        messagesUnsubscribe = null;
      }
    }
    
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
    
    // Jeśli to ten sam użytkownik co zalogowany, użyj danych z auth
    if (user && user.uid === uid && user.displayName) {
      return user.displayName;
    }
    
    // W przeciwnym razie pobierz z bazy danych
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
    
    // Aktualizuj w Firebase Auth
    await updateProfile(user, { displayName: newDisplayName });
    
    // Aktualizuj w bazie danych
    await update(ref(db, `users/${uid}/profile`), {
      displayName: newDisplayName,
      updatedAt: new Date().toISOString()
    });
    
    console.log('✅ Nazwa użytkownika zaktualizowana');
    
    // Wywołaj callback jeśli istnieje
    if (window.onDisplayNameUpdate) {
      window.onDisplayNameUpdate(newDisplayName);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Błąd aktualizacji nazwy użytkownika:', error);
    throw error;
  }
}

// ==================== ZAPROSZENIA DO BUDŻETU ====================

/**
 * Wyślij zaproszenie do współdzielenia budżetu
 */
export async function sendBudgetInvitation(recipientEmail) {
  try {
    const sender = getCurrentUser();
    if (!sender) {
      throw new Error('Musisz być zalogowany');
    }

    console.log('📧 Wysyłanie zaproszenia do:', recipientEmail);

    // Znajdź użytkownika po emailu
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    
    if (!snapshot.exists()) {
      throw new Error('Nie znaleziono użytkownika o podanym adresie email');
    }

    let recipientUid = null;
    let recipientName = null;

    snapshot.forEach((childSnapshot) => {
      const profile = childSnapshot.val().profile;
      if (profile && profile.email === recipientEmail) {
        recipientUid = childSnapshot.key;
        recipientName = profile.displayName || profile.email;
      }
    });

    if (!recipientUid) {
      throw new Error('Nie znaleziono użytkownika o podanym adresie email');
    }

    if (recipientUid === sender.uid) {
      throw new Error('Nie możesz wysłać zaproszenia do siebie');
    }

    // Pobierz dane nadawcy
    const senderName = await getDisplayName(sender.uid);

    // Utwórz zaproszenie
    const invitationId = `inv_${Date.now()}`;
    const invitation = {
      id: invitationId,
      from: {
        uid: sender.uid,
        email: sender.email,
        displayName: senderName
      },
      to: {
        uid: recipientUid,
        email: recipientEmail,
        displayName: recipientName
      },
      status: 'pending',
      createdAt: new Date().toISOString(),
      type: 'budget_invitation'
    };

    // Zapisz zaproszenie w wiadomościach odbiorcy
    const messageRef = ref(db, `users/${recipientUid}/messages/${invitationId}`);
    await set(messageRef, {
      ...invitation,
      read: false
    });

    console.log('✅ Zaproszenie wysłane pomyślnie');
    return invitation;

  } catch (error) {
    console.error('❌ Błąd wysyłania zaproszenia:', error);
    throw error;
  }
}

/**
 * Odpowiedz na zaproszenie do budżetu
 */
export async function respondToInvitation(invitationId, accept) {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('Musisz być zalogowany');
    }

    console.log(`${accept ? '✅' : '❌'} Odpowiadanie na zaproszenie:`, invitationId);

    // Pobierz zaproszenie
    const invitationRef = ref(db, `users/${user.uid}/messages/${invitationId}`);
    const snapshot = await get(invitationRef);

    if (!snapshot.exists()) {
      throw new Error('Zaproszenie nie istnieje');
    }

    const invitation = snapshot.val();

    if (invitation.status !== 'pending') {
      throw new Error('To zaproszenie zostało już przetworzone');
    }

    // Aktualizuj status zaproszenia
    await update(invitationRef, {
      status: accept ? 'accepted' : 'rejected',
      respondedAt: new Date().toISOString(),
      read: true
    });

    if (accept) {
      // Jeśli zaproszenie zaakceptowane, skopiuj dane budżetu nadawcy
      const senderUid = invitation.from.uid;
      const recipientUid = user.uid;

      console.log('📋 Kopiowanie budżetu z:', senderUid, 'do:', recipientUid);

      // Pobierz dane budżetu nadawcy
      const senderBudgetRef = ref(db, `users/${senderUid}/budget`);
      const senderBudgetSnapshot = await get(senderBudgetRef);

      if (senderBudgetSnapshot.exists()) {
        const senderBudget = senderBudgetSnapshot.val();
        
        // Zapisz dane budżetu nadawcy do budżetu odbiorcy
        const recipientBudgetRef = ref(db, `users/${recipientUid}/budget`);
        await set(recipientBudgetRef, senderBudget);
        
        console.log('✅ Budżet skopiowany pomyślnie');
      }
    }

    // Wyślij powiadomienie do nadawcy
    const notificationId = `notif_${Date.now()}`;
    const notification = {
      id: notificationId,
      type: 'invitation_response',
      from: {
        uid: user.uid,
        email: user.email,
        displayName: await getDisplayName(user.uid)
      },
      invitationId: invitationId,
      accepted: accept,
      createdAt: new Date().toISOString(),
      read: false,
      message: accept 
        ? 'Zaakceptował(a) Twoje zaproszenie do współdzielenia budżetu'
        : 'Odrzucił(a) Twoje zaproszenie do współdzielenia budżetu'
    };

    const senderNotifRef = ref(db, `users/${invitation.from.uid}/messages/${notificationId}`);
    await set(senderNotifRef, notification);

    console.log('✅ Odpowiedź na zaproszenie wysłana');
    return true;

  } catch (error) {
    console.error('❌ Błąd odpowiadania na zaproszenie:', error);
    throw error;
  }
}

/**
 * Pobierz wszystkie wiadomości użytkownika
 */
export async function getUserMessages(uid) {
  try {
    const messagesRef = ref(db, `users/${uid}/messages`);
    const snapshot = await get(messagesRef);

    if (!snapshot.exists()) {
      return [];
    }

    const messages = [];
    snapshot.forEach((childSnapshot) => {
      messages.push({
        id: childSnapshot.key,
        ...childSnapshot.val()
      });
    });

    // Sortuj od najnowszych
    return messages.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  } catch (error) {
    console.error('❌ Błąd pobierania wiadomości:', error);
    return [];
  }
}

/**
 * Oznacz wiadomość jako przeczytaną
 */
export async function markMessageAsRead(uid, messageId) {
  try {
    const messageRef = ref(db, `users/${uid}/messages/${messageId}`);
    await update(messageRef, { read: true });
    console.log('✅ Wiadomość oznaczona jako przeczytana');
  } catch (error) {
    console.error('❌ Błąd oznaczania wiadomości:', error);
    throw error;
  }
}

/**
 * Usuń wiadomość
 */
export async function deleteMessage(uid, messageId) {
  try {
    const messageRef = ref(db, `users/${uid}/messages/${messageId}`);
    await set(messageRef, null);
    console.log('✅ Wiadomość usunięta');
  } catch (error) {
    console.error('❌ Błąd usuwania wiadomości:', error);
    throw error;
  }
}

/**
 * Pobierz liczbę nieprzeczytanych wiadomości
 */
export async function getUnreadMessagesCount(uid) {
  try {
    const messages = await getUserMessages(uid);
    return messages.filter(m => !m.read).length;
  } catch (error) {
    console.error('❌ Błąd liczenia nieprzeczytanych wiadomości:', error);
    return 0;
  }
}

/**
 * Subskrybuj real-time aktualizacje wiadomości
 */
function subscribeToMessages(uid) {
  if (messagesUnsubscribe) {
    messagesUnsubscribe();
  }

  const messagesRef = ref(db, `users/${uid}/messages`);
  
  messagesUnsubscribe = onValue(messagesRef, async (snapshot) => {
    const count = await getUnreadMessagesCount(uid);
    
    if (window.onMessagesCountChange) {
      window.onMessagesCountChange(count);
    }
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