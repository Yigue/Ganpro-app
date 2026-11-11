import type {ManagementData} from './schema';
import type {MovimientoFinanciero} from '@/lib/db/types';
/** Consumption is an economic expense; its purchase remains an obligation in the cash ledger. */
export function consumptionExpenses(data:ManagementData):MovimientoFinanciero[]{
 return data.consumos.filter(m=>m.origen==='CONSUMO').map(m=>{
  const supply=data.insumos.find(s=>s.id===m.insumo_id);
  return {id:`consumo:${m.id}`,created_at:m.fecha,updated_at:m.fecha,tipo:'GASTO',categoria:supply?.tipo==='MEDICAMENTO'?'SANIDAD':supply?.tipo==='ALIMENTO'?'NUTRICION':'OTRO',
   lote_id:m.lote_id,animal_id:null,monto:-Number(m.valor),fecha:m.fecha,descripcion:`Consumo: ${supply?.nombre??'Insumo'}`,comprobante:null,dte_numero:null,cabezas:null,kg:null,categoria_animal:null,renspa_destino:null,dte_estado:null,fecha_cobro:null,cobrado:true};
 });
}
