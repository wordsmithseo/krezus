// src/app.js - WERSJA TESTOWA

console.log('🚀 JavaScript załadowany!');

// Czekaj na DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function init() {
  console.log('✅ DOM gotowy!');
  
  const authContainer = document.getElementById('authContainer');
  const appContainer = document.getElementById('appContainer');
  
  if (!authContainer || !appContainer) {
    console.error('❌ Nie znaleziono kontenerów!');
    return;
  }
  
  console.log('✅ Kontenery znalezione!');
  
  // Pokaż formularz logowania
  authContainer.style.display = 'block';
  appContainer.style.display = 'none';
  
  console.log('✅ Formularz logowania wyświetlony');
  
  // Test Firebase
  testFirebase();
}

async function testFirebase() {
  try {
    console.log('🔥 Ładowanie Firebase...');
    const { auth } = await import('./config/firebase.js');
    console.log('✅ Firebase załadowany:', auth);
  } catch (error) {
    console.error('❌ Błąd Firebase:', error);
  }
}