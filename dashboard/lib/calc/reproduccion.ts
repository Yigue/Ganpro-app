import type { Animal, CondicionCorporal, Evento, Servicio } from '@/lib/db/types';

export type ResultadoTacto = 'prenada' | 'vacia';

/** La app guarda el resultado en notas como "tacto:prenada ..." o "tacto:vacia ...". */
export function parseTacto(notas: string | null): ResultadoTacto | null {
  const m = notas?.match(/tacto:(prenada|preñada|vacia|vacía)/i);
  if (!m) return null;
  return m[1].toLowerCase().startsWith('pre') ? 'prenada' : 'vacia';
}

/** Tercio de parición si el tacto lo anota ("cabeza", "cuerpo" o "cola"). */
export function parseTercio(notas: string | null): 'cabeza' | 'cuerpo' | 'cola' | null {
  const m = notas?.toLowerCase().match(/\b(cabeza|cuerpo|cola)\b/);
  return (m?.[1] as 'cabeza' | 'cuerpo' | 'cola' | undefined) ?? null;
}

export interface Tacto {
  animalId: string;
  timestamp: number;
  resultado: ResultadoTacto;
  tercio: 'cabeza' | 'cuerpo' | 'cola' | null;
}

/** Último tacto de cada animal dentro del rango. */
export function tactos(eventos: Evento[], desde = 0, hasta = Infinity): Tacto[] {
  const ultimo = new Map<string, Tacto>();
  for (const e of eventos) {
    if (e.tipo !== 'TACTO' || e.timestamp < desde || e.timestamp > hasta) continue;
    const resultado = parseTacto(e.notas);
    if (!resultado) continue;
    const prev = ultimo.get(e.animal_id);
    if (!prev || prev.timestamp < e.timestamp) {
      ultimo.set(e.animal_id, { animalId: e.animal_id, timestamp: e.timestamp, resultado, tercio: parseTercio(e.notas) });
    }
  }
  return [...ultimo.values()];
}

export interface Prenez {
  grupo: string;
  tactadas: number;
  prenadas: number;
  pct: number | null;
}

export function prenez(lista: Tacto[]): { tactadas: number; prenadas: number; pct: number | null } {
  const prenadas = lista.filter((t) => t.resultado === 'prenada').length;
  return { tactadas: lista.length, prenadas, pct: lista.length ? (prenadas / lista.length) * 100 : null };
}

export function prenezPor(lista: Tacto[], animals: Map<string, Animal>, key: (a: Animal) => string | null): Prenez[] {
  const grupos = new Map<string, Tacto[]>();
  for (const t of lista) {
    const a = animals.get(t.animalId);
    const k = (a && key(a)) ?? 'Sin dato';
    grupos.set(k, [...(grupos.get(k) ?? []), t]);
  }
  return [...grupos.entries()].map(([grupo, ts]) => ({ grupo, ...prenez(ts) })).sort((a, b) => b.tactadas - a.tactadas);
}

/** Preñez atribuible a cada toro según los lotes donde estuvo en servicio. */
export function prenezPorToro(lista: Tacto[], animals: Map<string, Animal>, servicios: Servicio[]): Prenez[] {
  const out: Prenez[] = [];
  for (const s of servicios) {
    const delLote = lista.filter((t) => animals.get(t.animalId)?.lote_id === s.lote_id);
    for (const toroId of s.toros) {
      const toro = animals.get(toroId);
      out.push({ grupo: toro ? `${toro.id_caravana} (${s.temporada})` : toroId, ...prenez(delLote) });
    }
  }
  return out;
}

export function ccPromedio(registros: CondicionCorporal[]): number | null {
  if (!registros.length) return null;
  return registros.reduce((a, r) => a + r.score, 0) / registros.length;
}

export function relacionToroVientre(servicio: Servicio): number | null {
  if (!servicio.vientres || !servicio.toros.length) return null;
  return (servicio.toros.length / servicio.vientres) * 100;
}

/** Destete (%): terneros destetados (vendidos o recategorizados en el período) / vientres entorados. */
export function porcentaje(numerador: number, denominador: number | null | undefined): number | null {
  if (!denominador) return null;
  return (numerador / denominador) * 100;
}
