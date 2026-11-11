import { type ItemCalendario } from '@/components/sanidad/calendario-section';
import { ejercicioDe,mesKey,ultimosMeses } from '@/lib/calc/fechas';
import { fmtDate } from '@/lib/calc/format';
import { animalesEnCarencia,proximasOperaciones } from '@/lib/calc/sanidad';
import { canEdit,getSessionPerfil } from '@/lib/db/auth';
import { byId,getAnimals,getCatalogo,getEstablecimiento,getLotes,selectAll } from '@/lib/db/client';
import { getManagement } from '@/lib/management/data';

export async function loadSanidad(){
const [animals, catalogo, lotes, logs, scheduled, est, perfil, management] = await Promise.all([
    getAnimals(),
    getCatalogo(),
    getLotes(),
    selectAll('operation_logs', {columns:'*,aplicacion_animales(animal_id)', order: 'fecha_aplicacion', ascending: false }),
    selectAll('scheduled_operations', { order: 'fecha_programada' }),
    getEstablecimiento(),
    getSessionPerfil(),
    getManagement(),
  ]);
const ahora = Date.now();
const cat = byId(catalogo);
const lotesById = byId(lotes);
const animalsById = byId(animals);
const loteNombre = (id: string | null) => (id ? (lotesById.get(id)?.nombre ?? '?') : 'Todo el rodeo');
const ejercicio = ejercicioDe(ahora, est.inicio_ejercicio_mes);
const carencias = animalesEnCarencia(animals, logs, ahora);
const proximas = proximasOperaciones(scheduled, ahora, 30);
const costoEjercicio = logs
    .filter((l) => l.fecha_aplicacion >= ejercicio.inicio)
    .reduce((acc, l) => acc + (l.costo_total ?? 0), 0);
const fin = new Date(new Date(ahora).getFullYear(), new Date(ahora).getMonth() + 9, 1).getTime();
const meses = ultimosMeses(12, fin).map((m) => m.key);
const items: Record<string, ItemCalendario[]> = {};
const push = (it: ItemCalendario) => {
    const k = mesKey(it.fecha);
    if (meses.includes(k)) (items[k] ??= []).push(it);
  };
scheduled.forEach((s) =>
    push({
      id: s.id,
      fecha: s.fecha_programada,
      nombre: cat.get(s.operation_id)?.nombre ?? 'Operación',
      lote: loteNombre(s.lote_id),
      estado: s.estado,
      vencida: s.estado === 'PENDIENTE' && s.fecha_programada < ahora,
    }),
  );
logs
    .filter((l) => l.lote_id)
    .forEach((l) =>
      push({ id: l.id, fecha: l.fecha_aplicacion, nombre: cat.get(l.operation_id)?.nombre ?? 'Aplicación', lote: loteNombre(l.lote_id), estado: 'APLICADO', vencida: false }),
    );
Object.values(items).forEach((l) => l.sort((a, b) => a.fecha - b.fecha));
const editable = canEdit(perfil?.rol);
const programadas = scheduled
    .filter((s) => s.estado === 'PENDIENTE')
    .map((s) => ({ id: s.id, label: `${cat.get(s.operation_id)?.nombre} · ${loteNombre(s.lote_id)} · ${fmtDate(s.fecha_programada)}` }));
return {animals,catalogo,lotes,logs,scheduled,est,perfil,management,ahora,cat,lotesById,animalsById,loteNombre,ejercicio,carencias,proximas,costoEjercicio,fin,meses,items,push,editable,programadas};
}
export type PageData=Awaited<ReturnType<typeof loadSanidad>>;
