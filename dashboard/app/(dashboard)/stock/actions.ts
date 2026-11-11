'use server';
import { z } from 'zod';
import { crearAccion, fechaMs } from '@/lib/db/actions';
import { parseCsvRFID } from '@/lib/calc/csv';
import { runOperation } from '@/lib/commands/rpc';
import { operationMessage } from '@/lib/commands/message';
import { InputError } from '@/lib/commands/errors';
const animalSchema = z.object({
 id_caravana:z.string().trim().min(1).max(100),rfid:z.string().trim().max(200).optional(),
 sexo:z.enum(['M','H']),categoria:z.string().min(1),raza:z.string().trim().optional(),
 fecha_nacimiento:z.string().optional(),peso_actual:z.coerce.number().positive().max(9999).optional(),
 lote_id:z.string().optional(),potrero_id:z.string().optional(),
});
const RUTAS=['/stock','/','/mapa'];
export const crearAnimal=crearAccion(animalSchema,async(d,client)=>operationMessage(await runOperation(client,'stock.save',{
 ...d,fecha_nacimiento:d.fecha_nacimiento?fechaMs(d.fecha_nacimiento):null,
})),{name:'stock.create',revalidate:RUTAS});
export const editarAnimal=crearAccion(animalSchema.extend({id:z.string().min(1),expected_version:z.coerce.number().int().min(0),estado:z.enum(['ACTIVO','VENDIDO','MUERTO','DESCARTE'])}),async(d,client)=>operationMessage(await runOperation(client,'stock.save',{
 ...d,fecha_nacimiento:d.fecha_nacimiento?fechaMs(d.fecha_nacimiento):null,
})),{name:'stock.edit',revalidate:RUTAS});
export const confirmarRecategorizacion=crearAccion(z.object({cambio:z.union([z.string(),z.array(z.string())])}),async(d,client)=>{
 const changes=(Array.isArray(d.cambio)?d.cambio:[d.cambio]).map(c=>{
  const parts=c.split('|');if(parts.length!==2)throw new InputError();return {id:parts[0],categoria:parts[1]};
 });
 return operationMessage(await runOperation(client,'stock.recat',changes));
},{name:'stock.recat',revalidate:RUTAS});
export const importarCsvRFID=crearAccion(z.object({csv:z.string().min(1).max(2000000),sexo:z.enum(['M','H']),categoria:z.string().min(1),lote_id:z.string().optional(),potrero_id:z.string().optional()}),async(d,client)=>{
 const {filas,errores}=parseCsvRFID(d.csv);
 if(!filas.length||errores.length)throw new InputError({csv:['Revisá las filas del CSV; no se importó ningún registro.']});
 return operationMessage(await runOperation(client,'stock.import',{...d,csv:undefined,filas}));
},{name:'stock.import',revalidate:RUTAS});
