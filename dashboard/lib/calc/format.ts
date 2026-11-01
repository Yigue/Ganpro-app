const nf = (opts: Intl.NumberFormatOptions) => new Intl.NumberFormat('es-AR', opts);

const ars = nf({ style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const usd = nf({ style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const compact = nf({ notation: 'compact', maximumFractionDigits: 1 });

export const fmtARS = (v: number | null | undefined) => (v == null || !Number.isFinite(v) ? '—' : ars.format(v));
export const fmtUSD = (v: number | null | undefined) => (v == null || !Number.isFinite(v) ? '—' : usd.format(v));
export const fmtCompact = (v: number | null | undefined) => (v == null || !Number.isFinite(v) ? '—' : compact.format(v));

export function fmtNum(v: number | null | undefined, decimals = 0): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return nf({ minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(v);
}

export function fmtPct(v: number | null | undefined, decimals = 1): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return `${fmtNum(v, decimals)} %`;
}

export function fmtDate(ms: number | null | undefined): string {
  if (ms == null) return '—';
  return new Date(ms).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function fmtDateShort(ms: number | null | undefined): string {
  if (ms == null) return '—';
  return new Date(ms).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}
