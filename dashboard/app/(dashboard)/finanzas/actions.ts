'use server';
import {z} from 'zod';
import {crearAccion,fechaMs,fechaOperacionMs,fechaVencimientoMs} from '@/lib/db/actions';
import {runOperation} from '@/lib/commands/rpc';
import {operationMessage} from '@/lib/commands/message';
import {amountSchema,documentSchema,daySchema,textSchema} from '@/lib/commands/finance-input';
import {DomainError} from '@/lib/commands/errors';
const RUTAS=['/finanzas','/finanzas/analisis','/costos','/'];
export const crearMovimientoFinanciero=crearAccion(documentSchema,async(d,c)=>operationMessage(await runOperation(c,'finance.document',{...d,fecha:fechaOperacionMs(d.fecha),vencimiento:fechaVencimientoMs(d.vencimiento)})),{name:'finance.document',revalidate:RUTAS});
export const abrirCuenta=crearAccion(z.object({nombre:textSchema,saldo_inicial:z.string().regex(/^-?\d{1,12}(\.\d{1,2})?$/),fecha:daySchema}),async(d,c)=>operationMessage(await runOperation(c,'finance.account',{...d,fecha:fechaOperacionMs(d.fecha)})),{name:'finance.account',revalidate:RUTAS});
export const registrarPago=crearAccion(z.object({movimiento_id:textSchema,cuenta_id:textSchema,monto:amountSchema,fecha:daySchema}),async(d,c)=>operationMessage(await runOperation(c,'finance.settle',{...d,fecha:fechaOperacionMs(d.fecha)})),{name:'finance.settle',revalidate:RUTAS});
export const transferirCaja=crearAccion(z.object({origen_id:textSchema,destino_id:textSchema,monto:amountSchema,fecha:daySchema}),async(d,c)=>operationMessage(await runOperation(c,'finance.transfer',{...d,fecha:fechaOperacionMs(d.fecha)})),{name:'finance.transfer',revalidate:RUTAS});
export const revertirPago=crearAccion(z.object({id:textSchema,motivo:textSchema,fecha:daySchema}),async(d,c)=>operationMessage(await runOperation(c,'finance.reverse',{...d,fecha:fechaOperacionMs(d.fecha)})),{name:'finance.reverse',revalidate:RUTAS});
export const anularComprobante=crearAccion(z.object({id:textSchema,motivo:textSchema,fecha:daySchema}),async(d,c)=>operationMessage(await runOperation(c,'finance.void',{...d,fecha:fechaOperacionMs(d.fecha)})),{name:'finance.void',revalidate:[...RUTAS,'/stock','/movimientos','/mapa']});
export const cerrarPeriodo=crearAccion(z.object({fecha:daySchema}),async(d,c)=>operationMessage(await runOperation(c,'finance.close',{fecha:fechaMs(d.fecha)})),{name:'finance.close',revalidate:RUTAS});
/** A boolean is not a bank/cash posting; old tabs receive an actionable safe failure. */
export const marcarCobrado=crearAccion(z.object({id:textSchema}),async()=>{throw new DomainError('INVALID_REFERENCE');},{name:'finance.legacy-settle',revalidate:RUTAS});
export const conciliarAnterior=crearAccion(z.object({id:textSchema,contraparte:textSchema,fecha:daySchema,vencimiento:daySchema,conciliado:z.string().regex(/^\d{1,12}(\.\d{1,2})?$/)}),async(d,c)=>operationMessage(await runOperation(c,'finance.adopt',{...d,fecha:fechaOperacionMs(d.fecha),vencimiento:fechaVencimientoMs(d.vencimiento)})),{name:'finance.adopt',revalidate:RUTAS});
