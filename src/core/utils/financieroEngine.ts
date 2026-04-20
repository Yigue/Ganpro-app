/**
 * Pure TypeScript financial calculation utilities for GanPro.
 * No React/RN imports.
 */

/**
 * Calculates cost per kg of live weight gained.
 * Returns null if kgGanados is 0 to avoid division by zero.
 */
export function calcularCostoPorKg(params: {
  costoTotalPesos: number;
  kgGanados: number;
}): number | null {
  if (params.kgGanados === 0) return null;
  return params.costoTotalPesos / params.kgGanados;
}

/**
 * Calculates gross margin: sale income minus total production costs.
 */
export function calcularMargenBruto(params: {
  ingresoVenta: number;    // kg × precio mercado
  costoProduccion: number; // sanidad + nutrición + alquiler prorrateado
}): number {
  return params.ingresoVenta - params.costoProduccion;
}

/**
 * Estimates days to reach target slaughter weight based on current GDP.
 * Returns null if GDP is 0 or negative (no progress).
 */
export function calcularDiasAFaena(params: {
  pesoActualKg: number;
  gdpKgDia: number;
  pesoObjetivoKg: number;
}): number | null {
  if (params.gdpKgDia <= 0) return null;
  const kgRestante = params.pesoObjetivoKg - params.pesoActualKg;
  if (kgRestante <= 0) return 0; // Already at or above target
  return kgRestante / params.gdpKgDia;
}

/**
 * Estimates the economic loss from an animal death based on category and
 * current market prices.
 */
export function calcularImpactoEconomicoMuerte(params: {
  animal: { categoria: string; pesoEstimadoKg?: number };
  precios: {
    novilloKg?: number;
    terneroKg?: number;
    vacaKg?: number;
    vacaDescarteKg?: number;
  };
}): number {
  const { animal, precios } = params;
  const categoria = animal.categoria.toLowerCase();
  const peso = animal.pesoEstimadoKg ?? 0;

  // Map categoria to price per kg
  let precioPorKg = 0;
  if (categoria.includes('novillo') || categoria.includes('torito')) {
    precioPorKg = precios.novilloKg ?? 0;
  } else if (categoria.includes('ternero')) {
    precioPorKg = precios.terneroKg ?? 0;
  } else if (categoria.includes('vaca') || categoria.includes('vaquillona')) {
    precioPorKg = precios.vacaKg ?? 0;
  } else if (categoria.includes('descarte')) {
    precioPorKg = precios.vacaDescarteKg ?? precios.vacaKg ?? 0;
  } else {
    // Fallback: use best available price
    precioPorKg =
      precios.novilloKg ??
      precios.vacaKg ??
      precios.terneroKg ??
      precios.vacaDescarteKg ??
      0;
  }

  return peso * precioPorKg;
}
