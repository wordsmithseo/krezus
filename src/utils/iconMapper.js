/**
 * Inteligentny system mapowania ikon dla kategorii wydatków i źródeł wpływów
 * Używa dopasowania słów kluczowych i kontekstu
 */

// Mapowanie słów kluczowych do ikon z priorytetem
const CATEGORY_KEYWORDS = [
  // Food & Groceries (wysoki priorytet)
  { keywords: ['spożywcze', 'spożywczy', 'zakupy', 'groceries', 'shopping', 'market', 'sklep'], icon: '🛒', priority: 10 },
  { keywords: ['jedzenie', 'food', 'posiłek', 'meal'], icon: '🍽️', priority: 9 },
  { keywords: ['restauracja', 'restaurant', 'bistro', 'pizzeria', 'bar', 'pub'], icon: '🍴', priority: 10 },
  { keywords: ['kawa', 'coffee', 'cafe', 'kawiarnia'], icon: '☕', priority: 10 },
  { keywords: ['fast food', 'mcdonalds', 'kfc', 'burger', 'kebab'], icon: '🍔', priority: 10 },
  { keywords: ['deser', 'dessert', 'słodycze', 'sweets', 'ciastko', 'lody', 'ice cream'], icon: '🍰', priority: 9 },
  { keywords: ['alkohol', 'alcohol', 'piwo', 'beer', 'wino', 'wine', 'wódka', 'vodka'], icon: '🍺', priority: 10 },

  // Transportation
  { keywords: ['paliwo', 'fuel', 'benzyna', 'diesel', 'gaz', 'lpg', 'tankowanie'], icon: '⛽', priority: 10 },
  { keywords: ['parking', 'parkometr'], icon: '🅿️', priority: 10 },
  { keywords: ['autobus', 'bus', 'mpk', 'komunikacja'], icon: '🚌', priority: 10 },
  { keywords: ['taxi', 'uber', 'bolt', 'free now'], icon: '🚕', priority: 10 },
  { keywords: ['metro', 'subway'], icon: '🚇', priority: 10 },
  { keywords: ['pociąg', 'train', 'kolej', 'pkp', 'intercity'], icon: '🚆', priority: 10 },
  { keywords: ['samolot', 'airplane', 'plane', 'flight', 'lot', 'airline'], icon: '✈️', priority: 10 },
  { keywords: ['rower', 'bike', 'bicycle', 'cycling'], icon: '🚴', priority: 10 },
  { keywords: ['transport', 'transportation', 'dojazd', 'przejazd'], icon: '🚗', priority: 5 },
  { keywords: ['auto', 'samochód', 'car', 'vehicle', 'pojazd'], icon: '🚗', priority: 8 },
  { keywords: ['warsztat', 'garage', 'naprawa', 'serwis', 'mechanik'], icon: '🔧', priority: 10 },

  // Housing & Utilities
  { keywords: ['czynsz', 'rent', 'wynajem', 'mieszkanie', 'housing', 'apartment'], icon: '🏠', priority: 10 },
  { keywords: ['prąd', 'electricity', 'energia', 'energy', 'tauron', 'pge'], icon: '⚡', priority: 10 },
  { keywords: ['woda', 'water', 'wodociąg'], icon: '💧', priority: 10 },
  { keywords: ['gaz', 'gas', 'heating', 'ogrzewanie'], icon: '🔥', priority: 10 },
  { keywords: ['internet', 'broadband', 'wifi', 'orange', 'play', 'plus', 'netia'], icon: '📡', priority: 10 },
  { keywords: ['telefon', 'phone', 'mobile', 'komórka', 'abonament'], icon: '📱', priority: 10 },
  { keywords: ['media', 'utilities', 'bills', 'rachunki'], icon: '💡', priority: 5 },
  { keywords: ['remont', 'renovation', 'budowa', 'construction'], icon: '🔨', priority: 10 },
  { keywords: ['meble', 'furniture', 'ikea'], icon: '🛋️', priority: 10 },
  { keywords: ['dekoracja', 'decoration', 'wystrój'], icon: '🖼️', priority: 9 },

  // Health & Beauty
  { keywords: ['lekarz', 'doctor', 'physician', 'wizyta', 'konsultacja'], icon: '👨‍⚕️', priority: 10 },
  { keywords: ['apteka', 'pharmacy', 'lekarstwa', 'medicine', 'lek'], icon: '💊', priority: 10 },
  { keywords: ['szpital', 'hospital', 'clinic', 'klinika'], icon: '🏥', priority: 10 },
  { keywords: ['dentysta', 'dentist', 'stomatolog'], icon: '🦷', priority: 10 },
  { keywords: ['okulary', 'glasses', 'optyk', 'optician'], icon: '👓', priority: 10 },
  { keywords: ['fryzjer', 'hairdresser', 'barber', 'salon', 'fryzura'], icon: '💇', priority: 10 },
  { keywords: ['kosmetyka', 'cosmetics', 'beauty', 'makeup', 'makijaż'], icon: '💄', priority: 10 },
  { keywords: ['spa', 'masaż', 'massage', 'wellness'], icon: '💆', priority: 10 },
  { keywords: ['zdrowie', 'health', 'medical'], icon: '⚕️', priority: 5 },

  // Education
  { keywords: ['szkoła', 'school', 'university', 'uczelnia', 'studia'], icon: '🎓', priority: 10 },
  { keywords: ['kurs', 'course', 'szkolenie', 'training', 'warsztat', 'workshop'], icon: '📖', priority: 10 },
  { keywords: ['książka', 'book', 'podręcznik', 'literatura'], icon: '📚', priority: 10 },
  { keywords: ['edukacja', 'education', 'nauka', 'learning'], icon: '📚', priority: 5 },
  { keywords: ['czesne', 'tuition', 'opłata'], icon: '💳', priority: 9 },

  // Entertainment
  { keywords: ['kino', 'cinema', 'movie', 'film', 'helios', 'multikino'], icon: '🎬', priority: 10 },
  { keywords: ['teatr', 'theater', 'theatre', 'spektakl'], icon: '🎭', priority: 10 },
  { keywords: ['koncert', 'concert', 'festival', 'festiwal'], icon: '🎵', priority: 10 },
  { keywords: ['muzyka', 'music', 'spotify', 'apple music'], icon: '🎵', priority: 9 },
  { keywords: ['gry', 'games', 'gaming', 'playstation', 'xbox', 'steam'], icon: '🎮', priority: 10 },
  { keywords: ['netflix', 'hbo', 'disney', 'streaming', 'subskrypcja'], icon: '📺', priority: 10 },
  { keywords: ['sport', 'fitness', 'gym', 'siłownia', 'basen', 'pool'], icon: '🏋️', priority: 10 },
  { keywords: ['karnet', 'membership', 'pass'], icon: '🎫', priority: 9 },
  { keywords: ['piłka', 'football', 'soccer'], icon: '⚽', priority: 10 },
  { keywords: ['zabawa', 'party', 'impreza', 'fun'], icon: '🎉', priority: 9 },
  { keywords: ['rozrywka', 'entertainment', 'hobby'], icon: '🎬', priority: 5 },

  // Clothing & Shopping
  { keywords: ['ubranie', 'clothes', 'clothing', 'odzież'], icon: '👕', priority: 9 },
  { keywords: ['buty', 'shoes', 'obuwie', 'sneakers'], icon: '👟', priority: 10 },
  { keywords: ['kurtka', 'jacket', 'płaszcz', 'coat'], icon: '🧥', priority: 10 },
  { keywords: ['moda', 'fashion', 'style'], icon: '👗', priority: 8 },
  { keywords: ['biżuteria', 'jewelry', 'jewellery'], icon: '💎', priority: 10 },
  { keywords: ['zegarek', 'watch'], icon: '⌚', priority: 10 },
  { keywords: ['torba', 'bag', 'plecak', 'backpack'], icon: '👜', priority: 10 },

  // Travel & Vacation
  { keywords: ['wakacje', 'vacation', 'holiday', 'urlop'], icon: '🏖️', priority: 10 },
  { keywords: ['wycieczka', 'trip', 'travel', 'podróż'], icon: '✈️', priority: 9 },
  { keywords: ['hotel', 'hostel', 'nocleg', 'accommodation'], icon: '🏨', priority: 10 },
  { keywords: ['rezerwacja', 'booking', 'airbnb'], icon: '🏨', priority: 9 },
  { keywords: ['wiza', 'visa', 'paszport', 'passport'], icon: '🛂', priority: 10 },
  { keywords: ['ubezpieczenie', 'insurance'], icon: '🛡️', priority: 10 },

  // Pets
  { keywords: ['zwierzę', 'zwierzęta', 'pet', 'pets'], icon: '🐾', priority: 8 },
  { keywords: ['pies', 'dog', 'puppy', 'szczeniak'], icon: '🐕', priority: 10 },
  { keywords: ['kot', 'cat', 'kitty', 'kotek'], icon: '🐱', priority: 10 },
  { keywords: ['weterynarz', 'vet', 'veterinary'], icon: '🏥', priority: 10 },
  { keywords: ['karma', 'food', 'pokarm'], icon: '🦴', priority: 9 },

  // Gifts & Special
  { keywords: ['prezent', 'gift', 'podarunek'], icon: '🎁', priority: 10 },
  { keywords: ['urodziny', 'birthday', 'urodzinowy'], icon: '🎂', priority: 10 },
  { keywords: ['ślub', 'wedding', 'wesele'], icon: '💒', priority: 10 },
  { keywords: ['walentynki', 'valentine'], icon: '❤️', priority: 10 },
  { keywords: ['święta', 'christmas', 'boże narodzenie'], icon: '🎄', priority: 10 },
  { keywords: ['darowizna', 'donation', 'charity', 'charytatywny'], icon: '🤝', priority: 10 },

  // Work & Office
  { keywords: ['biuro', 'office', 'workplace'], icon: '🏢', priority: 10 },
  { keywords: ['praca', 'work', 'job'], icon: '💼', priority: 8 },
  { keywords: ['komputer', 'computer', 'laptop', 'pc'], icon: '💻', priority: 10 },
  { keywords: ['drukarka', 'printer', 'toner'], icon: '🖨️', priority: 10 },
  { keywords: ['papier', 'paper', 'materiały'], icon: '📄', priority: 9 },

  // Finance & Banking
  { keywords: ['bank', 'banking'], icon: '🏦', priority: 9 },
  { keywords: ['oszczędności', 'savings', 'oszczędzanie'], icon: '🏦', priority: 10 },
  { keywords: ['inwestycja', 'investment', 'inwestowanie', 'akcje', 'stocks'], icon: '📈', priority: 10 },
  { keywords: ['podatek', 'tax', 'vat', 'pit'], icon: '📊', priority: 10 },
  { keywords: ['kredyt', 'loan', 'pożyczka'], icon: '💳', priority: 10 },
  { keywords: ['opłata', 'fee', 'charge', 'prowizja'], icon: '💰', priority: 8 },

  // Electronics
  { keywords: ['telefon', 'phone', 'smartphone', 'iphone', 'samsung'], icon: '📱', priority: 9 },
  { keywords: ['elektronika', 'electronics', 'sprzęt'], icon: '📱', priority: 7 },
  { keywords: ['telewizor', 'tv', 'television'], icon: '📺', priority: 10 },
  { keywords: ['słuchawki', 'headphones', 'earphones'], icon: '🎧', priority: 10 },

  // Other common
  { keywords: ['inne', 'other', 'różne', 'misc', 'miscellaneous'], icon: '📌', priority: 1 },
  { keywords: ['ogólny', 'general'], icon: '💼', priority: 1 }
];

const INCOME_KEYWORDS = [
  { keywords: ['wynagrodzenie', 'salary', 'pensja', 'wypłata', 'wage', 'płaca'], icon: '💵', priority: 10 },
  { keywords: ['premia', 'bonus', 'nagroda', 'award'], icon: '🎁', priority: 10 },
  { keywords: ['freelance', 'wolny zawód', 'contracting', 'zlecenie'], icon: '💻', priority: 10 },
  { keywords: ['biznes', 'business', 'firma', 'company'], icon: '💼', priority: 9 },
  { keywords: ['sprzedaż', 'sales', 'selling', 'sell'], icon: '📦', priority: 10 },
  { keywords: ['zwrot', 'refund', 'return', 'reimbursement'], icon: '↩️', priority: 10 },
  { keywords: ['odsetki', 'interest', 'dividend', 'dywidenda'], icon: '💰', priority: 10 },
  { keywords: ['lokata', 'deposit', 'savings'], icon: '🏦', priority: 10 },
  { keywords: ['prezent', 'gift', 'podarunek'], icon: '🎁', priority: 9 },
  { keywords: ['inwestycja', 'investment', 'stock', 'akcje'], icon: '📈', priority: 10 },
  { keywords: ['wynajem', 'rent', 'rental', 'lease'], icon: '🏠', priority: 10 },
  { keywords: ['inne', 'other', 'różne', 'misc'], icon: '💸', priority: 1 }
];

/**
 * Inteligentne dopasowanie ikony na podstawie słów kluczowych
 * @param {string} name - Nazwa kategorii/źródła
 * @param {Array} keywordsList - Lista z mapowaniami słów kluczowych
 * @param {string} defaultIcon - Domyślna ikona
 * @returns {string} Dopasowana ikona
 */
function smartMatch(name, keywordsList, defaultIcon) {
  if (!name || typeof name !== 'string') return defaultIcon;

  const normalizedName = name.toLowerCase().trim();

  // Szukaj najlepszego dopasowania
  let bestMatch = null;
  let bestScore = 0;

  for (const item of keywordsList) {
    for (const keyword of item.keywords) {
      const normalizedKeyword = keyword.toLowerCase();

      // Dokładne dopasowanie - najwyższy priorytet
      if (normalizedName === normalizedKeyword) {
        return item.icon;
      }

      // Dopasowanie całego słowa
      const wordBoundaryRegex = new RegExp(`\\b${normalizedKeyword}\\b`, 'i');
      if (wordBoundaryRegex.test(normalizedName)) {
        const score = item.priority * 2; // Bonus za dopasowanie całego słowa
        if (score > bestScore) {
          bestScore = score;
          bestMatch = item.icon;
        }
        continue;
      }

      // Dopasowanie jako część słowa
      if (normalizedName.includes(normalizedKeyword)) {
        const score = item.priority;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = item.icon;
        }
      }
    }
  }

  return bestMatch || defaultIcon;
}

/**
 * Pobierz ikonę dla kategorii wydatku
 * @param {string} categoryName - Nazwa kategorii
 * @returns {string} Ikona emoji
 */
export function getCategoryIcon(categoryName) {
  return smartMatch(categoryName, CATEGORY_KEYWORDS, '📌');
}

/**
 * Pobierz ikonę dla źródła wpływu
 * @param {string} sourceName - Nazwa źródła
 * @returns {string} Ikona emoji
 */
export function getSourceIcon(sourceName) {
  return smartMatch(sourceName, INCOME_KEYWORDS, '💸');
}

/**
 * Pobierz wszystkie unikalne ikony kategorii
 * @returns {Array} Tablica ikon
 */
export function getAllCategoryIcons() {
  const icons = new Set();
  CATEGORY_KEYWORDS.forEach(item => icons.add(item.icon));
  return Array.from(icons);
}

/**
 * Pobierz wszystkie unikalne ikony wpływów
 * @returns {Array} Tablica ikon
 */
export function getAllIncomeIcons() {
  const icons = new Set();
  INCOME_KEYWORDS.forEach(item => icons.add(item.icon));
  return Array.from(icons);
}

/**
 * Pobierz sugestie ikon dla kategorii
 * @param {string} categoryName - Nazwa kategorii
 * @param {number} limit - Maksymalna liczba sugestii
 * @returns {Array} Tablica sugerowanych ikon
 */
export function suggestCategoryIcons(categoryName, limit = 5) {
  if (!categoryName) return [];

  const normalizedName = categoryName.toLowerCase().trim();
  const suggestions = [];

  for (const item of CATEGORY_KEYWORDS) {
    for (const keyword of item.keywords) {
      if (normalizedName.includes(keyword.toLowerCase()) ||
          keyword.toLowerCase().includes(normalizedName)) {
        suggestions.push({
          icon: item.icon,
          keyword: keyword,
          priority: item.priority
        });
        break;
      }
    }
  }

  // Sortuj po priorytecie i zwróć unikalne ikony
  return suggestions
    .sort((a, b) => b.priority - a.priority)
    .map(s => s.icon)
    .filter((icon, index, self) => self.indexOf(icon) === index)
    .slice(0, limit);
}
