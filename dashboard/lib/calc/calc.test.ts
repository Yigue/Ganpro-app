import { describe, expect, it } from 'vitest';
import type { Animal, CategoriaConfig, Evento, MovimientoFinanciero, PrecioMercado } from '@/lib/db/types';
import { ejercicioDe, ultimosMeses, DAY_MS } from './fechas';
import { gdp, kgGanados, pesajesPorAnimal } from './pesadas';
import { parseTacto, prenez, tactos } from './reproduccion';
import { recategorizacionesPendientes, totalEV, cargaEVha, historicoCabezas } from './stock';
import { animalesEnCarencia } from './sanidad';
import { composicionRacion } from './nutricion';
import { dolarEn, margenBruto, valuacionRodeo, porMes } from './finanzas';
import { simularCria } from './costos';

const ahora = new Date(2026, 10, 1).getTime();

const animal = (p: Partial<Animal>): Animal => ({
  id: p.id ?? 'a',
  id_caravana: '1',
  rfid: null,
  sexo: 'H',
  categoria: 'Vaca',
  raza: null,
  fecha_nacimiento: null,
  peso_actual: null,
  estado: 'ACTIVO',
  lote_id: null,
  potrero_id: null,
  synced_at: null,
  created_at: 0,
  updated_at: 0,
  ...p,
});

const evento = (p: Partial<Evento>): Evento => ({
  id: Math.random().toString(),
  animal_id: 'a',
  tipo: 'PESAJE',
  valor: null,
  notas: null,
  timestamp: 0,
  lote_destino_id: null,
  dte_numero: null,
  created_at: 0,
  updated_at: 0,
  ...p,
});

const config: CategoriaConfig[] = [
  { categoria: 'Vaca', sexo: 'H', ev: 1, orden: 1, recategoriza_a: null, edad_recategorizacion_meses: null, consumo_sal_g_dia: 80, precio_columna: 'vaca_kg' },
  { categoria: 'Ternero', sexo: 'M', ev: 0.5, orden: 2, recategoriza_a: 'Novillito', edad_recategorizacion_meses: 12, consumo_sal_g_dia: 40, precio_columna: 'ternero_kg' },
];

describe('fechas', () => {
  it('ejercicio julio-junio', () => {
    expect(ejercicioDe(new Date(2026, 10, 1).getTime()).label).toBe('2026-27');
    expect(ejercicioDe(new Date(2026, 5, 30).getTime()).label).toBe('2025-26');
  });
  it('últimos meses en orden', () => {
    const m = ultimosMeses(3, ahora).map((x) => x.key);
    expect(m).toEqual(['2026-09', '2026-10', '2026-11']);
  });
});

describe('pesadas', () => {
  it('gdp por regresión igual a la app', () => {
    expect(gdp([{ timestamp: 0, valor: 200 }, { timestamp: 100 * DAY_MS, valor: 260 }])).toBeCloseTo(0.6);
    expect(gdp([{ timestamp: 0, valor: 200 }])).toBeNull();
  });
  it('kg ganados en rango', () => {
    const p = pesajesPorAnimal([
      evento({ valor: 200, timestamp: 10 }),
      evento({ valor: 250, timestamp: 20 }),
      evento({ animal_id: 'b', valor: 300, timestamp: 15 }),
    ]);
    expect(kgGanados(p, 0, 100)).toBe(50);
  });
});

describe('reproducción', () => {
  it('lee el formato de notas de la app', () => {
    expect(parseTacto('tacto:prenada cabeza')).toBe('prenada');
    expect(parseTacto('tacto:vacia')).toBe('vacia');
    expect(parseTacto('otra cosa')).toBeNull();
  });
  it('usa el último tacto por animal', () => {
    const t = tactos([
      evento({ tipo: 'TACTO', notas: 'tacto:vacia', timestamp: 1 }),
      evento({ tipo: 'TACTO', notas: 'tacto:prenada', timestamp: 2 }),
      evento({ animal_id: 'b', tipo: 'TACTO', notas: 'tacto:vacia', timestamp: 2 }),
    ]);
    expect(prenez(t)).toEqual({ tactadas: 2, prenadas: 1, pct: 50 });
  });
});

describe('stock', () => {
  it('EV y carga', () => {
    const ev = totalEV([animal({}), animal({ categoria: 'Ternero' }), animal({ categoria: 'Desconocida' })], config);
    expect(ev).toBe(2.5);
    expect(cargaEVha(ev, 5)).toBe(0.5);
  });
  it('recategoriza por edad', () => {
    const r = recategorizacionesPendientes(
      [animal({ id: 't1', categoria: 'Ternero', fecha_nacimiento: ahora - 400 * DAY_MS }), animal({ id: 't2', categoria: 'Ternero', fecha_nacimiento: ahora - 100 * DAY_MS })],
      config,
      ahora,
    );
    expect(r.map((x) => x.animal.id)).toEqual(['t1']);
    expect(r[0].a).toBe('Novillito');
  });
  it('histórico descuenta bajas', () => {
    const h = historicoCabezas(
      [animal({ id: 'a', estado: 'MUERTO' }), animal({ id: 'b' })],
      [evento({ animal_id: 'a', tipo: 'MUERTE', timestamp: 50 })],
      [{ key: 'm1', fin: 10 }, { key: 'm2', fin: 100 }],
    );
    expect(h[0].Vaca).toBe(2);
    expect(h[1].Vaca).toBe(1);
  });
});

describe('sanidad', () => {
  it('carencia por lote alcanza a los animales del lote', () => {
    const c = animalesEnCarencia(
      [animal({ id: 'a', lote_id: 'L' }), animal({ id: 'b', lote_id: 'X' })],
      [{ id: 'l', animal_id: null, lote_id: 'L', operation_id: 'op', fecha_aplicacion: 0, fecha_fin_carencia: ahora + DAY_MS, dosis: 1, responsable: null, acta_numero: null, producto_lote: null, created_at: 0, updated_at: 0 }],
      ahora,
    );
    expect(c.map((x) => x.animal.id)).toEqual(['a']);
  });
});

describe('nutrición', () => {
  it('costo por kg de la fórmula', () => {
    const sup = new Map([
      ['s', { id: 's', materia_seca_pct: 100, precio_por_tonelada: 100000 }],
      ['f', { id: 'f', materia_seca_pct: 90, precio_por_tonelada: 1000000 }],
    ] as never) as never;
    const c = composicionRacion(
      [
        { id: '1', racion_id: 'r', suplemento_id: 's', porcentaje: 70, created_at: 0, updated_at: 0 },
        { id: '2', racion_id: 'r', suplemento_id: 'f', porcentaje: 30, created_at: 0, updated_at: 0 },
      ],
      sup,
    );
    expect(c.costoKg).toBeCloseTo(70 + 300);
    expect(c.msPct).toBeCloseTo(97);
  });
});

describe('finanzas', () => {
  const precio = (fecha: number, dolar: number): PrecioMercado =>
    ({ id: String(fecha), fecha, dolar_oficial: dolar, vaca_kg: 2000 }) as PrecioMercado;
  const mov = (p: Partial<MovimientoFinanciero>): MovimientoFinanciero => ({ id: '', tipo: 'GASTO', categoria: 'SANIDAD', monto: 0, fecha: 0, ...p }) as MovimientoFinanciero;

  it('dólar más cercano anterior', () => {
    const ps = [precio(10, 1000), precio(20, 1200)];
    expect(dolarEn(ps, 15)).toBe(1000);
    expect(dolarEn(ps, 25)).toBe(1200);
    expect(dolarEn(ps, 5)).toBeNull();
  });
  it('margen bruto separa estructura', () => {
    const m = margenBruto([
      mov({ tipo: 'INGRESO', categoria: 'VENTA', monto: 1000 }),
      mov({ categoria: 'SANIDAD', monto: 200 }),
      mov({ categoria: 'IMPUESTOS', monto: 100 }),
    ]);
    expect(m.margenBruto).toBe(800);
    expect(m.resultado).toBe(700);
  });
  it('valuación del rodeo', () => {
    const v = valuacionRodeo([animal({ peso_actual: 400 }), animal({ peso_actual: 500 })], config, precio(0, 1));
    expect(v[0].valor).toBe(2 * 450 * 2000);
  });
  it('por mes con USD', () => {
    const t = new Date(2026, 9, 15).getTime();
    const r = porMes([mov({ tipo: 'INGRESO', monto: 2000, fecha: t })], ['2026-10'], [precio(0, 1000)]);
    expect(r[0].ingresosUSD).toBe(2);
  });
});

describe('simulador', () => {
  it('más preñez baja el costo por kg', () => {
    const base = { vientres: 100, destetePct: 90, pesoDesteteKg: 180, costoTotal: 10_000_000, otrosKg: 0 };
    const a = simularCria({ ...base, prenezPct: 80 });
    const b = simularCria({ ...base, prenezPct: 90 });
    expect(b.costoPorKg!).toBeLessThan(a.costoPorKg!);
  });
});

import { parseCsvRFID } from './csv';

describe('csv RFID', () => {
  it('sin encabezado: rfid, peso', () => {
    const r = parseCsvRFID('982 000400000001;312,5\n982000400000002;0\n');
    expect(r.filas[0]).toMatchObject({ rfid: '982000400000001', peso: 312.5 });
    expect(r.filas[1].peso).toBeNull();
  });
  it('con encabezado y alias', () => {
    const r = parseCsvRFID('EID,VID,Weight,Fecha\n982000400000003,0003,280,15/10/2026\n,,,\n');
    expect(r.filas).toHaveLength(1);
    expect(r.filas[0]).toMatchObject({ rfid: '982000400000003', caravana: '0003', peso: 280 });
    expect(new Date(r.filas[0].fecha!).getMonth()).toBe(9);
    expect(r.errores).toHaveLength(1);
  });
});
