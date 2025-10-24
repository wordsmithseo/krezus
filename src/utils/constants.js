// src/utils/constants.js
export const PAGINATION = {
  ITEMS_PER_PAGE: 8,
  EXPENSES_PER_PAGE: 100,
  INCOMES_PER_PAGE: 100,
  MAX_PAGE_BUTTONS: 5
};

export const DAILY_ENVELOPE = {
  ENABLED: true,
  DEFAULT_ROUNDING: 10,
  DEFAULT_INFLOW_RATIO: 0.0,
  DEFAULT_ROLLOVER_CAP_RATIO: 0.5,
  DEFAULT_PERIOD_END: 'primary'
};

export const ADMIN = {
  TIMEOUT_MINUTES: 5,
  EMAIL: 'slawomir.sprawski@gmail.com'
};

export const VALIDATION_LIMITS = {
  MAX_AMOUNT: 1000000,
  MAX_QUANTITY: 10000,
  MIN_CATEGORY_LENGTH: 2,
  MAX_CATEGORY_LENGTH: 50,
  MIN_PASSWORD_LENGTH: 6,
  MAX_PASSWORD_LENGTH: 100,
  MIN_DISPLAY_NAME_LENGTH: 2,
  MAX_DISPLAY_NAME_LENGTH: 50,
  DATE_PAST_YEARS: 10,
  DATE_FUTURE_YEARS: 5
};

export const DEFAULT_USERS = ['Martyna', 'Sławek'];

export const TRANSACTION_TYPES = {
  NORMAL: 'normal',
  PLANNED: 'planned'
};

export const COMPARISON_PERIODS = {
  WEEKLY: 'weekly',
  MONTHLY: 'monthly'
};

export const CHART_COLORS = {
  PRIMARY: '#6C5CE7',
  SECONDARY: '#00B894',
  INCOME: 'rgba(0, 184, 148, 0.8)',
  EXPENSE: '#e74c3c',
  SUCCESS: '#27ae60',
  WARNING: '#f39c12',
  DANGER: '#c0392b'
};

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'krezus_auth_token',
  USER_PREFERENCES: 'krezus_user_prefs'
};

export const ANIMATION_DELAYS = {
  TOAST: 5000,
  SUCCESS_TOAST: 3000,
  FLASH: 1000,
  MODAL_FADE: 300
};

export const BREAKPOINTS = {
  MOBILE: 480,
  TABLET: 768,
  DESKTOP: 1024,
  WIDE: 1440
};