import { describe, expect, it } from 'vitest';
import { DAY_MS } from './fechas';
import {
  estacionalidad,
  fechaObjetivo,
  pesoEn,
  proyectarPeso,
  sensibilidad,
  simularCria,
  simularNegocio,
  simularPlan,
  type CriaInput,
  type NegocioInput,
} from './proyeccion';

const base: NegocioInput = {
  nombre: 'Novillos verdeo',
  cabezas: 100,
  kgEntrada: 200,
  kgSalida: 340,
  precioCompra: 3600,
  precioVenta: 3000,
  dias: 140,
  alimentacion: 60000,
  sanidad: 8000,
  pastura: 40000,
  otrosDirectos: 0,
  hectareas: 40,
  alquilerHa: 200000,
  gastosCompraPct: 4,
  gastosVentaPct: 5,
  desbastePct: 3,
  mortandadPct: 1,
};

describe('negocio', () => {
  it('margen neto = margen bruto − costo de oportunidad de la tierra (regla RTC: 514.343 − 84.167 = 430.176)', () => {
    const r = simularNegocio(base);
    expect(r.margenNeto).toBeCloseTo(r.margenBruto - r.costoTierra);
    expect(514343 - 84167).toBe(430176);
    expect(r.costoTierra).toBeCloseTo((40 * 200000 * 140) / 365 / 100);
  });

  it('renta anualizada = renta del ciclo × 365 / días (regla RTC: 13,5 % en 140 días ≈ 35,2 %)', () => {
    const r = simularNegocio(base);
    expect(r.rentaAnual!).toBeCloseTo((r.renta! * 365) / 140);
    expect(((0.135 * 365) / 140) * 100).toBeCloseTo(35.2, 1);
  });

  it('al precio de equilibrio el margen neto es cero', () => {
    const r = simularNegocio(base);
    const eq = simularNegocio({ ...base, precioVenta: r.precioEquilibrio! });
    expect(eq.margenNeto).toBeCloseTo(0, 4);
  });

  it('fórmula de margen bruto sin gastos comerciales', () => {
    const r = simularNegocio({ ...base, gastosCompraPct: 0, gastosVentaPct: 0, desbastePct: 0, mortandadPct: 0 });
    expect(r.margenBruto).toBeCloseTo(340 * 3000 - 200 * 3600 - 108000);
  });

  it('sensibilidad: más precio y más ganancia diaria dan más margen', () => {
    const t = sensibilidad(base, [2800, 3200], [0.6, 1.0]);
    expect(t[1][1]).toBeGreaterThan(t[0][0]);
    expect(t[0][1]).toBeGreaterThan(t[0][0]);
  });
});

describe('peso', () => {
  it('proyecta lineal y encuentra la fecha objetivo', () => {
    const curva = proyectarPeso({ pesoInicial: 300, desde: 0, gdp: 0.6, dias: 200 });
    expect(pesoEn(curva, 100 * DAY_MS)).toBeCloseTo(360);
    expect(fechaObjetivo(curva, 360)).toBe(100 * DAY_MS);
  });
  it('la curva estacional promedia cerca de la lineal en un año', () => {
    const lin = proyectarPeso({ pesoInicial: 200, desde: new Date(2026, 0, 1).getTime(), gdp: 0.5, dias: 365 });
    const est = proyectarPeso({ pesoInicial: 200, desde: new Date(2026, 0, 1).getTime(), gdp: 0.5, dias: 365, estacional: true, recurso: 'Campo natural' });
    expect(Math.abs(est[365].peso - lin[365].peso)).toBeLessThan(5);
  });
});

describe('plan', () => {
  it('stock, flujo y alerta de capacidad', () => {
    const r = simularPlan({
      meses: ['2026-12', '2027-01'],
      stockInicial: { Vaca: 100, Ternero: 40 },
      lineas: [
        { mes: '2026-12', tipo: 'COMPRA', categoria: 'Vaca', cabezas: 20, kg: 400, precioKg: 2000 },
        { mes: '2027-01', tipo: 'VENTA', categoria: 'Ternero', cabezas: 40, kg: 180, precioKg: 3500 },
      ],
      gastoMensual: 1000,
      ev: new Map([['Vaca', 1], ['Ternero', 0.5]]),
      capacidadEv: 130,
    });
    expect(r[0].stock.Vaca).toBe(120);
    expect(r[0].sobreCapacidad).toBe(true);
    expect(r[1].stock.Ternero).toBe(0);
    expect(r[1].ingresos).toBe(40 * 180 * 3500);
    expect(r[1].acumulado).toBe(-20 * 400 * 2000 - 1000 + 40 * 180 * 3500 - 1000);
  });
});

describe('precios', () => {
  it('estacionalidad promedia por mes', () => {
    const e = estacionalidad([
      { fecha: new Date(2025, 2, 1).getTime(), valor: 100 },
      { fecha: new Date(2026, 2, 1).getTime(), valor: 200 },
    ]);
    expect(e[2]).toBe(150);
    expect(e[0]).toBeNull();
  });
});

describe('cría', () => {
  const cria: CriaInput = {
    anios: 5, vientres: 100, prenezPct: 85, perdidasPct: 5, retencionPct: 0, refugoPct: 0, mortandadPct: 0,
    venderVacias: false, demoraEntore: 2, compraVientresAnual: 0, ventaVientresAnual: 0,
    pesoDesteteKg: 180, precioTerneroKg: 3500, pesoVacaKg: 420, precioVacaKg: 1800, costoVientre: 100000,
    hectareas: 0, evHa: 0, topeHectareas: false,
  };
  it('terneros = vientres × preñez × (1 − pérdidas)', () => {
    expect(simularCria(cria)[0].terneros).toBeCloseTo(100 * 0.85 * 0.95);
  });
  it('retener terneras hace crecer el rodeo con la demora de entore', () => {
    const r = simularCria({ ...cria, retencionPct: 50 });
    expect(r[1].vientres).toBe(100);
    expect(r[2].vientres).toBeCloseTo(100 + (80.75 / 2) * 0.5);
  });
  it('85 % de preñez da más margen que 75 %', () => {
    const a = simularCria({ ...cria, prenezPct: 75 }).reduce((s, x) => s + x.margen, 0);
    const b = simularCria(cria).reduce((s, x) => s + x.margen, 0);
    expect(b).toBeGreaterThan(a);
  });
  it('el tope de hectáreas limita los vientres', () => {
    const r = simularCria({ ...cria, vientres: 200, hectareas: 100, evHa: 1, topeHectareas: true });
    expect(r[0].vientres).toBe(100);
    expect(r[0].ajustePorTope).toBe(100);
  });
});
