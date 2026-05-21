/**
 * System ikon — cienki wrapper nad lucide.
 * Użycie w szablonach innerHTML: icon('Plus', { size: 14 })
 * Użycie w DOM: iconEl('Trash2')
 */

import {
  createElement as lucideCreateElement,
  LayoutDashboard, Mail, ArrowDown, ArrowUp, Tag, Gem, LineChart, Target, Settings,
  Plus, Search, Filter, Pencil, Trash2, MoreHorizontal, Check, X,
  Calendar, Clock, TrendingUp, TrendingDown, Wallet, Sparkles, Users, User,
  Bell, Download, Lock, LogOut, Eye, Info, Shield, Banknote, ChevronRight,
  ChevronLeft, ChevronDown, AlertTriangle, Loader, RefreshCw, Copy, Menu,
} from 'lucide';

/* Mapping nazw (czytelnych) → funkcje Lucide */
export const ICONS = {
  Dashboard: LayoutDashboard,
  Envelope: Mail,
  ArrowDown,
  ArrowUp,
  Tag,
  Crystal: Gem,
  Chart: LineChart,
  Target,
  Settings,
  Plus,
  Search,
  Filter,
  Edit: Pencil,
  Trash: Trash2,
  More: MoreHorizontal,
  Check,
  X,
  Calendar,
  Clock,
  TrendUp: TrendingUp,
  TrendDown: TrendingDown,
  Wallet,
  Sparkles,
  Users,
  User,
  Bell,
  Download,
  Lock,
  Logout: LogOut,
  Eye,
  Info,
  Shield,
  Banknote,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  AlertTriangle,
  Loader,
  RefreshCw,
  Copy,
  Menu,
};

const DEFAULTS = { size: 16, strokeWidth: 1.5 };

function normalizeLucideAttrs(attrs) {
  const out = {};
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'size') { out.width = v; out.height = v; }
    else if (k === 'strokeWidth') out['stroke-width'] = v;
    else out[k] = v;
  }
  return out;
}

/**
 * Zwraca SVG jako string (dla innerHTML).
 * @param {string|Function} nameOrFn - nazwa z ICONS lub bezpośrednio funkcja Lucide
 * @param {object} attrs - nadpisanie atrybutów (size, strokeWidth, class, ...)
 */
export function icon(nameOrFn, attrs = {}) {
  const fn = typeof nameOrFn === 'string' ? ICONS[nameOrFn] : nameOrFn;
  if (!fn) {
    console.warn(`[icons] nieznana ikona: ${nameOrFn}`);
    return '';
  }
  const el = lucideCreateElement(fn, normalizeLucideAttrs({ ...DEFAULTS, ...attrs }));
  return el.outerHTML;
}

/**
 * Zwraca SVG jako element DOM (dla appendChild/replaceWith).
 */
export function iconEl(nameOrFn, attrs = {}) {
  const fn = typeof nameOrFn === 'string' ? ICONS[nameOrFn] : nameOrFn;
  if (!fn) {
    console.warn(`[icons] nieznana ikona: ${nameOrFn}`);
    return document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  }
  return lucideCreateElement(fn, normalizeLucideAttrs({ ...DEFAULTS, ...attrs }));
}

/**
 * Logo "K" — rect 32×32 zaokrąglony 8px, litera K w Instrument Serif italic.
 * Kolor tła = currentColor, litera = var(--bg).
 */
export function logoHTML(size = 32) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect width="32" height="32" rx="8" fill="currentColor"/>
  <text x="50%" y="51%" dominant-baseline="central" text-anchor="middle"
        font-family="'Instrument Serif', serif" font-style="italic" font-size="22" font-weight="400"
        fill="var(--bg)">K</text>
</svg>`;
}
