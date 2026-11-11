'use server';
import {crearAccion} from '@/lib/db/actions';
import {InputError} from '@/lib/commands/errors';
import {runOperation} from '@/lib/commands/rpc';
import {operationMessage} from '@/lib/commands/message';
import {polygonSchema} from '@/lib/maps/geometry';
import {mapInput} from '@/lib/maps/schema';
export const guardarMapa=crearAccion(mapInput,async(d,client)=>{
 let shape:unknown;try{shape=JSON.parse(d.geometry);}catch{throw new InputError({geometry:['Revisá el polígono.']});}
 const parsed=polygonSchema.safeParse(shape);if(!parsed.success)throw new InputError({geometry:['Cerrá el polígono con al menos 3 vértices distintos.']});
 return operationMessage(await runOperation(client,'map.save',{...d,geometry:parsed.data,agua:d.agua==='desconocido'?null:d.agua==='si',sombra:d.sombra==='desconocido'?null:d.sombra==='si'}));
},{name:'map.save',revalidate:['/mapa','/','/stock','/config','/nutricion']});
