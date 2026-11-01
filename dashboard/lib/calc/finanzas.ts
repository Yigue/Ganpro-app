import type { Animal, CategoriaConfig, MovimientoFinanciero, PrecioMercado } from '@/lib/db/types';
import { mesKey } from './fechas';

export const CATEGORIAS_DIRECTAS = ['SANIDAD', 'NUTRICION', 'ALQUILER', 'MANO_OBRA', 'COMPRA'];
export const CATEGORIAS_ESTRUCTURA = ['IMPUESTOS', 'MANTENIMIENTO', 'AMORTIZACION', 'OTRO'];

export const CATEGORIAS_GASTO = [
  'SANIDAD',
  'NUTRICION',
  'ALQUILER',
  'MANO_OBRA',
  'COMPRA',
  'IMPUESTOS',
  'MANTENIMIENTO',
  'AMORTIZACION',
  'OTRO',
] as const;
export const CATEGORIAS_INGRESO = ['VENTA', 'OTRO'] as const;

export function tipoCosto(categoria: string): 'directo' | 'estructura' {
  return CATEGORIAS_DIRECTAS.includes(categoria) ? 'directo' : 'estructura';
}

export function enRango(movs: MovimientoFinanciero[], desde: number, hasta: number) {
  return movs.filter((m) => m.fecha >= desde && m.fecha <= hasta);
}

export function sumar(movs: MovimientoFinanciero[], tipo: 'GASTO' | 'INGRESO', filtro?: (m: MovimientoFinanciero) => boolean) {
  return movs.filter((m) => m.tipo === tipo && (!filtro || filtro(m))).reduce((a, m) => a + m.monto, 0);
}

/** Último precio cargado (la lista viene ordenada por fecha descendente o no; se ordena acá). */
export function precioVigente(precios: PrecioMercado[]): PrecioMercado | null {
  if (!precios.length) return null;
  return [...precios].sort((a, b) => b.fecha - a.fecha)[0];
}

/** Dólar del día más cercano anterior a la fecha; si no hay, el más viejo disponible. */
export function dolarEn(precios: PrecioMercado[], fecha: number, tipo: 'dolar_oficial' | 'dolar_mep' = 'dolar_oficial'): number | null {
  const con = precios.filter((p) => p[tipo] != null).sort((a, b) => a.fecha - b.fecha);
  if (!con.length) return null;
  let valor = con[0][tipo];
  for (const p of con) {
    if (p.fecha <= fecha) valor = p[tipo];
    else break;
  }
  return valor;
}

export interface Mes {
  mes: string;
  ingresos: number;
  gastos: number;
  resultado: number;
  ingresosUSD: number | null;
  gastosUSD: number | null;
}

export function porMes(movs: MovimientoFinanciero[], meses: string[], precios: PrecioMercado[]): Mes[] {
  const base = new Map<string, Mes>(
    meses.map((m) => [m, { mes: m, ingresos: 0, gastos: 0, resultado: 0, ingresosUSD: 0, gastosUSD: 0 }]),
  );
  for (const mv of movs) {
    const fila = base.get(mesKey(mv.fecha));
    if (!fila) continue;
    const dolar = dolarEn(precios, mv.fecha);
    const usd = dolar ? mv.monto / dolar : null;
    if (mv.tipo === 'INGRESO') {
      fila.ingresos += mv.monto;
      fila.ingresosUSD = fila.ingresosUSD == null || usd == null ? null : fila.ingresosUSD + usd;
    } else {
      fila.gastos += mv.monto;
      fila.gastosUSD = fila.gastosUSD == null || usd == null ? null : fila.gastosUSD + usd;
    }
  }
  return [...base.values()].map((f) => ({ ...f, resultado: f.ingresos - f.gastos }));
}

export interface ValuacionCategoria {
  categoria: string;
  cabezas: number;
  pesoPromedio: number | null;
  precioKg: number | null;
  valor: number;
}

/** Valor del rodeo: Σ cabezas × peso promedio × precio por kg de la categoría. */
export function valuacionRodeo(animals: Animal[], config: CategoriaConfig[], precio: PrecioMercado | null): ValuacionCategoria[] {
  const activos = animals.filter((a) => a.estado === 'ACTIVO');
  const cats = new Map<string, Animal[]>();
  for (const a of activos) cats.set(a.categoria, [...(cats.get(a.categoria) ?? []), a]);
  const cfg = new Map(config.map((c) => [c.categoria, c]));
  return [...cats.entries()]
    .map(([categoria, lista]) => {
      const pesos = lista.map((a) => a.peso_actual).filter((p): p is number => p != null && p > 0);
      const pesoPromedio = pesos.length ? pesos.reduce((a, b) => a + b, 0) / pesos.length : null;
      const col = cfg.get(categoria)?.precio_columna;
      const precioKg = precio && col ? ((precio[col] as number | null) ?? null) : null;
      const valor = pesoPromedio != null && precioKg != null ? lista.length * pesoPromedio * precioKg : 0;
      return { categoria, cabezas: lista.length, pesoPromedio, precioKg, valor };
    })
    .sort((a, b) => (cfg.get(a.categoria)?.orden ?? 99) - (cfg.get(b.categoria)?.orden ?? 99));
}

export interface MargenBruto {
  ingresos: number;
  costosDirectos: number;
  estructura: number;
  difInventario: number;
  margenBruto: number;
  resultado: number;
}

/** Margen bruto = ventas ± diferencia de inventario − costos directos. */
export function margenBruto(movs: MovimientoFinanciero[], difInventario = 0): MargenBruto {
  const ingresos = sumar(movs, 'INGRESO');
  const costosDirectos = sumar(movs, 'GASTO', (m) => tipoCosto(m.categoria) === 'directo');
  const estructura = sumar(movs, 'GASTO', (m) => tipoCosto(m.categoria) === 'estructura');
  const margen = ingresos + difInventario - costosDirectos;
  return { ingresos, costosDirectos, estructura, difInventario, margenBruto: margen, resultado: margen - estructura };
}

export function cuentasPorCobrar(movs: MovimientoFinanciero[]): MovimientoFinanciero[] {
  return movs
    .filter((m) => m.tipo === 'INGRESO' && m.cobrado === false)
    .sort((a, b) => (a.fecha_cobro ?? a.fecha) - (b.fecha_cobro ?? b.fecha));
}

/** Producción de carne = kg vendidos − kg comprados ± diferencia de inventario en kg. */
export function produccionCarne(movs: MovimientoFinanciero[], difInventarioKg: number): number {
  const vendidos = movs.filter((m) => m.tipo === 'INGRESO' && m.categoria === 'VENTA').reduce((a, m) => a + (m.kg ?? 0), 0);
  const comprados = movs.filter((m) => m.tipo === 'GASTO' && m.categoria === 'COMPRA').reduce((a, m) => a + (m.kg ?? 0), 0);
  return vendidos - comprados + difInventarioKg;
}

/**
 * Flujo de caja proyectado: cobros ya comprometidos (ventas a plazo) menos el gasto
 * mensual promedio de los últimos 6 meses. Las ventas futuras no se suponen.
 */
export function flujoProyectado(historico: Mes[], pendientes: MovimientoFinanciero[], mesesFuturos: string[]) {
  const ult = historico.slice(-6);
  const promGas = ult.length ? ult.reduce((a, m) => a + m.gastos, 0) / ult.length : 0;
  let acumulado = 0;
  return mesesFuturos.map((mes) => {
    const cobros = pendientes.filter((p) => mesKey(p.fecha_cobro ?? p.fecha) === mes).reduce((a, p) => a + p.monto, 0);
    const neto = cobros - promGas;
    acumulado += neto;
    return { mes, cobros, gastos: promGas, neto, acumulado };
  });
}
