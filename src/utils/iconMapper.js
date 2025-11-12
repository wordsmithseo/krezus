/**
 * Zaawansowany system mapowania ikon dla kategorii wydatków i źródeł wpływów
 * Używa dopasowania słów kluczowych, fuzzy matching i analizy semantycznej
 */

// Mapowanie słów kluczowych do ikon z priorytetem
const CATEGORY_KEYWORDS = [
  // Food & Groceries (wysoki priorytet)
  { keywords: ['spożywcze', 'spożywczy', 'zakupy', 'groceries', 'shopping', 'market', 'sklep', 'hipermarket', 'supermarket', 'biedronka', 'lidl', 'kaufland', 'carrefour', 'auchan', 'tesco', 'żabka', 'zabka', 'dino'], icon: '🛒', priority: 10 },
  { keywords: ['jedzenie', 'food', 'posiłek', 'meal', 'obiad', 'śniadanie', 'kolacja', 'lunch', 'dinner', 'breakfast'], icon: '🍽️', priority: 9 },
  { keywords: ['restauracja', 'restaurant', 'bistro', 'pizzeria', 'bar', 'pub', 'knajpa', 'gastro', 'lokal'], icon: '🍴', priority: 10 },
  { keywords: ['kawa', 'coffee', 'cafe', 'kawiarnia', 'starbucks', 'costa'], icon: '☕', priority: 10 },
  { keywords: ['fast food', 'mcdonalds', 'kfc', 'burger', 'kebab', 'subway', 'pizza hut', 'dominos'], icon: '🍔', priority: 10 },
  { keywords: ['deser', 'dessert', 'słodycze', 'sweets', 'ciastko', 'lody', 'ice cream', 'cukiernia', 'lodziarnia'], icon: '🍰', priority: 9 },
  { keywords: ['alkohol', 'alcohol', 'piwo', 'beer', 'wino', 'wine', 'wódka', 'vodka', 'drink', 'nalewka', 'trunek'], icon: '🍺', priority: 10 },
  { keywords: ['pizza'], icon: '🍕', priority: 10 },
  { keywords: ['sushi', 'azjatycki', 'asian', 'chińskie', 'chinese', 'thai', 'japońskie'], icon: '🍱', priority: 10 },

  // Transportation
  { keywords: ['paliwo', 'fuel', 'benzyna', 'diesel', 'gaz', 'lpg', 'tankowanie', 'orlen', 'shell', 'bp', 'lotos', 'circle k'], icon: '⛽', priority: 10 },
  { keywords: ['parking', 'parkometr', 'postój'], icon: '🅿️', priority: 10 },
  { keywords: ['autobus', 'bus', 'mpk', 'komunikacja', 'miejska', 'bilet'], icon: '🚌', priority: 10 },
  { keywords: ['taxi', 'uber', 'bolt', 'free now', 'freenow', 'taxi', 'przewóz'], icon: '🚕', priority: 10 },
  { keywords: ['metro', 'subway', 'underground'], icon: '🚇', priority: 10 },
  { keywords: ['pociąg', 'train', 'kolej', 'pkp', 'intercity', 'pendolino', 'tanie linie'], icon: '🚆', priority: 10 },
  { keywords: ['samolot', 'airplane', 'plane', 'flight', 'lot', 'airline', 'ryanair', 'wizzair', 'wizz'], icon: '✈️', priority: 10 },
  { keywords: ['rower', 'bike', 'bicycle', 'cycling', 'veturilo', 'nextbike'], icon: '🚴', priority: 10 },
  { keywords: ['transport', 'transportation', 'dojazd', 'przejazd', 'podróż służbowa'], icon: '🚗', priority: 5 },
  { keywords: ['auto', 'samochód', 'car', 'vehicle', 'pojazd', 'motoryzacja'], icon: '🚗', priority: 8 },
  { keywords: ['warsztat', 'garage', 'naprawa', 'serwis', 'mechanik', 'auto serwis'], icon: '🔧', priority: 10 },
  { keywords: ['myjnia', 'carwash', 'wash', 'mycie'], icon: '🚿', priority: 10 },
  { keywords: ['ubezpieczenie oc', 'oc', 'ac', 'ubezpieczenie auta'], icon: '🚗', priority: 9 },

  // Housing & Utilities
  { keywords: ['czynsz', 'rent', 'wynajem', 'mieszkanie', 'housing', 'apartment', 'najem'], icon: '🏠', priority: 10 },
  { keywords: ['prąd', 'electricity', 'energia', 'energy', 'tauron', 'pge', 'energa', 'enea'], icon: '⚡', priority: 10 },
  { keywords: ['woda', 'water', 'wodociąg', 'ścieki'], icon: '💧', priority: 10 },
  { keywords: ['gaz', 'gas', 'heating', 'ogrzewanie', 'ciepło'], icon: '🔥', priority: 10 },
  { keywords: ['internet', 'broadband', 'wifi', 'orange', 'play', 'plus', 'netia', 't-mobile', 'tmobile', 'vectra', 'multimedia'], icon: '📡', priority: 10 },
  { keywords: ['telefon', 'phone', 'mobile', 'komórka', 'abonament', 'prepaid', 'doładowanie'], icon: '📱', priority: 10 },
  { keywords: ['media', 'utilities', 'bills', 'rachunki', 'opłaty', 'administracja'], icon: '💡', priority: 5 },
  { keywords: ['remont', 'renovation', 'budowa', 'construction', 'remonty'], icon: '🔨', priority: 10 },
  { keywords: ['meble', 'furniture', 'ikea', 'agata', 'black red white'], icon: '🛋️', priority: 10 },
  { keywords: ['dekoracja', 'decoration', 'wystrój', 'dekoracje'], icon: '🖼️', priority: 9 },
  { keywords: ['sprzątanie', 'cleaning', 'środki czystości', 'detergent'], icon: '🧹', priority: 10 },

  // Health & Beauty
  { keywords: ['lekarz', 'doctor', 'physician', 'wizyta', 'konsultacja', 'prywatna', 'przychodnia'], icon: '👨‍⚕️', priority: 10 },
  { keywords: ['apteka', 'pharmacy', 'lekarstwa', 'medicine', 'lek', 'recepta', 'farmacja'], icon: '💊', priority: 10 },
  { keywords: ['szpital', 'hospital', 'clinic', 'klinika', 'leczenie'], icon: '🏥', priority: 10 },
  { keywords: ['dentysta', 'dentist', 'stomatolog', 'ortodonta', 'zęby'], icon: '🦷', priority: 10 },
  { keywords: ['okulary', 'glasses', 'optyk', 'optician', 'soczewki', 'okulista'], icon: '👓', priority: 10 },
  { keywords: ['fryzjer', 'hairdresser', 'barber', 'salon', 'fryzura', 'strzyżenie'], icon: '💇', priority: 10 },
  { keywords: ['kosmetyka', 'cosmetics', 'beauty', 'makeup', 'makijaż', 'kosmetyczka', 'perfumy'], icon: '💄', priority: 10 },
  { keywords: ['spa', 'masaż', 'massage', 'wellness', 'relaks'], icon: '💆', priority: 10 },
  { keywords: ['zdrowie', 'health', 'medical', 'rehabilitacja', 'fizjoterapeuta'], icon: '⚕️', priority: 5 },
  { keywords: ['badanie', 'test', 'analiza', 'lab', 'laboratorium'], icon: '🔬', priority: 10 },

  // Education
  { keywords: ['szkoła', 'school', 'university', 'uczelnia', 'studia', 'uniwersytet', 'politechnika'], icon: '🎓', priority: 10 },
  { keywords: ['kurs', 'course', 'szkolenie', 'training', 'warsztat', 'workshop', 'webinar'], icon: '📖', priority: 10 },
  { keywords: ['książka', 'book', 'podręcznik', 'literatura', 'empik', 'księgarnia'], icon: '📚', priority: 10 },
  { keywords: ['edukacja', 'education', 'nauka', 'learning', 'wiedza'], icon: '📚', priority: 5 },
  { keywords: ['czesne', 'tuition', 'opłata', 'wpisowe'], icon: '💳', priority: 9 },
  { keywords: ['korepetycje', 'tutoring', 'lekcje', 'prywatne'], icon: '👨‍🏫', priority: 10 },

  // Entertainment
  { keywords: ['kino', 'cinema', 'movie', 'film', 'helios', 'multikino', 'cinema city'], icon: '🎬', priority: 10 },
  { keywords: ['teatr', 'theater', 'theatre', 'spektakl', 'opera', 'filharmonia'], icon: '🎭', priority: 10 },
  { keywords: ['koncert', 'concert', 'festival', 'festiwal', 'bilet'], icon: '🎵', priority: 10 },
  { keywords: ['muzyka', 'music', 'spotify', 'apple music', 'tidal', 'deezer'], icon: '🎵', priority: 9 },
  { keywords: ['gry', 'games', 'gaming', 'playstation', 'xbox', 'steam', 'nintendo', 'gra'], icon: '🎮', priority: 10 },
  { keywords: ['netflix', 'hbo', 'disney', 'streaming', 'subskrypcja', 'amazon prime', 'player'], icon: '📺', priority: 10 },
  { keywords: ['sport', 'fitness', 'gym', 'siłownia', 'basen', 'pool', 'trening', 'ćwiczenia'], icon: '🏋️', priority: 10 },
  { keywords: ['karnet', 'membership', 'pass', 'wejściówka'], icon: '🎫', priority: 9 },
  { keywords: ['piłka', 'football', 'soccer', 'boisko'], icon: '⚽', priority: 10 },
  { keywords: ['zabawa', 'party', 'impreza', 'fun', 'klub', 'dyskoteka'], icon: '🎉', priority: 9 },
  { keywords: ['rozrywka', 'entertainment', 'hobby', 'wypoczynek'], icon: '🎬', priority: 5 },
  { keywords: ['zoo', 'aquapark', 'park rozrywki', 'atrakcje'], icon: '🎪', priority: 10 },

  // Clothing & Shopping
  { keywords: ['ubranie', 'clothes', 'clothing', 'odzież', 'reserved', 'zara', 'h&m', 'hm'], icon: '👕', priority: 9 },
  { keywords: ['buty', 'shoes', 'obuwie', 'sneakers', 'adidasy', 'nike', 'adidas'], icon: '👟', priority: 10 },
  { keywords: ['kurtka', 'jacket', 'płaszcz', 'coat'], icon: '🧥', priority: 10 },
  { keywords: ['moda', 'fashion', 'style', 'trendy'], icon: '👗', priority: 8 },
  { keywords: ['biżuteria', 'jewelry', 'jewellery', 'złoto', 'srebro'], icon: '💎', priority: 10 },
  { keywords: ['zegarek', 'watch', 'smartwatch'], icon: '⌚', priority: 10 },
  { keywords: ['torba', 'bag', 'plecak', 'backpack', 'walizka'], icon: '👜', priority: 10 },

  // Travel & Vacation
  { keywords: ['wakacje', 'vacation', 'holiday', 'urlop', 'wyjazd'], icon: '🏖️', priority: 10 },
  { keywords: ['wycieczka', 'trip', 'travel', 'podróż', 'zwiedzanie'], icon: '✈️', priority: 9 },
  { keywords: ['hotel', 'hostel', 'nocleg', 'accommodation', 'booking'], icon: '🏨', priority: 10 },
  { keywords: ['rezerwacja', 'booking', 'airbnb', 'apartament'], icon: '🏨', priority: 9 },
  { keywords: ['wiza', 'visa', 'paszport', 'passport', 'dokumenty'], icon: '🛂', priority: 10 },
  { keywords: ['ubezpieczenie', 'insurance', 'nnw', 'turystyczne'], icon: '🛡️', priority: 10 },
  { keywords: ['narty', 'ski', 'snowboard', 'góry'], icon: '⛷️', priority: 10 },
  { keywords: ['plaża', 'beach', 'morze', 'sea'], icon: '🏖️', priority: 10 },

  // Pets
  { keywords: ['zwierzę', 'zwierzęta', 'pet', 'pets', 'pupil'], icon: '🐾', priority: 8 },
  { keywords: ['pies', 'dog', 'puppy', 'szczeniak', 'piesek'], icon: '🐕', priority: 10 },
  { keywords: ['kot', 'cat', 'kitty', 'kotek', 'kociak'], icon: '🐱', priority: 10 },
  { keywords: ['weterynarz', 'vet', 'veterinary', 'weterynaryjny'], icon: '🏥', priority: 10 },
  { keywords: ['karma', 'food', 'pokarm', 'żarcie dla'], icon: '🦴', priority: 9 },

  // Gifts & Special
  { keywords: ['prezent', 'gift', 'podarunek', 'upominek'], icon: '🎁', priority: 10 },
  { keywords: ['urodziny', 'birthday', 'urodzinowy', 'urodzinowa'], icon: '🎂', priority: 10 },
  { keywords: ['ślub', 'wedding', 'wesele', 'małżeństwo'], icon: '💒', priority: 10 },
  { keywords: ['walentynki', 'valentine', 'walentynkowy'], icon: '❤️', priority: 10 },
  { keywords: ['święta', 'christmas', 'boże narodzenie', 'wigilia'], icon: '🎄', priority: 10 },
  { keywords: ['darowizna', 'donation', 'charity', 'charytatywny', 'wpłata'], icon: '🤝', priority: 10 },
  { keywords: ['kwiat', 'flower', 'kwiaty', 'bukiet', 'róża'], icon: '💐', priority: 10 },

  // Work & Office
  { keywords: ['biuro', 'office', 'workplace', 'biurowy'], icon: '🏢', priority: 10 },
  { keywords: ['praca', 'work', 'job', 'zawodowy'], icon: '💼', priority: 8 },
  { keywords: ['komputer', 'computer', 'laptop', 'pc', 'notebook', 'macbook'], icon: '💻', priority: 10 },
  { keywords: ['drukarka', 'printer', 'toner', 'atrament'], icon: '🖨️', priority: 10 },
  { keywords: ['papier', 'paper', 'materiały', 'biurowe', 'notes'], icon: '📄', priority: 9 },
  { keywords: ['długopis', 'pen', 'ołówek', 'pencil'], icon: '✏️', priority: 10 },

  // Finance & Banking
  { keywords: ['bank', 'banking', 'bankowy'], icon: '🏦', priority: 9 },
  { keywords: ['oszczędności', 'savings', 'oszczędzanie', 'odkładanie'], icon: '🏦', priority: 10 },
  { keywords: ['inwestycja', 'investment', 'inwestowanie', 'akcje', 'stocks', 'giełda'], icon: '📈', priority: 10 },
  { keywords: ['podatek', 'tax', 'vat', 'pit', 'zus', 'składka'], icon: '📊', priority: 10 },
  { keywords: ['kredyt', 'loan', 'pożyczka', 'rata', 'leasing'], icon: '💳', priority: 10 },
  { keywords: ['opłata', 'fee', 'charge', 'prowizja', 'przelew'], icon: '💰', priority: 8 },
  { keywords: ['konto', 'account', 'rachunek'], icon: '🏦', priority: 8 },

  // Electronics
  { keywords: ['telefon', 'phone', 'smartphone', 'iphone', 'samsung', 'xiaomi', 'huawei'], icon: '📱', priority: 9 },
  { keywords: ['elektronika', 'electronics', 'sprzęt', 'rtv', 'agd'], icon: '📱', priority: 7 },
  { keywords: ['telewizor', 'tv', 'television', 'smart tv'], icon: '📺', priority: 10 },
  { keywords: ['słuchawki', 'headphones', 'earphones', 'airpods'], icon: '🎧', priority: 10 },
  { keywords: ['tablet', 'ipad'], icon: '📱', priority: 9 },
  { keywords: ['aparat', 'camera', 'fotograficzny', 'foto'], icon: '📷', priority: 10 },

  // Children & Family
  { keywords: ['dziecko', 'dzieci', 'child', 'children', 'kids', 'maluchy'], icon: '👶', priority: 10 },
  { keywords: ['zabawka', 'toy', 'zabawki', 'toys', 'gry', 'klocki'], icon: '🧸', priority: 10 },
  { keywords: ['pieluch', 'diaper', 'pampers'], icon: '👶', priority: 10 },
  { keywords: ['żłobek', 'przedszkole', 'kindergarten', 'nursery'], icon: '🏫', priority: 10 },

  // Other common
  { keywords: ['inne', 'other', 'różne', 'misc', 'miscellaneous', 'pozostałe'], icon: '📌', priority: 1 },
  { keywords: ['ogólny', 'general', 'ogólne'], icon: '💼', priority: 1 }
];

const INCOME_KEYWORDS = [
  { keywords: ['wynagrodzenie', 'salary', 'pensja', 'wypłata', 'wage', 'płaca', 'pobory'], icon: '💵', priority: 10 },
  { keywords: ['premia', 'bonus', 'nagroda', 'award', 'dodatek'], icon: '🎁', priority: 10 },
  { keywords: ['freelance', 'wolny zawód', 'contracting', 'zlecenie', 'b2b'], icon: '💻', priority: 10 },
  { keywords: ['biznes', 'business', 'firma', 'company', 'działalność'], icon: '💼', priority: 9 },
  { keywords: ['sprzedaż', 'sales', 'selling', 'sell', 'handel'], icon: '📦', priority: 10 },
  { keywords: ['zwrot', 'refund', 'return', 'reimbursement', 'rekompensata'], icon: '↩️', priority: 10 },
  { keywords: ['odsetki', 'interest', 'dividend', 'dywidenda', 'zysk'], icon: '💰', priority: 10 },
  { keywords: ['lokata', 'deposit', 'savings', 'oszczędności'], icon: '🏦', priority: 10 },
  { keywords: ['prezent', 'gift', 'podarunek', 'upominek'], icon: '🎁', priority: 9 },
  { keywords: ['inwestycja', 'investment', 'stock', 'akcje', 'sprzedaż akcji'], icon: '📈', priority: 10 },
  { keywords: ['wynajem', 'rent', 'rental', 'lease', 'najem'], icon: '🏠', priority: 10 },
  { keywords: ['stypendium', 'scholarship', 'grant', 'dotacja'], icon: '🎓', priority: 10 },
  { keywords: ['zasiłek', 'benefit', 'social', 'pomoc'], icon: '🤝', priority: 10 },
  { keywords: ['inne', 'other', 'różne', 'misc', 'pozostałe'], icon: '💸', priority: 1 }
];

/**
 * Oblicz odległość Levenshteina (fuzzy matching)
 * @param {string} a - Pierwszy ciąg
 * @param {string} b - Drugi ciąg
 * @returns {number} Odległość
 */
function levenshteinDistance(a, b) {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Oblicz podobieństwo między dwoma ciągami (0-1)
 * @param {string} a - Pierwszy ciąg
 * @param {string} b - Drugi ciąg
 * @returns {number} Podobieństwo (0-1)
 */
function similarity(a, b) {
  const maxLength = Math.max(a.length, b.length);
  if (maxLength === 0) return 1.0;
  const distance = levenshteinDistance(a, b);
  return 1.0 - distance / maxLength;
}

/**
 * Inteligentne dopasowanie ikony na podstawie słów kluczowych i fuzzy matching
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

      // 1. Dokładne dopasowanie - najwyższy priorytet
      if (normalizedName === normalizedKeyword) {
        return item.icon;
      }

      // 2. Dopasowanie całego słowa
      const wordBoundaryRegex = new RegExp(`\\b${normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (wordBoundaryRegex.test(normalizedName)) {
        const score = item.priority * 3; // Wysoki bonus za dopasowanie całego słowa
        if (score > bestScore) {
          bestScore = score;
          bestMatch = item.icon;
        }
        continue;
      }

      // 3. Dopasowanie jako część słowa
      if (normalizedName.includes(normalizedKeyword)) {
        const score = item.priority * 2; // Średni bonus
        if (score > bestScore) {
          bestScore = score;
          bestMatch = item.icon;
        }
        continue;
      }

      // 4. Fuzzy matching - podobieństwo > 80%
      const sim = similarity(normalizedName, normalizedKeyword);
      if (sim > 0.8) {
        const score = item.priority * sim * 1.5; // Bonus za wysokie podobieństwo
        if (score > bestScore) {
          bestScore = score;
          bestMatch = item.icon;
        }
      }

      // 5. Fuzzy matching dla każdego słowa w nazwie
      const words = normalizedName.split(/\s+/);
      for (const word of words) {
        const wordSim = similarity(word, normalizedKeyword);
        if (wordSim > 0.75) {
          const score = item.priority * wordSim;
          if (score > bestScore) {
            bestScore = score;
            bestMatch = item.icon;
          }
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
