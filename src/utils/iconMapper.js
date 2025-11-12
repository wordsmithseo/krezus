/**
 * Icon mapping for expense categories and income sources
 * Maps common category/source names to emoji icons
 */

export const CATEGORY_ICONS = {
  // Groceries & Food
  'Spożywcze': '🛒',
  'Groceries': '🛒',
  'Jedzenie': '🍽️',
  'Food': '🍽️',
  'Restauracja': '🍴',
  'Restaurant': '🍴',
  'Kawa': '☕',
  'Coffee': '☕',

  // Transportation
  'Transport': '🚗',
  'Transportation': '🚗',
  'Paliwo': '⛽',
  'Fuel': '⛽',
  'Parking': '🅿️',
  'Autobus': '🚌',
  'Bus': '🚌',
  'Taxi': '🚕',
  'Metro': '🚇',

  // Housing
  'Mieszkanie': '🏠',
  'Housing': '🏠',
  'Czynsz': '🏠',
  'Rent': '🏠',
  'Media': '💡',
  'Utilities': '💡',
  'Woda': '💧',
  'Water': '💧',
  'Gaz': '🔥',
  'Prąd': '⚡',
  'Electricity': '⚡',
  'Internet': '📡',
  'Telefon': '📱',
  'Phone': '📱',

  // Health & Beauty
  'Zdrowie': '⚕️',
  'Health': '⚕️',
  'Lekarz': '👨‍⚕️',
  'Doctor': '👨‍⚕️',
  'Apteka': '💊',
  'Pharmacy': '💊',
  'Kosmetyka': '💄',
  'Beauty': '💄',
  'Fryzjer': '💇',
  'Salon': '💇',

  // Education
  'Edukacja': '📚',
  'Education': '📚',
  'Kurs': '📖',
  'Course': '📖',
  'Szkoła': '🎓',
  'School': '🎓',

  // Entertainment
  'Rozrywka': '🎬',
  'Entertainment': '🎬',
  'Kino': '🎬',
  'Cinema': '🎬',
  'Muzyka': '🎵',
  'Music': '🎵',
  'Gry': '🎮',
  'Games': '🎮',
  'Sport': '⚽',
  'Gym': '🏋️',
  'Fitnes': '🏋️',

  // Clothing & Accessories
  'Odzież': '👕',
  'Clothes': '👕',
  'Buty': '👟',
  'Shoes': '👟',
  'Moda': '👗',
  'Fashion': '👗',

  // Travel & Vacation
  'Podróż': '✈️',
  'Travel': '✈️',
  'Wakacje': '🏖️',
  'Vacation': '🏖️',
  'Hotel': '🏨',
  'Rezerwacja': '🏨',

  // Pet Care
  'Zwierzęta': '🐾',
  'Pets': '🐾',
  'Pies': '🐕',
  'Dog': '🐕',
  'Kot': '🐱',
  'Cat': '🐱',

  // Gifts & Donations
  'Prezent': '🎁',
  'Gift': '🎁',
  'Darowizna': '🤝',
  'Donation': '🤝',

  // Work & Office
  'Praca': '💼',
  'Work': '💼',
  'Biuro': '🏢',
  'Office': '🏢',

  // Savings & Goals
  'Oszczędności': '🏦',
  'Savings': '🏦',
  'Inwestycja': '📈',
  'Investment': '📈',

  // General/Other
  'Inne': '📌',
  'Other': '📌',
  'Różne': '📌',
  'Misc': '📌'
};

export const INCOME_SOURCES = {
  'Wynagrodzenie': '💵',
  'Salary': '💵',
  'Premja': '🎁',
  'Bonus': '🎁',
  'Freelance': '💻',
  'Wolny zawód': '💻',
  'Lokata': '🏦',
  'Interest': '💰',
  'Odsetki': '💰',
  'Sprzedaż': '📦',
  'Sales': '📦',
  'Zwrot': '↩️',
  'Refund': '↩️',
  'Inne': '💸',
  'Other': '💸'
};

/**
 * Get icon for expense category
 * @param {string} categoryName - Category name
 * @returns {string} Emoji icon
 */
export function getCategoryIcon(categoryName) {
  if (!categoryName) return '📌';

  // Try exact match first
  if (CATEGORY_ICONS[categoryName]) {
    return CATEGORY_ICONS[categoryName];
  }

  // Try case-insensitive match
  const key = Object.keys(CATEGORY_ICONS).find(k =>
    k.toLowerCase() === categoryName.toLowerCase()
  );

  return key ? CATEGORY_ICONS[key] : '📌'; // Default icon
}

/**
 * Get icon for income source
 * @param {string} sourceName - Source name
 * @returns {string} Emoji icon
 */
export function getSourceIcon(sourceName) {
  if (!sourceName) return '💸';

  // Try exact match first
  if (INCOME_SOURCES[sourceName]) {
    return INCOME_SOURCES[sourceName];
  }

  // Try case-insensitive match
  const key = Object.keys(INCOME_SOURCES).find(k =>
    k.toLowerCase() === sourceName.toLowerCase()
  );

  return key ? INCOME_SOURCES[key] : '💸'; // Default icon
}

/**
 * Get all available category icons
 * @returns {Object} Icon mapping
 */
export function getAllCategoryIcons() {
  return { ...CATEGORY_ICONS };
}

/**
 * Get all available income icons
 * @returns {Object} Icon mapping
 */
export function getAllIncomeIcons() {
  return { ...INCOME_SOURCES };
}
