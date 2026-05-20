const _zl  = new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const _int = new Intl.NumberFormat('pl-PL');

export const Fmt = {
  zl:  n => _zl.format(n ?? 0),
  int: n => _int.format(n ?? 0),
  pct: n => `${n >= 0 ? '+' : ''}${(n).toFixed(1).replace('.', ',')}%`,
};
