// src/modules/auth.js
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
 * Email użytkownika z uprawnieniami admina
 */
const ADMIN_EMAIL = 'slawomir.sprawski@gmail.com';

/**
 * Stan uwierzytelnienia użytkownika
 */
let currentUser = null;
let isAdmin = false;
let displayName = '';
let pendingInvitesCount = 0;
let unreadMessagesCount = 0;

// Listenery
let invitesListener = null;
let messagesListener = null;

/**
 * Logowanie użytkownika
 */
export async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    currentUser = userCredential.user;
    isAdmin = email === ADMIN_EMAIL;
    
    await loadUserProfile();
    setupNotificationListeners();
    
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
 */
export async function registerUser(email, password) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    currentUser = userCredential.user;
    isAdmin = email === ADMIN_EMAIL;
    
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
    clearNotificationListeners();
    await signOut(auth);
    currentUser = null;
    isAdmin = false;
    displayName = '';
    pendingInvitesCount = 0;
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
 * Wyślij zaproszenie do współdzielenia budżetu
 */
export async function sendBudgetInvitation(recipientEmail) {
  if (!currentUser) throw new Error('Brak zalogowanego użytkownika');
  
  try {
    // Znajdź użytkownika po emailu
    const usersSnapshot = await get(ref(db, 'users'));
    let recipientUid = null;
    
    if (usersSnapshot.exists()) {
      const users = usersSnapshot.val();
      for (const [uid, userData] of Object.entries(users)) {
        if (userData.profile && userData.profile.email === recipientEmail) {
          recipientUid = uid;
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
    
    // Sprawdź czy zaproszenie już istnieje
    const existingInvitesSnapshot = await get(ref(db, `users/${recipientUid}/invitations`));
    if (existingInvitesSnapshot.exists()) {
      const invites = existingInvitesSnapshot.val();
      for (const invite of Object.values(invites)) {
        if (invite.fromUserId === currentUser.uid && invite.status === 'pending') {
          throw new Error('Zaproszenie dla tego użytkownika już istnieje');
        }
      }
    }
    
    // Utwórz zaproszenie
    const invitationRef = push(ref(db, `users/${recipientUid}/invitations`));
    await set(invitationRef, {
      id: invitationRef.key,
      fromUserId: currentUser.uid,
      fromEmail: currentUser.email,
      fromDisplayName: displayName,
      toUserId: recipientUid,
      toEmail: recipientEmail,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Błąd wysyłania zaproszenia:', error);
    throw error;
  }
}

/**
 * Pobierz oczekujące zaproszenia
 */
export async function getPendingInvitations() {
  if (!currentUser) return [];
  
  try {
    const snapshot = await get(ref(db, `users/${currentUser.uid}/invitations`));
    if (!snapshot.exists()) return [];
    
    const invitations = snapshot.val();
    return Object.values(invitations).filter(inv => inv.status === 'pending');
  } catch (error) {
    console.error('Błąd pobierania zaproszeń:', error);
    return [];
  }
}

/**
 * Akceptuj zaproszenie do budżetu
 */
export async function acceptBudgetInvitation(invitationId) {
  if (!currentUser) throw new Error('Brak zalogowanego użytkownika');
  
  try {
    const inviteRef = ref(db, `users/${currentUser.uid}/invitations/${invitationId}`);
    const snapshot = await get(inviteRef);
    
    if (!snapshot.exists()) {
      throw new Error('Zaproszenie nie istnieje');
    }
    
    const invitation = snapshot.val();
    
    // Skopiuj budżet nadawcy do odbiorcy
    const senderBudgetSnapshot = await get(ref(db, `users/${invitation.fromUserId}/budget`));
    
    if (senderBudgetSnapshot.exists()) {
      const senderBudget = senderBudgetSnapshot.val();
      await set(ref(db, `users/${currentUser.uid}/budget`), senderBudget);
    }
    
    // Oznacz zaproszenie jako zaakceptowane
    await update(inviteRef, {
      status: 'accepted',
      acceptedAt: new Date().toISOString()
    });
    
    // Wyślij wiadomość do nadawcy
    await sendSystemMessage(
      invitation.fromUserId,
      'invitation_accepted',
      `${displayName} (${currentUser.email}) zaakceptował(a) Twoje zaproszenie do współdzielenia budżetu.`,
      { invitationId, acceptedBy: currentUser.email }
    );
    
    return { success: true };
  } catch (error) {
    console.error('Błąd akceptowania zaproszenia:', error);
    throw error;
  }
}

/**
 * Odrzuć zaproszenie do budżetu
 */
export async function rejectBudgetInvitation(invitationId) {
  if (!currentUser) throw new Error('Brak zalogowanego użytkownika');
  
  try {
    const inviteRef = ref(db, `users/${currentUser.uid}/invitations/${invitationId}`);
    const snapshot = await get(inviteRef);
    
    if (!snapshot.exists()) {
      throw new Error('Zaproszenie nie istnieje');
    }
    
    const invitation = snapshot.val();
    
    // Oznacz zaproszenie jako odrzucone
    await update(inviteRef, {
      status: 'rejected',
      rejectedAt: new Date().toISOString()
    });
    
    // Wyślij wiadomość do nadawcy
    await sendSystemMessage(
      invitation.fromUserId,
      'invitation_rejected',
      `${displayName} (${currentUser.email}) odrzucił(a) Twoje zaproszenie do współdzielenia budżetu.`,
      { invitationId, rejectedBy: currentUser.email }
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
 * Konfiguruj listenery dla zaproszeń i wiadomości
 */
function setupNotificationListeners() {
  if (!currentUser) return;
  
  // Listener dla zaproszeń
  const invitationsRef = ref(db, `users/${currentUser.uid}/invitations`);
  invitesListener = onValue(invitationsRef, (snapshot) => {
    if (snapshot.exists()) {
      const invites = Object.values(snapshot.val());
      const pending = invites.filter(inv => inv.status === 'pending');
      pendingInvitesCount = pending.length;
      
      // Wywołaj callback jeśli istnieje
      if (window.onInvitesCountChange) {
        window.onInvitesCountChange(pendingInvitesCount);
      }
    } else {
      pendingInvitesCount = 0;
      if (window.onInvitesCountChange) {
        window.onInvitesCountChange(0);
      }
    }
  });
  
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
  if (invitesListener) invitesListener();
  if (messagesListener) messagesListener();
  invitesListener = null;
  messagesListener = null;
}

/**
 * Nasłuchuj zmian stanu uwierzytelnienia
 */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
      isAdmin = user.email === ADMIN_EMAIL;
      await loadUserProfile();
      setupNotificationListeners();
    } else {
      isAdmin = false;
      displayName = '';
      clearNotificationListeners();
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
 * Pobierz liczbę oczekujących zaproszeń
 */
export function getPendingInvitesCount() {
  return pendingInvitesCount;
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