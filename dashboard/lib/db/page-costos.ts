import { costosPorLote } from '@/lib/calc/costos';
import { DAY_MS,ejercicioAnterior,ejercicioDe } from '@/lib/calc/fechas';
import { enRango,sumar,tipoCosto } from '@/lib/calc/finanzas';
import { kgGanados,pesajesPorAnimal } from '@/lib/calc/pesadas';
import { prenez,tactos } from '@/lib/calc/reproduccion';
import { activos } from '@/lib/calc/stock';
import { byId,getAnimals,getCatalogo,getEstablecimiento,getEventos,getLotes,getMovimientosFinancieros,selectAll } from '@/lib/db/client';
const NOMBRE: Record<string, string> = {
  SANIDAD: 'Sanidad',
  NUTRICION: 'Suplemento y sal',
  ALQUILER: 'Alquiler',
  MANO_OBRA: 'Mano de obra',
  COMPRA: 'Compra de hacienda',
  IMPUESTOS: 'Impuestos',
  MANTENIMIENTO: 'Mantenimiento',
  AMORTIZACION: 'Amortizaciones',
  OTRO: 'Otros',
};
export async function loadCostos({ searchParams }: { searchParams: Promise<{ ej?: string }> }){
const [{ ej }, animals, lotes, movs, logs, catalogo, eventos, servicios, est] = await Promise.all([
    searchParams,
    getAnimals(),
    getLotes(),
    getMovimientosFinancieros(),
    selectAll('operation_logs',{columns:'*,aplicacion_animales(animal_id)'}),
    getCatalogo(),
    getEventos(),
    selectAll('servicios', { order: 'fecha_entrada', ascending: false }),
    getEstablecimiento(),
  ]);
const ahora = Date.now();
const actual = ejercicioDe(ahora, est.inicio_ejercicio_mes);
const periodo = ej === 'anterior' ? ejercicioAnterior(actual, est.inicio_ejercicio_mes) : actual;
const hasta = Math.min(periodo.fin, ahora);
const delPeriodo = enRango(movs, periodo.inicio, periodo.fin);
const gastos = delPeriodo.filter((m) => m.tipo === 'GASTO');
const directos = sumar(gastos, 'GASTO', (m) => tipoCosto(m.categoria) === 'directo');
const estructura = sumar(gastos, 'GASTO', (m) => tipoCosto(m.categoria) === 'estructura');
const total = directos + estructura;
const cabezas = activos(animals).length;
const kg = kgGanados(pesajesPorAnimal(eventos), periodo.inicio, hasta);
const terneros = animals.filter((a) => ['Ternero', 'Ternera'].includes(a.categoria) && a.estado !== 'MUERTO').length;
const porCategoria = Object.entries(
    gastos.reduce<Record<string, number>>((acc, m) => ({ ...acc, [m.categoria]: (acc[m.categoria] ?? 0) + m.monto }), {}),
  )
    .map(([categoria, monto]) => ({ categoria, monto, tipo: tipoCosto(categoria) }))
    .sort((a, b) => b.monto - a.monto);
const lotesCostos = costosPorLote({ lotes, animals, movs, logs, catalogo: byId(catalogo), desde: periodo.inicio, hasta });
const servicio = servicios[0];
const vientres = servicio?.vientres ?? animals.filter((a) => a.estado === 'ACTIVO' && ['Vaca', 'Vaquillona'].includes(a.categoria)).length;
const pr = prenez(tactos(eventos, ahora - 365 * DAY_MS));
const pesoTerneros = animals.filter((a) => a.estado === 'ACTIVO' && ['Ternero', 'Ternera'].includes(a.categoria) && a.peso_actual);
const anual = (v: number) => (v * 365 * DAY_MS) / Math.max(DAY_MS, hasta - periodo.inicio);
return {ej,animals,lotes,movs,logs,catalogo,eventos,servicios,est,ahora,actual,periodo,hasta,delPeriodo,gastos,directos,estructura,total,cabezas,kg,terneros,porCategoria,lotesCostos,servicio,vientres,pr,pesoTerneros,anual,NOMBRE};
}
export type PageData=Awaited<ReturnType<typeof loadCostos>>;
