import {getManagement} from '@/lib/management/data';
import {reproductiveCohort} from '@/lib/calc/reproductive-cohort';
import {businessParts} from '@/lib/calc/fechas';
import { DAY_MS } from '@/lib/calc/fechas';
import { ccPromedio,prenez,tactos } from '@/lib/calc/reproduccion';
import { canEdit,getSessionPerfil } from '@/lib/db/auth';
import { byId,getAnimals,getEventos,getLotes,getMovimientosFinancieros,selectAll } from '@/lib/db/client';

export async function loadReproduccion(){
const [animals, eventos, lotes, servicios, protocolos, etapas, cc, revisaciones, movs, perfil,management] = await Promise.all([
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
    getManagement(),
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

const toros = new Set(delaTemporada.flatMap(s=>s.toros)).size;
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
const cohort=reproductiveCohort(delaTemporada,management.ciclos,eventos,ahora);
const vientres=cohort.solapados?null:cohort.declarados;
const cohorts=delaTemporada.map(s=>({service:s,summary:reproductiveCohort([s],management.ciclos,eventos,ahora)}));
const unlinkedWeanings=new Set(eventos.filter(e=>e.tipo==='DESTETE'&&e.timestamp>=inicioTemporada&&e.timestamp<=ahora&&!management.ciclos.some(c=>c.ternero_id===e.animal_id&&c.fecha_destete===e.timestamp)).map(e=>e.animal_id)).size;
const destetados=cohort.destetados,kgDestetados=cohort.kgDestetados;
const tercios = ['cabeza', 'cuerpo', 'cola'].map((t) => ({ name: t[0].toUpperCase() + t.slice(1), value: listaTactos.filter((x) => x.tercio === t).length }));
const editable = canEdit(perfil?.rol);
const anio = businessParts(ahora).year;
return {unlinkedWeanings,cohort,cohorts,animals,eventos,lotes,servicios,protocolos,etapas,cc,revisaciones,movs,perfil,ahora,animalsById,lotesById,loteNombre,ultima,delaTemporada,inicioTemporada,listaTactos,general,vientres,toros,ccServicio,ccLotes,terneros,vendidosTerneros,destetados,kgDestetados,tercios,editable,anio};
}
export type PageData=Awaited<ReturnType<typeof loadReproduccion>>;
