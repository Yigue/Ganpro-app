import { DAY_MS,mesLabel } from '@/lib/calc/fechas';
import { cadenaForrajera,cargaPorPotrero,composicionRacion,entregasPorPotrero,suplementosBajoMinimo } from '@/lib/calc/nutricion';
import { activos,totalEV } from '@/lib/calc/stock';
import { canEdit,getSessionPerfil } from '@/lib/db/auth';
import { byId,getAnimals,getCategoriasConfig,getEstablecimiento,getLotes,getPotreros,getSuplementos,selectAll } from '@/lib/db/client';

export async function loadNutricion(){
const [animals, potreros, config, suplementos, raciones, ingredientes, logs, movimientos, est, perfil, lotes] = await Promise.all([
    getAnimals(),
    getPotreros(),
    getCategoriasConfig(),
    getSuplementos(),
    selectAll('raciones', { order: 'nombre' }),
    selectAll('racion_ingredientes'),
    selectAll('potrero_feeding_logs', { order: 'fecha', ascending: false }),
    selectAll('animal_movements', { order: 'fecha', ascending: false }),
    getEstablecimiento(),
    getSessionPerfil(),
    getLotes(),
  ]);
const ahora = Date.now();
const supById = byId(suplementos);
const potrerosById = byId(potreros);
const vivos = activos(animals);
const ev = totalEV(vivos, config);
const hectareas = est.hectareas_ganaderas ?? potreros.reduce((a, p) => a + (p.hectareas ?? 0), 0);
const cargas = cargaPorPotrero(potreros, animals, config);
const ultimoIngreso = new Map<string, number>();
for (const m of movimientos) {
    if (m.potrero_destino_id && !ultimoIngreso.has(m.potrero_destino_id)) ultimoIngreso.set(m.potrero_destino_id, m.fecha);
  }
const composiciones = new Map(raciones.map((r) => [r.id, composicionRacion(ingredientes.filter((i) => i.racion_id === r.id), supById)]));
const desde = ahora - 30 * DAY_MS;
const entregas = entregasPorPotrero(logs, composiciones, desde);
const totalKgMS = entregas.reduce((a, e) => a + e.kgMS, 0);
const totalCosto = entregas.some(e=>e.costo==null)?null:entregas.reduce((a, e) => a + (e.costo ?? 0), 0);
const bajos = suplementosBajoMinimo(suplementos);
const sobrecargados = cargas.filter((c) => (c.ocupacionPct ?? 0) > 100);
const cadena = cadenaForrajera(potreros, ev, new Date(ahora).getFullYear()).map((c) => ({
    label: mesLabel(`2000-${String(c.mes + 1).padStart(2, '0')}`).split(' ')[0],
    Oferta: c.oferta / 1000,
    Demanda: c.demanda / 1000,
  }));
const formulas = Object.fromEntries(
    raciones.map((r) => [r.id, ingredientes.filter((i) => i.racion_id === r.id).map((i) => ({ suplemento_id: i.suplemento_id, porcentaje: i.porcentaje }))]),
  );
const editable = canEdit(perfil?.rol);
return {animals,potreros,config,suplementos,raciones,ingredientes,logs,movimientos,est,perfil,lotes,ahora,supById,potrerosById,vivos,ev,hectareas,cargas,ultimoIngreso,composiciones,desde,entregas,totalKgMS,totalCosto,bajos,sobrecargados,cadena,formulas,editable};
}
export type PageData=Awaited<ReturnType<typeof loadNutricion>>;
