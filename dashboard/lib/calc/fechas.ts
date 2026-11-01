export const DAY_MS = 86_400_000;

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export interface Ejercicio {
  label: string;
  inicio: number;
  fin: number;
}

/** Ejercicio ganadero que contiene la fecha (por defecto julio a junio). */
export function ejercicioDe(ms: number, mesInicio = 7): Ejercicio {
  const d = new Date(ms);
  const m = d.getMonth() + 1;
  const anioInicio = m >= mesInicio ? d.getFullYear() : d.getFullYear() - 1;
  const inicio = new Date(anioInicio, mesInicio - 1, 1).getTime();
  const fin = new Date(anioInicio + 1, mesInicio - 1, 1).getTime() - 1;
  const label = mesInicio === 1 ? `${anioInicio}` : `${anioInicio}-${String(anioInicio + 1).slice(2)}`;
  return { label, inicio, fin };
}

export function ejercicioAnterior(e: Ejercicio, mesInicio = 7): Ejercicio {
  return ejercicioDe(e.inicio - 1, mesInicio);
}

/** 'YYYY-MM' en hora local. */
export function mesKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function mesLabel(key: string): string {
  const [y, m] = key.split('-');
  return `${MESES[Number(m) - 1]} ${y.slice(2)}`;
}

/** Últimos n meses terminando en el mes de `hasta`, de más viejo a más nuevo. */
export function ultimosMeses(n: number, hasta: number): { key: string; fin: number }[] {
  const d = new Date(hasta);
  const out: { key: string; fin: number }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const inicioMes = new Date(d.getFullYear(), d.getMonth() - i, 1);
    const fin = new Date(d.getFullYear(), d.getMonth() - i + 1, 1).getTime() - 1;
    out.push({ key: mesKey(inicioMes.getTime()), fin });
  }
  return out;
}

export function mesesEntre(desde: number, hasta: number): number {
  return (hasta - desde) / (DAY_MS * 30.4375);
}
