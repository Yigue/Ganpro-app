'use server';
import {z} from 'zod';
import {crearAccion,fechaMs} from '@/lib/db/actions';
import {runOperation} from '@/lib/commands/rpc';
import {operationMessage} from '@/lib/commands/message';
import {InputError} from '@/lib/commands/errors';
import {supplySchema,purchaseSchema,consumptionSchema,cycleSchema,stageSchema,grazingSchema,grazingStageSchema,closingSchema,bankSchema,matchSchema} from '@/lib/management/schema';
import {parseBankCsv} from '@/lib/management/bank-csv';
const paths=['/gestion','/','/stock','/mapa','/nutricion','/sanidad','/reproduccion','/finanzas','/finanzas/analisis','/costos'];
export const abrirInsumo=crearAccion(supplySchema,async(d,c)=>operationMessage(await runOperation(c,'supply.open',{...d,fecha:fechaMs(d.fecha),caducidad:d.caducidad?fechaMs(d.caducidad):undefined})),{name:'supply.open',revalidate:paths});
export const comprarInsumo=crearAccion(purchaseSchema,async(d,c)=>operationMessage(await runOperation(c,'supply.purchase',{...d,fecha:fechaMs(d.fecha),vencimiento:fechaMs(d.vencimiento),caducidad:d.caducidad?fechaMs(d.caducidad):undefined})),{name:'supply.purchase',revalidate:paths});
export const consumirInsumo=crearAccion(consumptionSchema,async(d,c)=>operationMessage(await runOperation(c,'supply.consume',{...d,fecha:fechaMs(d.fecha)})),{name:'supply.consume',revalidate:paths});
export const crearCiclo=crearAccion(cycleSchema,async(d,c)=>operationMessage(await runOperation(c,'repro.cycle',{...d,fecha:fechaMs(d.fecha)})),{name:'repro.cycle',revalidate:paths});
export const registrarEtapa=crearAccion(stageSchema,async(d,c)=>operationMessage(await runOperation(c,'repro.stage',{...d,fecha:fechaMs(d.fecha)})),{name:'repro.stage',revalidate:paths});
export const planificarPastoreo=crearAccion(grazingSchema,async(d,c)=>operationMessage(await runOperation(c,'grazing.plan',{...d,entrada:fechaMs(d.entrada),salida:fechaMs(d.salida)})),{name:'grazing.plan',revalidate:paths});
export const iniciarPastoreo=crearAccion(grazingStageSchema,async(d,c)=>operationMessage(await runOperation(c,'grazing.start',{...d,fecha:fechaMs(d.fecha)})),{name:'grazing.start',revalidate:paths});
export const finalizarPastoreo=crearAccion(grazingStageSchema,async(d,c)=>operationMessage(await runOperation(c,'grazing.finish',{...d,fecha:fechaMs(d.fecha)})),{name:'grazing.finish',revalidate:paths});
export const cerrarInventario=crearAccion(closingSchema,async(d,c)=>{
 let prices:unknown;try{prices=JSON.parse(d.precios);}catch{throw new InputError({precios:['Ingresá un objeto JSON con precio por kg y categoría.']});}
 const parsed=z.record(z.string(),z.union([z.string(),z.number()])).safeParse(prices);
 if(!parsed.success)throw new InputError({precios:['Revisá los precios por categoría.']});
 return operationMessage(await runOperation(c,'inventory.close',{fecha:fechaMs(d.fecha),precios:parsed.data}));
},{name:'inventory.close',roles:['admin'],revalidate:paths});
export const importarExtracto=crearAccion(bankSchema,async(d,c)=>operationMessage(await runOperation(c,'bank.import',{...d,csv:undefined,desde:fechaMs(d.desde),hasta:fechaMs(d.hasta),filas:parseBankCsv(d.csv,fechaMs)})),{name:'bank.import',roles:['admin'],revalidate:paths});
export const conciliarBanco=crearAccion(matchSchema,async(d,c)=>operationMessage(await runOperation(c,'bank.match',d)),{name:'bank.match',roles:['admin'],revalidate:paths});
