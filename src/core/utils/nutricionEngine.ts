/**
 * Simplified INTA/NRC Beef maintenance requirements.
 * Based on: MS (kg/día) = 0.017 × PV^0.75 for maintenance
 * (Forrester 1998, simplified for Argentine conditions)
 */

export interface BalanceNutricional {
  estado: 'SUPERAVIT' | 'EQUILIBRIO' | 'DEFICIT';
  requerimientoMsKg: number;  // required dry matter kg/day
  aporteRacionMsKg: number;   // provided by ration kg/day
  deltaMs: number;            // positive = surplus, negative = deficit
  mensaje: string;
}

/**
 * Calculates daily dry matter requirement for maintenance.
 * NRC simplified formula: 0.017 × PV^0.75
 * @param pesoVivoKg Live weight in kg
 * @returns Required dry matter in kg/day
 */
export function calcularRequerimientoMS(pesoVivoKg: number): number {
  return 0.017 * Math.pow(pesoVivoKg, 0.75);
}

/**
 * Calculates the nutritional balance comparing ration supply vs maintenance requirement.
 */
export function calcularBalanceNutricional(params: {
  pesoPromedioKg: number;
  kgDiaAnimal: number;
  materiaSecaPct: number; // 0-100
}): BalanceNutricional {
  const requerimientoMsKg = calcularRequerimientoMS(params.pesoPromedioKg);
  const aporteRacionMsKg = params.kgDiaAnimal * (params.materiaSecaPct / 100);
  const deltaMs = aporteRacionMsKg - requerimientoMsKg;

  let estado: BalanceNutricional['estado'];
  let mensaje: string;

  // Tolerance of ±5% of requirement considered equilibrium
  const tolerancia = requerimientoMsKg * 0.05;
  if (deltaMs > tolerancia) {
    estado = 'SUPERAVIT';
    mensaje = `Superávit de ${deltaMs.toFixed(2)} kg MS/día. Considerar reducir ración.`;
  } else if (deltaMs < -tolerancia) {
    estado = 'DEFICIT';
    mensaje = `Déficit de ${Math.abs(deltaMs).toFixed(2)} kg MS/día. Aumentar suplementación.`;
  } else {
    estado = 'EQUILIBRIO';
    mensaje = `Balance equilibrado (Δ ${deltaMs.toFixed(2)} kg MS/día).`;
  }

  return { estado, requerimientoMsKg, aporteRacionMsKg, deltaMs, mensaje };
}

/**
 * Calculates average daily gain (kg/day) using linear regression on pesaje data.
 * Requires at least 2 data points; returns null if insufficient data.
 * @param pesajes Array of { timestamp: Unix ms, valor: kg }
 */
export function calcularGDP(
  pesajes: Array<{ timestamp: number; valor: number }>
): number | null {
  if (pesajes.length < 2) return null;

  // Sort ascending by timestamp
  const sorted = [...pesajes].sort((a, b) => a.timestamp - b.timestamp);

  // Convert timestamps to days from first measurement
  const t0 = sorted[0].timestamp;
  const points = sorted.map((p) => ({
    x: (p.timestamp - t0) / 86_400_000, // days
    y: p.valor,
  }));

  const n = points.length;
  const sumX = points.reduce((acc, p) => acc + p.x, 0);
  const sumY = points.reduce((acc, p) => acc + p.y, 0);
  const sumXY = points.reduce((acc, p) => acc + p.x * p.y, 0);
  const sumX2 = points.reduce((acc, p) => acc + p.x * p.x, 0);

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return null;

  // Slope = GDP in kg/day
  const slope = (n * sumXY - sumX * sumY) / denominator;
  return slope;
}
