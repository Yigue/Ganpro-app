import { DAY_MS } from '@/lib/calc/fechas';
import { ccPromedio,prenez,tactos } from '@/lib/calc/reproduccion';
import { canEdit,getSessionPerfil } from '@/lib/db/auth';
import { byId,getAnimals,getEventos,getLotes,getMovimientosFinancieros,selectAll } from '@/lib/db/client';

export async function loadReproduccion(){
const [animals, eventos, lotes, servicios, protocolos, etapas, cc, revisaciones, movs, perfil] = await Promise.all([
    getAnimals(),
    getEventos(),
    getLotes(),
    selectAll('servicios', { order: 'fecha_entrada', ascending: false }),
    selectAll('protocolos_iatf', { order: 'fecha_inicio', ascending: false }),
    selectAll('etapas_protocolo', { order: 'dias_desde_inicio' }),
    selectAll('condicion_corporal'),
    selectAll('revisacion_toros', { order: 'fecha', ascending: false }),
    getMovimientosFinancieros(),
    getSessionPerfil(),
  ]);
const ahora = Date.now();
const animalsById = byId(animals);
const lotesById = byId(lotes);
const loteNombre = (id: string | null) => (id ? (lotesById.get(id)?.nombre ?? '?') : 'Sin lote');
const ultima = servicios[0]?.temporada;
const delaTemporada = servicios.filter((s) => s.temporada === ultima);
const inicioTemporada = delaTemporada.length ? Math.min(...delaTemporada.map((s) => s.fecha_entrada)) : ahora - 365 * DAY_MS;
const listaTactos = tactos(eventos, inicioTemporada);
const general = prenez(listaTactos);
const vientres = delaTemporada.reduce((a, s) => a + (s.vientres ?? 0), 0) || null;
const toros = delaTemporada.reduce((a, s) => a + s.toros.length, 0);
const ccServicio = cc.filter((r) => r.fecha >= inicioTemporada - 60 * DAY_MS && r.fecha <= inicioTemporada + 30 * DAY_MS);
const ccLotes = [...new Set(cc.map((r) => r.lote_id))].map((loteId) => ({
    lote: loteNombre(loteId),
    cc: ccPromedio(cc.filter((r) => r.lote_id === loteId)),
    n: cc.filter((r) => r.lote_id === loteId).length,
  }));
const terneros = animals.filter((a) => a.estado === 'ACTIVO' && ['Ternero', 'Ternera'].includes(a.categoria));
const vendidosTerneros = movs.filter(
    (m) => m.categoria === 'VENTA' && ['Ternero', 'Ternera'].includes(m.categoria_animal ?? '') && m.fecha >= ahora - 365 * DAY_MS,
  );
const destetados = terneros.length + vendidosTerneros.reduce((a, m) => a + (m.cabezas ?? 0), 0);
const kgDestetados =
    terneros.reduce((a, t) => a + (t.peso_actual ?? 0), 0) + vendidosTerneros.reduce((a, m) => a + (m.kg ?? 0), 0);
const tercios = ['cabeza', 'cuerpo', 'cola'].map((t) => ({ name: t[0].toUpperCase() + t.slice(1), value: listaTactos.filter((x) => x.tercio === t).length }));
const editable = canEdit(perfil?.rol);
const anio = new Date(ahora).getFullYear();
return {animals,eventos,lotes,servicios,protocolos,etapas,cc,revisaciones,movs,perfil,ahora,animalsById,lotesById,loteNombre,ultima,delaTemporada,inicioTemporada,listaTactos,general,vientres,toros,ccServicio,ccLotes,terneros,vendidosTerneros,destetados,kgDestetados,tercios,editable,anio};
}
export type PageData=Awaited<ReturnType<typeof loadReproduccion>>;
