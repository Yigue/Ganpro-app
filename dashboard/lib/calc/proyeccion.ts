import { DAY_MS } from './fechas';
import { tasaCrecimiento } from './nutricion';

// ---------------------------------------------------------------------------
// 1. Negocio de invernada o recría
// ---------------------------------------------------------------------------

export interface NegocioInput {
  nombre: string;
  cabezas: number;
  kgEntrada: number;
  kgSalida: number;
  precioCompra: number;
  precioVenta: number;
  dias: number;
  /** Costos directos por cabeza para todo el ciclo. */
  alimentacion: number;
  sanidad: number;
  pastura: number;
  otrosDirectos: number;
  /** Hectáreas que usa toda la tropa y su alquiler en ARS/ha/año. */
  hectareas: number;
  alquilerHa: number;
  /** Gastos comerciales en %: comisión, flete, etc. */
  gastosCompraPct: number;
  gastosVentaPct: number;
  desbastePct: number;
  mortandadPct: number;
}

export interface NegocioResultado {
  gdp: number;
  kgProducidos: number;
  kgVendibles: number;
  compra: number;
  ingreso: number;
  costosDirectos: number;
  costoTierra: number;
  margenBruto: number;
  margenNeto: number;
  renta: number | null;
  rentaAnual: number | null;
  costoKgProducido: number | null;
  costoKgVendido: number | null;
  precioEquilibrio: number | null;
  /** Valores por tropa (× cabezas). */
  tropa: { compra: number; ingreso: number; margenBruto: number; margenNeto: number; inversion: number };
}

/**
 * Todo por cabeza. Margen bruto = kg salida × precio venta × (1 − gastos venta)
 * − kg entrada × precio compra × (1 + gastos compra) − costos directos.
 * El desbaste baja los kg que se cobran y la mortandad esperada baja el ingreso.
 */
export function simularNegocio(i: NegocioInput): NegocioResultado {
  const pct = (v: number) => (v || 0) / 100;
  const cabezas = Math.max(1, i.cabezas || 1);
  const kgVendibles = i.kgSalida * (1 - pct(i.desbastePct));
  const supervivencia = 1 - pct(i.mortandadPct);
  const compra = i.kgEntrada * i.precioCompra * (1 + pct(i.gastosCompraPct));
  const ingreso = kgVendibles * i.precioVenta * (1 - pct(i.gastosVentaPct)) * supervivencia;
  const costosDirectos = (i.alimentacion || 0) + (i.sanidad || 0) + (i.pastura || 0) + (i.otrosDirectos || 0);
  const costoTierra = ((i.hectareas || 0) * (i.alquilerHa || 0) * (i.dias || 0)) / 365 / cabezas;
  const margenBruto = ingreso - compra - costosDirectos;
  const margenNeto = margenBruto - costoTierra;
  const inversion = compra + costosDirectos;
  const renta = inversion > 0 ? margenNeto / inversion : null;
  const kgProducidos = i.kgSalida - i.kgEntrada;
  const netoVentaKg = kgVendibles * (1 - pct(i.gastosVentaPct)) * supervivencia;
  return {
    gdp: i.dias > 0 ? kgProducidos / i.dias : 0,
    kgProducidos,
    kgVendibles,
    compra,
    ingreso,
    costosDirectos,
    costoTierra,
    margenBruto,
    margenNeto,
    renta,
    rentaAnual: renta != null && i.dias > 0 ? (renta * 365) / i.dias : null,
    costoKgProducido: kgProducidos > 0 ? (costosDirectos + costoTierra) / kgProducidos : null,
    costoKgVendido: kgVendibles > 0 ? (compra + costosDirectos + costoTierra) / kgVendibles : null,
    precioEquilibrio: netoVentaKg > 0 ? (compra + costosDirectos + costoTierra) / netoVentaKg : null,
    tropa: {
      compra: compra * cabezas,
      ingreso: ingreso * cabezas,
      margenBruto: margenBruto * cabezas,
      margenNeto: margenNeto * cabezas,
      inversion: inversion * cabezas,
    },
  };
}

/** Margen neto por cabeza para cada combinación de precio de venta y ganancia diaria. */
export function sensibilidad(i: NegocioInput, precios: number[], gdps: number[]): number[][] {
  return gdps.map((g) =>
    precios.map((p) => simularNegocio({ ...i, precioVenta: p, kgSalida: i.kgEntrada + g * i.dias }).margenNeto),
  );
}

/** Pasos alrededor de un valor central: [−2, −1, 0, +1, +2] × paso. */
export function ejes(centro: number, paso: number, n = 2): number[] {
  return Array.from({ length: n * 2 + 1 }, (_, k) => centro + (k - n) * paso);
}

// ---------------------------------------------------------------------------
// 2. Ganancia de peso
// ---------------------------------------------------------------------------

/** Factor mensual de la ganancia diaria según la curva de crecimiento del recurso (promedio anual = 1). */
export function factorEstacional(recurso: string | null, mes: number): number {
  const tasas = Array.from({ length: 12 }, (_, m) => tasaCrecimiento(recurso, m));
  const prom = tasas.reduce((a, b) => a + b, 0) / 12;
  if (!prom) return 1;
  // Se suaviza a la mitad: la ganancia del animal varía menos que el pasto.
  return 0.5 + 0.5 * (tasas[mes] / prom);
}

export interface PuntoPeso {
  fecha: number;
  peso: number;
}

export function proyectarPeso(params: {
  pesoInicial: number;
  desde: number;
  gdp: number;
  dias: number;
  recurso?: string | null;
  estacional?: boolean;
}): PuntoPeso[] {
  const out: PuntoPeso[] = [{ fecha: params.desde, peso: params.pesoInicial }];
  let peso = params.pesoInicial;
  for (let d = 1; d <= params.dias; d++) {
    const fecha = params.desde + d * DAY_MS;
    const f = params.estacional ? factorEstacional(params.recurso ?? null, new Date(fecha).getMonth()) : 1;
    peso += params.gdp * f;
    out.push({ fecha, peso });
  }
  return out;
}

export function fechaObjetivo(curva: PuntoPeso[], objetivo: number): number | null {
  return curva.find((p) => p.peso >= objetivo)?.fecha ?? null;
}

export function pesoEn(curva: PuntoPeso[], fecha: number): number | null {
  if (!curva.length || fecha < curva[0].fecha) return null;
  let ultimo = curva[0];
  for (const p of curva) {
    if (p.fecha > fecha) break;
    ultimo = p;
  }
  return ultimo.peso;
}

// ---------------------------------------------------------------------------
// 3. Plan de compras y ventas
// ---------------------------------------------------------------------------

export interface LineaPlan {
  id?: string;
  mes: string;
  tipo: 'VENTA' | 'COMPRA';
  categoria: string;
  cabezas: number;
  kg: number;
  precioKg: number;
  movimientoId?: string | null;
}

export interface MesPlan {
  mes: string;
  ingresos: number;
  compras: number;
  gastos: number;
  neto: number;
  acumulado: number;
  stock: Record<string, number>;
  ev: number;
  sobreCapacidad: boolean;
}

export const montoLinea = (l: LineaPlan) => l.cabezas * l.kg * l.precioKg;

export function simularPlan(params: {
  meses: string[];
  stockInicial: Record<string, number>;
  lineas: LineaPlan[];
  gastoMensual: number;
  ev: Map<string, number>;
  capacidadEv: number | null;
}): MesPlan[] {
  const stock = { ...params.stockInicial };
  let acumulado = 0;
  return params.meses.map((mes) => {
    let ingresos = 0;
    let compras = 0;
    for (const l of params.lineas.filter((x) => x.mes === mes)) {
      if (l.tipo === 'VENTA') {
        ingresos += montoLinea(l);
        stock[l.categoria] = (stock[l.categoria] ?? 0) - l.cabezas;
      } else {
        compras += montoLinea(l);
        stock[l.categoria] = (stock[l.categoria] ?? 0) + l.cabezas;
      }
    }
    const neto = ingresos - compras - params.gastoMensual;
    acumulado += neto;
    const ev = Object.entries(stock).reduce((a, [cat, n]) => a + Math.max(0, n) * (params.ev.get(cat) ?? 1), 0);
    return {
      mes,
      ingresos,
      compras,
      gastos: params.gastoMensual,
      neto,
      acumulado,
      stock: { ...stock },
      ev,
      sobreCapacidad: params.capacidadEv != null && ev > params.capacidadEv,
    };
  });
}

// ---------------------------------------------------------------------------
// 4. Precios históricos
// ---------------------------------------------------------------------------

/** Promedio por mes del año (0 = enero) de una serie de precios. */
export function estacionalidad(serie: { fecha: number; valor: number | null }[]): (number | null)[] {
  const sumas = Array(12).fill(0);
  const n = Array(12).fill(0);
  for (const p of serie) {
    if (p.valor == null) continue;
    const m = new Date(p.fecha).getMonth();
    sumas[m] += p.valor;
    n[m]++;
  }
  return sumas.map((s, m) => (n[m] ? s / n[m] : null));
}

// ---------------------------------------------------------------------------
// 5. Crecimiento del rodeo de cría
// ---------------------------------------------------------------------------

export interface CriaInput {
  anios: number;
  vientres: number;
  prenezPct: number;
  perdidasPct: number;
  retencionPct: number;
  refugoPct: number;
  mortandadPct: number;
  venderVacias: boolean;
  /** Años entre la retención de la ternera y su primer entore (1 = 15 meses, 2 = 27 meses). */
  demoraEntore: 1 | 2;
  compraVientresAnual: number;
  ventaVientresAnual: number;
  pesoDesteteKg: number;
  precioTerneroKg: number;
  pesoVacaKg: number;
  precioVacaKg: number;
  costoVientre: number;
  hectareas: number;
  evHa: number;
  topeHectareas: boolean;
}

export interface CriaAnio {
  anio: number;
  vientres: number;
  terneros: number;
  retenidas: number;
  vaquillonasRecria: number;
  ternerosVendidos: number;
  refugo: number;
  kgVendidos: number;
  ingresos: number;
  costos: number;
  margen: number;
  ev: number;
  cargaEvHa: number | null;
  ajustePorTope: number;
}

const EV_VIENTRE = 1.0;
const EV_VAQUILLONA = 0.7;

/** Modelo año por año: terneros destetados = vientres × preñez × (1 − pérdidas hasta destete). */
export function simularCria(i: CriaInput): CriaAnio[] {
  const pct = (v: number) => (v || 0) / 100;
  const capacidad = i.hectareas > 0 && i.evHa > 0 ? i.hectareas * i.evHa : null;
  let vientres = i.vientres;
  const recria: number[] = []; // vaquillonas retenidas por año, entran al servicio con demora
  const out: CriaAnio[] = [];

  for (let anio = 1; anio <= i.anios; anio++) {
    const entran = recria[anio - 1 - i.demoraEntore] ?? 0;
    vientres = Math.max(0, vientres + entran + (anio > 1 ? i.compraVientresAnual - i.ventaVientresAnual : 0));

    const enRecria = recria.slice(Math.max(0, anio - 1 - i.demoraEntore + 1), anio - 1).reduce((a, b) => a + b, 0);
    let ajustePorTope = 0;
    if (i.topeHectareas && capacidad != null) {
      const maxVientres = Math.max(0, (capacidad - enRecria * EV_VAQUILLONA) / EV_VIENTRE);
      if (vientres > maxVientres) {
        ajustePorTope = vientres - maxVientres;
        vientres = maxVientres;
      }
    }

    const terneros = vientres * pct(i.prenezPct) * (1 - pct(i.perdidasPct));
    const retenidas = (terneros / 2) * pct(i.retencionPct);
    recria[anio - 1] = retenidas;
    const ternerosVendidos = terneros - retenidas;
    const vacias = i.venderVacias ? vientres * (1 - pct(i.prenezPct)) : 0;
    const refugo = Math.min(vientres, vientres * pct(i.refugoPct) + vacias + ajustePorTope);
    const muertes = vientres * pct(i.mortandadPct);

    const kgTerneros = ternerosVendidos * i.pesoDesteteKg;
    const kgRefugo = refugo * i.pesoVacaKg;
    const ingresos = kgTerneros * i.precioTerneroKg + kgRefugo * i.precioVacaKg;
    const costos = vientres * i.costoVientre;
    const ev = vientres * EV_VIENTRE + (enRecria + retenidas) * EV_VAQUILLONA;

    out.push({
      anio,
      vientres,
      terneros,
      retenidas,
      vaquillonasRecria: enRecria + retenidas,
      ternerosVendidos,
      refugo,
      kgVendidos: kgTerneros + kgRefugo,
      ingresos,
      costos,
      margen: ingresos - costos,
      ev,
      cargaEvHa: i.hectareas > 0 ? ev / i.hectareas : null,
      ajustePorTope,
    });

    vientres = Math.max(0, vientres - (refugo - ajustePorTope) - muertes);
  }
  return out;
}
