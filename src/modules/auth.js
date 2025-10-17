// src/modules/auth.js - NAPRAWIONY: Współdzielenie budżetu
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { ref, get, set, push, update, remove, onValue } from 'firebase/database';
import { auth, db } from '../config/firebase.js';

/**
 * Stan uwierzytelnienia użytkownika
 */
let currentUser = null;
let displayName = '';
let unreadMessagesCount = 0;

// Listenery
let messagesListener = null;

/**
 * Logowanie użytkownika
 */
export async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    currentUser = userCredential.user;
    
    await loadUserProfile();
    setupNotificationListeners();
    
    return {
      success: true,
      user: currentUser,
      displayName
    };
  } catch (error) {
    console.error('Błąd logowania:', error);
    throw new Error(getAuthErrorMessage(error.code));
  }
}

/**
 * Rejestracja nowego użytkownika
 */
export async function registerUser(email, password) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    currentUser = userCredential.user;
    
    await set(ref(db, `users/${currentUser.uid}/profile`), {
      email: email,
      displayName: email.split('@')[0],
      createdAt: new Date().toISOString()
    });
    
    await loadUserProfile();
    setupNotificationListeners();
    
    return {
      success: true,
      user: currentUser,
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
    clearNotificationListeners();
    await signOut(auth);
    currentUser = null;
    displayName = '';
    unreadMessagesCount = 0;
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
 */
export async function updateUserProfile(newDisplayName) {
  if (!currentUser) {
    throw new Error('Brak zalogowanego użytkownika');
  }
  
  try {
    await updateProfile(currentUser, {
      displayName: newDisplayName
    });
    
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
 * Wyślij zaproszenie do współdzielenia budżetu - NAPRAWIONE
 */
export async function sendBudgetInvitation(recipientEmail) {
  if (!currentUser) throw new Error('Brak zalogowanego użytkownika');
  
  try {
    // Znajdź użytkownika po emailu - NAPRAWIONE: Bez direct ref
    const usersSnapshot = await get(ref(db, 'users'));
    let recipientUid = null;
    let recipientProfile = null;
    
    if (usersSnapshot.exists()) {
      const users = usersSnapshot.val();
      for (const [uid, userData] of Object.entries(users)) {
        if (userData.profile && userData.profile.email === recipientEmail) {
          recipientUid = uid;
          recipientProfile = userData.profile;
          break;
        }
      }
    }
    
    if (!recipientUid) {
      throw new Error('Nie znaleziono użytkownika o podanym adresie email');
    }
    
    if (recipientUid === currentUser.uid) {
      throw new Error('Nie możesz wysłać zaproszenia do samego siebie');
    }
    
    // Sprawdź czy użytkownik już współdzieli budżet
    const sharedUsersSnapshot = await get(ref(db, `users/${currentUser.uid}/sharedWith`));
    if (sharedUsersSnapshot.exists()) {
      const sharedUsers = Object.values(sharedUsersSnapshot.val());
      if (sharedUsers.some(u => u.uid === recipientUid)) {
        throw new Error('Ten użytkownik już współdzieli z Tobą budżet');
      }
    }
    
    // Sprawdź czy już wysłano zaproszenie
    const recipientMessages = await get(ref(db, `users/${recipientUid}/messages`));
    if (recipientMessages.exists()) {
      const messages = Object.values(recipientMessages.val());
      const existingInvite = messages.find(m => 
        m.type === 'budget_invitation' && 
        m.fromUserId === currentUser.uid && 
        (!m.status || m.status === 'pending')
      );
      if (existingInvite) {
        throw new Error('Zaproszenie dla tego użytkownika już oczekuje na odpowiedź');
      }
    }
    
    // Pobierz statystyki budżetu nadawcy
    const senderBudgetSnapshot = await get(ref(db, `users/${currentUser.uid}/budget`));
    let budgetStats = {
      totalIncome: 0,
      totalExpenses: 0,
      categoriesCount: 0,
      savingGoal: 0
    };
    
    if (senderBudgetSnapshot.exists()) {
      const budget = senderBudgetSnapshot.val();
      
      if (budget.incomes) {
        budgetStats.totalIncome = Object.values(budget.incomes).reduce((sum, inc) => sum + (inc.amount || 0), 0);
      }
      
      if (budget.expenses) {
        budgetStats.totalExpenses = Object.values(budget.expenses).reduce((sum, exp) => sum + ((exp.amount || 0) * (exp.quantity || 1)), 0);
      }
      
      if (budget.categories) {
        budgetStats.categoriesCount = Object.keys(budget.categories).length;
      }
      
      if (budget.savingGoal) {
        budgetStats.savingGoal = budget.savingGoal;
      }
    }
    
    // Utwórz wiadomość z zaproszeniem - NAPRAWIONE: Tylko do odbiorcy
    const messageRef = push(ref(db, `users/${recipientUid}/messages`));
    await set(messageRef, {
      id: messageRef.key,
      type: 'budget_invitation',
      fromUserId: currentUser.uid,
      fromEmail: currentUser.email,
      fromDisplayName: displayName,
      budgetStats: budgetStats,
      message: `${displayName} (${currentUser.email}) zaprasza Cię do współdzielenia budżetu.`,
      read: false,
      createdAt: new Date().toISOString()
    });
    
    console.log('✅ Zaproszenie wysłane pomyślnie do:', recipientEmail);
    return { success: true };
  } catch (error) {
    console.error('❌ Błąd wysyłania zaproszenia:', error);
    throw error;
  }
}

/**
 * Akceptuj zaproszenie do budżetu
 */
export async function acceptBudgetInvitation(messageId, fromUserId) {
  if (!currentUser) throw new Error('Brak zalogowanego użytkownika');
  
  try {
    // Skopiuj budżet nadawcy do odbiorcy
    const senderBudgetSnapshot = await get(ref(db, `users/${fromUserId}/budget`));
    
    if (senderBudgetSnapshot.exists()) {
      const senderBudget = senderBudgetSnapshot.val();
      await set(ref(db, `users/${currentUser.uid}/budget`), senderBudget);
    }
    
    // Pobierz dane nadawcy
    const senderProfileSnapshot = await get(ref(db, `users/${fromUserId}/profile`));
    const senderProfile = senderProfileSnapshot.exists() ? senderProfileSnapshot.val() : {};
    
    // Dodaj nadawcę do listy współdzielących u odbiorcy
    const sharedUserData = {
      uid: fromUserId,
      email: senderProfile.email || '',
      displayName: senderProfile.displayName || senderProfile.email?.split('@')[0] || 'Użytkownik',
      addedAt: new Date().toISOString()
    };
    
    const receiverSharedRef = push(ref(db, `users/${currentUser.uid}/sharedWith`));
    await set(receiverSharedRef, sharedUserData);
    
    // Dodaj odbiorcę do listy współdzielących u nadawcy
    const receiverProfileSnapshot = await get(ref(db, `users/${currentUser.uid}/profile`));
    const receiverProfile = receiverProfileSnapshot.exists() ? receiverProfileSnapshot.val() : {};
    
    const receiverSharedUserData = {
      uid: currentUser.uid,
      email: receiverProfile.email || currentUser.email,
      displayName: receiverProfile.displayName || displayName,
      addedAt: new Date().toISOString()
    };
    
    const senderSharedRef = push(ref(db, `users/${fromUserId}/sharedWith`));
    await set(senderSharedRef, receiverSharedUserData);
    
    // Oznacz wiadomość jako przeczytaną i zaakceptowaną
    await update(ref(db, `users/${currentUser.uid}/messages/${messageId}`), {
      read: true,
      status: 'accepted',
      acceptedAt: new Date().toISOString()
    });
    
    // Wyślij wiadomość do nadawcy
    await sendSystemMessage(
      fromUserId,
      'invitation_accepted',
      `${displayName} (${currentUser.email}) zaakceptował(a) Twoje zaproszenie do współdzielenia budżetu.`,
      { acceptedBy: currentUser.email }
    );
    
    return { success: true };
  } catch (error) {
    console.error('Błąd akceptowania zaproszenia:', error);
    throw error;
  }
}

/**
 * Usuń użytkownika ze współdzielenia budżetu
 */
export async function removeSharedUser(sharedUserId) {
  if (!currentUser) throw new Error('Brak zalogowanego użytkownika');
  
  try {
    // Usuń użytkownika z mojej listy współdzielących
    const mySharedSnapshot = await get(ref(db, `users/${currentUser.uid}/sharedWith`));
    if (mySharedSnapshot.exists()) {
      const sharedUsers = mySharedSnapshot.val();
      for (const [key, user] of Object.entries(sharedUsers)) {
        if (user.uid === sharedUserId) {
          await remove(ref(db, `users/${currentUser.uid}/sharedWith/${key}`));
          break;
        }
      }
    }
    
    // Usuń mnie z listy współdzielących tego użytkownika
    const theirSharedSnapshot = await get(ref(db, `users/${sharedUserId}/sharedWith`));
    if (theirSharedSnapshot.exists()) {
      const sharedUsers = theirSharedSnapshot.val();
      for (const [key, user] of Object.entries(sharedUsers)) {
        if (user.uid === currentUser.uid) {
          await remove(ref(db, `users/${sharedUserId}/sharedWith/${key}`));
          break;
        }
      }
    }
    
    // Wyślij wiadomość do usuniętego użytkownika
    await sendSystemMessage(
      sharedUserId,
      'sharing_removed',
      `${displayName} (${currentUser.email}) zakończył(a) współdzielenie budżetu z Tobą. Zachowałeś kopię budżetu z momentu rozłączenia.`,
      { removedBy: currentUser.email }
    );
    
    return { success: true };
  } catch (error) {
    console.error('Błąd usuwania współdzielenia:', error);
    throw error;
  }
}

/**
 * Pobierz listę użytkowników współdzielących budżet
 */
export async function getSharedUsers() {
  if (!currentUser) return [];
  
  try {
    const snapshot = await get(ref(db, `users/${currentUser.uid}/sharedWith`));
    if (!snapshot.exists()) return [];
    
    const sharedUsers = snapshot.val();
    return Object.values(sharedUsers);
  } catch (error) {
    console.error('Błąd pobierania współdzielących użytkowników:', error);
    return [];
  }
}

/**
 * Odrzuć zaproszenie do budżetu
 */
export async function rejectBudgetInvitation(messageId, fromUserId) {
  if (!currentUser) throw new Error('Brak zalogowanego użytkownika');
  
  try {
    // Oznacz wiadomość jako przeczytaną i odrzuconą
    await update(ref(db, `users/${currentUser.uid}/messages/${messageId}`), {
      read: true,
      status: 'rejected',
      rejectedAt: new Date().toISOString()
    });
    
    // Wyślij wiadomość do nadawcy
    await sendSystemMessage(
      fromUserId,
      'invitation_rejected',
      `${displayName} (${currentUser.email}) odrzucił(a) Twoje zaproszenie do współdzielenia budżetu.`,
      { rejectedBy: currentUser.email }
    );
    
    return { success: true };
  } catch (error) {
    console.error('Błąd odrzucania zaproszenia:', error);
    throw error;
  }
}

/**
 * Wyślij wiadomość systemową
 */
async function sendSystemMessage(recipientUid, type, message, metadata = {}) {
  const messageRef = push(ref(db, `users/${recipientUid}/messages`));
  await set(messageRef, {
    id: messageRef.key,
    type,
    message,
    metadata,
    read: false,
    createdAt: new Date().toISOString()
  });
}

/**
 * Pobierz wszystkie wiadomości
 */
export async function getMessages() {
  if (!currentUser) return [];
  
  try {
    const snapshot = await get(ref(db, `users/${currentUser.uid}/messages`));
    if (!snapshot.exists()) return [];
    
    const messages = snapshot.val();
    return Object.values(messages).sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
  } catch (error) {
    console.error('Błąd pobierania wiadomości:', error);
    return [];
  }
}

/**
 * Oznacz wiadomość jako przeczytaną
 */
export async function markMessageAsRead(messageId) {
  if (!currentUser) return;
  
  try {
    await update(ref(db, `users/${currentUser.uid}/messages/${messageId}`), {
      read: true,
      readAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Błąd oznaczania wiadomości:', error);
  }
}

/**
 * Usuń wiadomość
 */
export async function deleteMessage(messageId) {
  if (!currentUser) return;
  
  try {
    await remove(ref(db, `users/${currentUser.uid}/messages/${messageId}`));
  } catch (error) {
    console.error('Błąd usuwania wiadomości:', error);
    throw error;
  }
}

/**
 * Konfiguruj listenery dla wiadomości
 */
function setupNotificationListeners() {
  if (!currentUser) return;
  
  // Listener dla wiadomości
  const messagesRef = ref(db, `users/${currentUser.uid}/messages`);
  messagesListener = onValue(messagesRef, (snapshot) => {
    if (snapshot.exists()) {
      const messages = Object.values(snapshot.val());
      const unread = messages.filter(msg => !msg.read);
      unreadMessagesCount = unread.length;
      
      // Wywołaj callback jeśli istnieje
      if (window.onMessagesCountChange) {
        window.onMessagesCountChange(unreadMessagesCount);
      }
    } else {
      unreadMessagesCount = 0;
      if (window.onMessagesCountChange) {
        window.onMessagesCountChange(0);
      }
    }
  });
}

/**
 * Wyczyść listenery
 */
function clearNotificationListeners() {
  if (messagesListener) messagesListener();
  messagesListener = null;
}

/**
 * Nasłuchuj zmian stanu uwierzytelnienia
 */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
      await loadUserProfile();
      setupNotificationListeners();
    } else {
      displayName = '';
      clearNotificationListeners();
    }
    callback({
      user: currentUser,
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
 * Sprawdź czy użytkownik jest adminem (deprecated - wszyscy mają równe uprawnienia)
 */
export function checkIsAdmin() {
  return true;
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
 * Pobierz liczbę nieprzeczytanych wiadomości
 */
export function getUnreadMessagesCount() {
  return unreadMessagesCount;
}

/**
 * Konwertuj kod błędu Firebase na przyjazną wiadomość
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