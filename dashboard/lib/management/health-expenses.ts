import type {MovimientoFinanciero, OperationLog} from '@/lib/db/types';

/** Applications without a linked consumption remain economic costs, never cash payments. */
export function healthExpenses(logs:OperationLog[], expenses:MovimientoFinanciero[]):MovimientoFinanciero[]{
 const covered=new Set(expenses.filter(m=>m.tipo==='GASTO'&&m.aplicacion_id).map(m=>m.aplicacion_id));
 return logs.filter(log=>log.costo_total!=null&&!covered.has(log.id)).map(log=>({
  id:`aplicacion:${log.id}`,aplicacion_id:log.id,created_at:log.created_at,updated_at:log.updated_at,
  tipo:'GASTO',categoria:'SANIDAD',lote_id:log.lote_id,animal_id:log.animal_id,monto:Number(log.costo_total),
  fecha:log.fecha_aplicacion,descripcion:'Costo de aplicación sanitaria',comprobante:null,dte_numero:null,
  cabezas:log.cantidad_animales??null,kg:null,categoria_animal:null,renspa_destino:null,dte_estado:null,
  fecha_cobro:null,cobrado:false,
 }));
}
