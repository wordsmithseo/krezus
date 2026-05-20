const _zl      = new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const _int     = new Intl.NumberFormat('pl-PL');
const _date    = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short' });
const _dateLng = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });

export const Fmt = {
  zl:  n => _zl.format(n ?? 0),
  int: n => _int.format(n ?? 0),
  pct: n => `${n >= 0 ? '+' : ''}${(n).toFixed(1).replace('.', ',')}%`,
  date: s => {
    if (!s) return '';
    return _date.format(new Date(s + 'T12:00:00')).replace('.', '');
  },
  dateLong: s => {
    if (!s) return '';
    return _dateLng.format(new Date(s + 'T12:00:00'));
  },
  relativeDate: s => {
    if (!s) return '';
    const today = new Date();
    const d = new Date(s + 'T12:00:00');
    const todayStr = today.toISOString().slice(0, 10);
    const yest = new Date(today); yest.setDate(yest.getDate() - 1);
    const yesterdayStr = yest.toISOString().slice(0, 10);
    if (s === todayStr) return 'Dziś';
    if (s === yesterdayStr) return 'Wczoraj';
    const diffDays = Math.round((today - d) / 86400000);
    if (diffDays > 0 && diffDays < 7) return `${diffDays} dni temu`;
    return Fmt.date(s);
  },
};
