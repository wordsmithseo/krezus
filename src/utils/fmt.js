const _zl  = new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const _int = new Intl.NumberFormat('pl-PL');
const _date = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short' });

export const Fmt = {
  zl:  n => _zl.format(n ?? 0),
  int: n => _int.format(n ?? 0),
  pct: n => `${n >= 0 ? '+' : ''}${(n).toFixed(1).replace('.', ',')}%`,
  date: s => {
    if (!s) return '';
    return _date.format(new Date(s + 'T12:00:00')).replace('.', '');
  },
};
