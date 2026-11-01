import type { CriaInput, NegocioInput } from './proyeccion';

const comunes = { gastosCompraPct: 4, gastosVentaPct: 5, desbastePct: 3, mortandadPct: 1, otrosDirectos: 0 };

/** Cuatro modelos de partida, con la estructura de columnas del análisis de RTC. Ajustalos con tus números. */
export const MODELOS_EJEMPLO: NegocioInput[] = [
  { nombre: 'Novillos en verdeo', cabezas: 100, kgEntrada: 220, kgSalida: 340, dias: 140, precioCompra: 3500, precioVenta: 2950, alimentacion: 0, sanidad: 7000, pastura: 85000, hectareas: 35, alquilerHa: 180000, ...comunes },
  { nombre: 'Vaquillonas recría', cabezas: 80, kgEntrada: 180, kgSalida: 280, dias: 140, precioCompra: 3400, precioVenta: 3000, alimentacion: 30000, sanidad: 9000, pastura: 40000, hectareas: 25, alquilerHa: 180000, ...comunes },
  { nombre: 'Terneros a corral', cabezas: 120, kgEntrada: 170, kgSalida: 300, dias: 120, precioCompra: 3600, precioVenta: 2950, alimentacion: 190000, sanidad: 8000, pastura: 0, hectareas: 2, alquilerHa: 180000, ...comunes },
  { nombre: 'Novillos campo natural', cabezas: 100, kgEntrada: 260, kgSalida: 380, dias: 220, precioCompra: 3200, precioVenta: 2900, alimentacion: 0, sanidad: 9000, pastura: 0, hectareas: 110, alquilerHa: 90000, ...comunes },
];

export const CRIA_EJEMPLO: CriaInput = {
  anios: 6,
  vientres: 150,
  prenezPct: 85,
  perdidasPct: 6,
  retencionPct: 40,
  refugoPct: 12,
  mortandadPct: 2,
  venderVacias: false,
  demoraEntore: 2,
  compraVientresAnual: 0,
  ventaVientresAnual: 0,
  pesoDesteteKg: 180,
  precioTerneroKg: 3500,
  pesoVacaKg: 420,
  precioVacaKg: 1800,
  costoVientre: 180000,
  hectareas: 325,
  evHa: 0.6,
  topeHectareas: true,
};
