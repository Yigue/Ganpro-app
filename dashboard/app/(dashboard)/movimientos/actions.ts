'use server';
import {z} from 'zod';
import {crearAccion,fechaMs} from '@/lib/db/actions';
import {runOperation} from '@/lib/commands/rpc';
import {operationMessage} from '@/lib/commands/message';
import {applyBatch} from '@/lib/commands/batch';
import {InputError} from '@/lib/commands/errors';
import {amountSchema,daySchema} from '@/lib/commands/finance-input';
import {check} from '@/lib/db/actions';
const movementSchema=z.object({tipo:z.enum(['TRASLADO','VENTA','COMPRA','MUERTE','NACIMIENTO']),fecha:daySchema,caravanas:z.string().min(1),lote_destino_id:z.string().optional(),potrero_destino_id:z.string().optional(),categoria:z.string().optional(),sexo:z.enum(['M','H']).optional(),kg:z.coerce.number().positive().optional(),monto:amountSchema.optional(),dte_numero:z.string().trim().optional(),renspa_destino:z.string().trim().optional(),vencimiento:daySchema.optional(),contraparte:z.string().trim().optional(),pagado:amountSchema.optional(),cuenta_id:z.string().optional(),notas:z.string().trim().optional(),escenario_linea_id:z.string().optional()});
const RUTAS=['/movimientos','/stock','/','/finanzas','/mapa','/proyeccion/plan'];
export const registrarMovimiento=crearAccion(movementSchema,async(d,c)=>operationMessage(await runOperation(c,'stock.movement',{
 ...d,fecha:fechaMs(d.fecha),vencimiento:d.vencimiento?fechaMs(d.vencimiento):undefined,
 caravanas:d.caravanas.split(/[\s,;]+/).map(t=>t.trim()).filter(Boolean),
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
