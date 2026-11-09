import type {Alerta} from '@/components/inicio/alertas-section';
import {fmtDate,fmtDateShort} from '@/lib/calc/format';
import {suplementosBajoMinimo} from '@/lib/calc/nutricion';
import {pesadasAtrasadas,pesajesPorAnimal} from '@/lib/calc/pesadas';
import {proximasOperaciones,vencidas} from '@/lib/calc/sanidad';
import {conciliar,ultimaActa} from '@/lib/calc/sigsa';
import {recategorizacionesPendientes} from '@/lib/calc/stock';
import {byId,getAnimals,getCategoriasConfig,getEstablecimiento,getEventos,getCatalogo,getSuplementos,getLotes} from '@/lib/db/client';
interface AlertInput { animals: Awaited<ReturnType<typeof getAnimals>>; config: Awaited<ReturnType<typeof getCategoriasConfig>>; est: Awaited<ReturnType<typeof getEstablecimiento>>; eventos: Awaited<ReturnType<typeof getEventos>>; scheduled: import('@/lib/db/types').ScheduledOperation[]; catalogo: Awaited<ReturnType<typeof getCatalogo>>; suplementos: Awaited<ReturnType<typeof getSuplementos>>; sigsa: import('@/lib/db/types').SigsaStock[]; lotes: Awaited<ReturnType<typeof getLotes>>; mangaPendientes: import('@/lib/db/types').MangaAction[]; ahora:number; }
export function homeAlerts({animals,config,est,eventos,scheduled,catalogo,suplementos,sigsa,lotes,mangaPendientes,ahora}:AlertInput){
  // Alertas ---------------------------------------------------------------------
  const alertas: Alerta[] = [];
  const cat = byId(catalogo);
  const lotesById = byId(lotes);
  for (const op of vencidas(scheduled, ahora)) {
    alertas.push({
      tipo: 'sanidad',
      nivel: 'alta',
      titulo: `Vencida: ${cat.get(op.operation_id)?.nombre ?? 'Operación'}`,
      detalle: `${lotesById.get(op.lote_id ?? '')?.nombre ?? 'Sin lote'} · programada el ${fmtDate(op.fecha_programada)}`,
      href: '/sanidad',
    });
  }
  for (const op of proximasOperaciones(scheduled, ahora, est.dias_alerta_sanidad).filter((o) => o.fecha_programada >= ahora)) {
    alertas.push({
      tipo: 'sanidad',
      nivel: 'media',
      titulo: `${cat.get(op.operation_id)?.nombre ?? 'Operación'} el ${fmtDateShort(op.fecha_programada)}`,
      detalle: lotesById.get(op.lote_id ?? '')?.nombre ?? 'Sin lote asignado',
      href: '/sanidad',
    });
  }
  const acta = ultimaActa(sigsa);
  if (acta.fecha) {
    const difs = conciliar(animals, acta.filas).filter((f) => f.diferencia !== 0);
    if (difs.length) {
      alertas.push({
        tipo: 'sigsa',
        nivel: 'alta',
        titulo: 'Stock distinto del de SIGSA',
        detalle: difs.map((d) => `${d.categoria} ${d.diferencia > 0 ? '+' : ''}${d.diferencia}`).join(' · ') + ` (acta del ${fmtDate(acta.fecha)})`,
        href: '/movimientos',
      });
    }
  }
  for (const s of suplementosBajoMinimo(suplementos)) {
    alertas.push({
      tipo: 'insumo',
      nivel: 'media',
      titulo: `${s.nombre} bajo mínimo`,
      detalle: `Quedan ${Math.round(s.stock_kg ?? 0)} kg (mínimo ${Math.round(s.stock_minimo_kg ?? 0)} kg)`,
      href: '/nutricion',
    });
  }
  const atrasadas = pesadasAtrasadas(animals, pesajesPorAnimal(eventos), est.dias_alerta_pesada, ahora);
  if (atrasadas.length) {
    alertas.push({
      tipo: 'pesada',
      nivel: 'media',
      titulo: `${atrasadas.length} animales sin pesar hace más de ${est.dias_alerta_pesada} días`,
      detalle: 'Programá una pesada para seguir la ganancia diaria',
      href: '/stock?alerta=pesada',
    });
  }
  const recat = recategorizacionesPendientes(animals, config, ahora);
  if (recat.length) {
    alertas.push({
      tipo: 'recategorizacion',
      nivel: 'media',
      titulo: `${recat.length} animales para recategorizar por edad`,
      detalle: 'Confirmalos desde Stock',
      href: '/stock#recategorizacion',
    });
  }
  if (mangaPendientes.some((m) => m.status === 'ERROR')) {
    alertas.push({ tipo: 'sync', nivel: 'alta', titulo: 'Acciones de manga con error', detalle: 'Revisá la cola de sincronización', href: '/config#sync' });
  }

return alertas;
}
