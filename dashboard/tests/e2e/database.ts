import {Pool,type PoolClient} from 'pg';
import {randomUUID} from 'node:crypto';
export const ADMIN='10000000-0000-4000-8000-000000000001';
export const DATE=Date.parse('2026-10-01T12:00:00-03:00');
/** Each Playwright file owns its pool; workers can reuse module caches between files. */
export function browserDatabase(){
 const url=new URL(process.env.GANPRO_TEST_DATABASE_URL??'');
 if(!['127.0.0.1','localhost'].includes(url.hostname)||!url.pathname.endsWith('_tests'))throw new Error('Dedicated local _tests database required');
 const pool=new Pool({connectionString:url.toString(),max:4});
 const asRole=async<T>(actor:string,handle:(client:PoolClient)=>Promise<T>):Promise<T>=>{
  const client=await pool.connect();
  try{
   await client.query('BEGIN');await client.query('SET LOCAL ROLE authenticated');
   await client.query("SELECT set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:actor,role:'authenticated'})]);
   const result=await handle(client);await client.query('COMMIT');return result;
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 };
 const command=(name:string,data:unknown,key=randomUUID())=>asRole(ADMIN,async client=>(await client.query<{result:Record<string,unknown>}>('SELECT ganpro_command($1,$2,$3) result',[name,key,JSON.stringify(data)])).rows[0].result);
 const entry=(tags:string[],extra:Record<string,unknown>={})=>command('stock.movement',{tipo:'COMPRA',fecha:DATE,caravanas:tags,sexo:'M',categoria:'Novillo',potrero_destino_id:'p1',monto:'100',contraparte:'Proveedor',...extra});
 return {pool,asRole,command,entry};
}
