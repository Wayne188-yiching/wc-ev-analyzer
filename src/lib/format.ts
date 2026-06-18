export function formatNT(n: number, opts?: { signed?: boolean }): string {
  if (!Number.isFinite(n)) return 'NT$0';
  const rounded = Math.round(n);
  const body = 'NT$' + Math.abs(rounded).toLocaleString();
  if (rounded < 0) return '-' + body;
  if (opts?.signed) return '+' + body;
  return body;
}

export function formatPct(n: number, decimals: number = 1): string {
  if (!Number.isFinite(n)) return '—';
  return (n >= 0 ? '+' : '') + n.toFixed(decimals) + '%';
}

const WEEKDAY = ['日', '一', '二', '三', '四', '五', '六'] as const;

export function dateLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getMonth() + 1}/${d.getDate()} (週${WEEKDAY[d.getDay()]})`;
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
