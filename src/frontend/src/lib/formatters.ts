export function formatNumber(num: number | null | undefined, decimals: number = 2): string {
  if (num === null || num === undefined) return '-';
  return num.toFixed(decimals);
}

export function formatPercent(num: number | null | undefined): string {
  if (num === null || num === undefined) return '-';
  return `${(num * 100).toFixed(2)}%`;
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatCurrency(num: number | null | undefined): string {
  if (num === null || num === undefined) return '-';
  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  
  if (absNum >= 1e12) {
    return `${sign}${(absNum / 1e12).toFixed(2)}万亿`;
  } else if (absNum >= 1e8) {
    return `${sign}${(absNum / 1e8).toFixed(2)}亿`;
  } else if (absNum >= 1e4) {
    return `${sign}${(absNum / 1e4).toFixed(2)}万`;
  }
  return `${sign}${absNum.toFixed(2)}`;
}
