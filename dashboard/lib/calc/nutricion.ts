import type { Animal, CategoriaConfig, Potrero, PotreroFeedingLog, RacionIngrediente, Suplemento } from '@/lib/db/types';
import { coefEV } from './stock';

export interface ComposicionRacion {
  costoKg: number | null;
  msPct: number | null;
  totalPct: number;
}

/** Costo por kg y MS de una ración a partir de sus ingredientes en %. */
export function composicionRacion(ingredientes: RacionIngrediente[], suplementos: Map<string, Suplemento>): ComposicionRacion {
  let costo = 0;
  let ms = 0;
  let totalPct = 0;
  let sinPrecio = false;
  for (const ing of ingredientes) {
    const s = suplementos.get(ing.suplemento_id);
    if (!s) continue;
    const frac = ing.porcentaje / 100;
    totalPct += ing.porcentaje;
    ms += frac * s.materia_seca_pct;
    if (s.precio_por_tonelada == null) sinPrecio = true;
    else costo += frac * (s.precio_por_tonelada / 1000);
  }
  if (!totalPct) return { costoKg: null, msPct: null, totalPct: 0 };
  return { costoKg: sinPrecio ? null : costo / (totalPct / 100), msPct: ms / (totalPct / 100), totalPct };
}

export interface CargaPotrero {
  potrero: Potrero;
  cabezas: number;
  ev: number;
  evHa: number | null;
  ocupacionPct: number | null;
}

export function cargaPorPotrero(potreros: Potrero[], animals: Animal[], config: CategoriaConfig[]): CargaPotrero[] {
  const ev = coefEV(config);
  return potreros.map((p) => {
    const enPotrero = animals.filter((a) => a.estado === 'ACTIVO' && a.potrero_id === p.id);
    const totalEv = enPotrero.reduce((acc, a) => acc + (ev.get(a.categoria) ?? 1), 0);
    return {
      potrero: p,
      cabezas: enPotrero.length,
      ev: totalEv,
      evHa: p.hectareas ? totalEv / p.hectareas : null,
      ocupacionPct: p.capacidad_ev ? (totalEv / p.capacidad_ev) * 100 : null,
    };
  });
}

export interface EntregaPotrero {
  potreroId: string;
  kg: number;
  kgMS: number;
  costo: number | null;
}

export function entregasPorPotrero(
  logs: PotreroFeedingLog[],
  composicion: Map<string, ComposicionRacion>,
  desde: number,
): EntregaPotrero[] {
  const out = new Map<string, EntregaPotrero>();
  for (const l of logs) {
    if (l.fecha < desde) continue;
    const comp = composicion.get(l.racion_id);
    const prev = out.get(l.potrero_id) ?? { potreroId: l.potrero_id, kg: 0, kgMS: 0, costo: 0 };
    prev.kg += l.cantidad_kg;
    prev.kgMS += l.cantidad_kg * ((comp?.msPct ?? 0) / 100);
    prev.costo = prev.costo == null || l.costo_total == null ? null : prev.costo + l.costo_total;
    out.set(l.potrero_id, prev);
  }
  return [...out.values()];
}

/** Consumo diario estimado de sal por categoría y su costo. */
export function consumoSal(
  animals: Animal[],
  config: CategoriaConfig[],
  costoKg: number | null,
): { categoria: string; cabezas: number; gDia: number; kgMes: number; costoCabezaDia: number | null }[] {
  return config
    .filter((c) => c.consumo_sal_g_dia)
    .map((c) => {
      const cabezas = animals.filter((a) => a.estado === 'ACTIVO' && a.categoria === c.categoria).length;
      const gDia = c.consumo_sal_g_dia ?? 0;
      return {
        categoria: c.categoria,
        cabezas,
        gDia,
        kgMes: (cabezas * gDia * 30) / 1000,
        costoCabezaDia: costoKg == null ? null : (gDia / 1000) * costoKg,
      };
    })
    .filter((r) => r.cabezas > 0);
}

export function suplementosBajoMinimo(suplementos: Suplemento[]): Suplemento[] {
  return suplementos.filter((s) => s.stock_minimo_kg != null && (s.stock_kg ?? 0) < s.stock_minimo_kg);
}

// Tasa de crecimiento de referencia (kg MS/ha/día) por mes, ene → dic, para el
// centro-este de Entre Ríos. Es una aproximación para la cadena forrajera; se
// elige por palabra clave del recurso_forrajero del potrero.
const CURVAS: { clave: RegExp; tasa: number[] }[] = [
  { clave: /verdeo|avena|raigr|centeno/i, tasa: [0, 0, 5, 20, 30, 30, 30, 35, 40, 30, 10, 0] },
  { clave: /pastura|festuca|tr[eé]bol|alfalfa|lotus/i, tasa: [35, 35, 30, 25, 15, 10, 10, 15, 30, 40, 40, 35] },
  { clave: /mejorad/i, tasa: [25, 25, 20, 15, 10, 6, 6, 10, 20, 28, 28, 25] },
  { clave: /.*/, tasa: [22, 22, 18, 12, 7, 4, 4, 7, 15, 22, 24, 22] },
];

export const CONSUMO_EV_KG_MS_DIA = 10;
const USO_FORRAJE = 0.6;

export function tasaCrecimiento(recurso: string | null, mes: number): number {
  return (CURVAS.find((c) => c.clave.test(recurso ?? '')) ?? CURVAS[CURVAS.length - 1]).tasa[mes];
}

/** Oferta mensual de forraje aprovechable vs demanda del rodeo (kg MS). */
export function cadenaForrajera(potreros: Potrero[], evTotal: number, anio: number) {
  return Array.from({ length: 12 }, (_, mes) => {
    const dias = new Date(anio, mes + 1, 0).getDate();
    const oferta = potreros.reduce((a, p) => a + (p.hectareas ?? 0) * tasaCrecimiento(p.recurso_forrajero, mes) * dias * USO_FORRAJE, 0);
    const demanda = evTotal * CONSUMO_EV_KG_MS_DIA * dias;
    return { mes, oferta: Math.round(oferta), demanda: Math.round(demanda), balance: Math.round(oferta - demanda) };
  });
}
