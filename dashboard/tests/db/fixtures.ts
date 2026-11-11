import { Pool, type PoolClient } from 'pg';
import {randomUUID} from 'node:crypto';
const url=new URL(process.env.GANPRO_TEST_DATABASE_URL??'');
if(!['localhost','127.0.0.1'].includes(url.hostname)||!url.pathname.endsWith('_tests'))throw new Error('Dedicated local _tests database required');
export const pool=new Pool({connectionString:url.toString(),max:8});
export const ADMIN='10000000-0000-4000-8000-000000000001';
export const ADVISOR='10000000-0000-4000-8000-000000000002';
export const FIELD='10000000-0000-4000-8000-000000000003';
export const DATE=new Date('2026-10-01T12:00:00-03:00').getTime();
export async function fixture(){
 await pool.query(`TRUNCATE storage.objects,public.suplementos,public.raciones,public.racion_ingredientes,public.servicios,public.asientos_caja,public.cuentas_caja,public.command_receipts,public.command_audit,public.cierres_caja,public.sync_push_receipts,public.animals,public.eventos,public.animal_movements,public.movimientos_financieros,public.lotes,public.potreros,public.operation_logs,public.operations_catalog,public.escenarios,public.escenario_lineas,public.sync_tombstones,public.perfiles,auth.users RESTART IDENTITY CASCADE`);
 for(const [id,email]of [[ADMIN,'admin@test.invalid'],[ADVISOR,'advisor@test.invalid'],[FIELD,'field@test.invalid']])await pool.query('INSERT INTO auth.users(id,email) VALUES($1,$2)',[id,email]);
 await pool.query(`UPDATE public.perfiles SET rol='campo' WHERE id=$1`,[FIELD]);
 await pool.query(`INSERT INTO public.potreros(id,nombre,hectareas,capacidad_ev) VALUES('p1','Norte',10,50),('p2','Sur',10,50);INSERT INTO public.lotes(id,nombre) VALUES('l1','Cría')`);
}
export async function asRole<T>(actor:string|null,handle:(client:PoolClient)=>Promise<T>,role='authenticated'):Promise<T>{
 const client=await pool.connect();
 try{await client.query('BEGIN');await client.query(`SET LOCAL ROLE ${role==='service_role'?'service_role':role==='anon'?'anon':'authenticated'}`);await client.query(`SELECT set_config('request.jwt.claims',$1,true)`,[JSON.stringify({sub:actor,role})]);const result=await handle(client);await client.query('COMMIT');return result;}
 catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
export async function command(name:string,data:unknown,key=randomUUID(),actor=ADMIN){
 return asRole(actor,async client=>(await client.query<{result:Record<string,unknown>}>('SELECT public.ganpro_command($1,$2,$3) result',[name,key,JSON.stringify(data)])).rows[0].result);
}
export const snapshot=(month='2026-10',actor=ADMIN)=>asRole(actor,async client=>(await client.query('SELECT public.ganpro_ledger_snapshot($1) data',[month])).rows[0].data as unknown);
export const entry=(tags:string[],extra:Record<string,unknown>={})=>command('stock.movement',{tipo:'COMPRA',fecha:DATE,caravanas:tags,sexo:'M',categoria:'Novillo',potrero_destino_id:'p1',monto:'100',contraparte:'Proveedor',...extra});
