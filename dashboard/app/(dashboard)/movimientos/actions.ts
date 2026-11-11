'use server';
import {z} from 'zod';
import {crearAccion,fechaMs,fechaOperacionMs,fechaVencimientoMs} from '@/lib/db/actions';
import {runOperation} from '@/lib/commands/rpc';
import {operationMessage} from '@/lib/commands/message';
import {applyBatch} from '@/lib/commands/batch';
import {InputError} from '@/lib/commands/errors';
import {amountSchema,daySchema} from '@/lib/commands/finance-input';
import {check} from '@/lib/db/actions';
const selectedIds=z.string().transform((value,ctx)=>{try{return z.array(z.string().min(1)).min(1).max(1000).parse(JSON.parse(value));}catch{ctx.addIssue({code:'custom',message:'Seleccioná al menos un animal válido'});return z.NEVER;}});
const movementSchema=z.object({tipo:z.enum(['TRASLADO','VENTA','COMPRA','MUERTE','NACIMIENTO']),fecha:daySchema,caravanas:z.string().optional(),animal_ids:selectedIds.optional(),cantidad:z.coerce.number().int().min(1).max(500).optional(),modalidad_precio:z.enum(['KG','CABEZA']).optional(),precio_unitario:amountSchema.optional(),lote_destino_id:z.string().optional(),potrero_destino_id:z.string().optional(),categoria:z.string().optional(),sexo:z.enum(['M','H']).optional(),kg:z.coerce.number().positive().optional(),monto:amountSchema.optional(),dte_numero:z.string().trim().optional(),renspa_destino:z.string().trim().optional(),vencimiento:daySchema.optional(),contraparte:z.string().trim().optional(),pagado:amountSchema.optional(),cuenta_id:z.string().optional(),notas:z.string().trim().optional(),escenario_linea_id:z.string().optional()});

const RUTAS=['/movimientos','/stock','/','/finanzas','/mapa','/proyeccion/plan'];
export const registrarMovimiento=crearAccion(movementSchema,async(d,c)=>operationMessage(await runOperation(c,'stock.movement',{
 ...d,fecha:fechaOperacionMs(d.fecha),vencimiento:d.vencimiento?fechaVencimientoMs(d.vencimiento):undefined,
 animal_ids:d.animal_ids,
 caravanas:(d.caravanas??'').split(/[\s,;]+/).map(t=>t.trim()).filter(Boolean),
})),{name:'stock.movement',revalidate:RUTAS});
export const cargarActaSigsa=crearAccion(z.object({fecha:daySchema,acta_numero:z.string().optional(),fuente:z.enum(['ACTA','HISTORICO','CSV'])}).passthrough(),async(d,c)=>{
 const rows=Object.entries(d).filter(([key,value])=>key.startsWith('cab_')&&value!==undefined&&value!=='').map(([key,value])=>({categoria:key.slice(4),cabezas:Number(value)}));
 if(!rows.length||rows.some(r=>!Number.isInteger(r.cabezas)||r.cabezas<0))throw new InputError();
 await applyBatch(c,rows.map(row=>({table:'sigsa_stock',mode:'insert',data:{...row,fecha:fechaMs(d.fecha),fuente:d.fuente,acta_numero:d.acta_numero??null}})));
 return 'Acta guardada';
},{name:'sigsa.create',revalidate:['/movimientos','/']});
export const actualizarEstadoDte=crearAccion(z.object({id:z.string().min(1),dte_estado:z.enum(['EMITIDO','ANULADO','RETORNO'])}),async(d,c)=>{
 check(await c.from('movimientos_financieros').update({dte_estado:d.dte_estado}).eq('id',d.id));
 return 'Estado del DTE actualizado. No modifica por sí solo el stock ni la obligación financiera.';
},{name:'dte.update',revalidate:['/movimientos']});
