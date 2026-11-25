import {businessToday} from './business-date';
export const businessParts=(ms:number)=>{const [year,month,day]=businessToday(new Date(ms)).split('-').map(Number);return {year,month,day};};
/** Midnight in Argentina, independent of the host timezone; month is zero-based. */
export const businessMonthStart=(year:number,month:number)=>Date.UTC(year,month,1,3);
export const nextMonthStart=(ms:number,n=1)=>{const p=businessParts(ms);return businessMonthStart(p.year,p.month-1+n);};
export const DAY_MS = 86_400_000;

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export interface Ejercicio {
  label: string;
  inicio: number;
  fin: number;
}

/** Ejercicio ganadero que contiene la fecha (por defecto julio a junio). */
export function ejercicioDe(ms: number, mesInicio = 7): Ejercicio {
  const {year,month:m} = businessParts(ms);
  const anioInicio = m >= mesInicio ? year : year - 1;
  const inicio = businessMonthStart(anioInicio, mesInicio - 1);
  const fin = businessMonthStart(anioInicio + 1, mesInicio - 1) - 1;
  const label = mesInicio === 1 ? `${anioInicio}` : `${anioInicio}-${String(anioInicio + 1).slice(2)}`;
  return { label, inicio, fin };
}

export function ejercicioAnterior(e: Ejercicio, mesInicio = 7): Ejercicio {
  return ejercicioDe(e.inicio - 1, mesInicio);
}

/** 'YYYY-MM' en Argentina. */
export function mesKey(ms: number): string {
  const {year,month}=businessParts(ms);
  return `${year}-${String(month).padStart(2,'0')}`;
}

export function mesLabel(key: string): string {
  const [y, m] = key.split('-');
  return `${MESES[Number(m) - 1]} ${y.slice(2)}`;
}

/** Últimos n meses terminando en el mes de `hasta`, de más viejo a más nuevo. */
export function ultimosMeses(n: number, hasta: number): { key: string; fin: number }[] {
  const {year,month}=businessParts(hasta);
  const out: { key: string; fin: number }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const inicioMes = new Date(businessMonthStart(year, month-1-i));
    const fin = businessMonthStart(year, month-i) - 1;
    out.push({ key: mesKey(inicioMes.getTime()), fin });
  }
  return out;
}

export function mesesEntre(desde: number, hasta: number): number {
  return (hasta - desde) / (DAY_MS * 30.4375);
}
