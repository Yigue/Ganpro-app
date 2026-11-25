import {Pool} from 'pg';
import {readFile,readdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
const url=new URL(process.env.GANPRO_TEST_DATABASE_URL??'');
if(!['localhost','127.0.0.1'].includes(url.hostname)||!url.pathname.endsWith('_tests'))throw new Error('Dedicated local _tests database required');
const name=`ganpro_upgrade_${randomUUID().replaceAll('-','').slice(0,12)}_tests`;
const admin=new Pool({connectionString:url.toString(),max:1});
let pool,created=false;
const root=new URL('../../supabase/',import.meta.url);
try{
 await admin.query(`CREATE DATABASE "${name}"`);created=true;
 const child=new URL(url);child.pathname='/'+name;pool=new Pool({connectionString:child.toString(),max:1});
 await pool.query(await readFile(new URL('./bootstrap.sql',import.meta.url),'utf8'));
 for(const file of (await readdir(new URL('migrations/',root))).filter(f=>f.endsWith('.sql')).sort()){
  const number=Number(file.match(/(\d{6})_/)[1]);if(number>60)continue;
  await pool.query(await readFile(new URL('migrations/'+file,root),'utf8'));
 }
 await pool.query("INSERT INTO lotes(id,nombre) VALUES('upgrade-lot','Cría');INSERT INTO potreros(id,nombre) VALUES('upgrade-paddock','Norte')");
 await pool.query("INSERT INTO animals(id,id_caravana,rfid,sexo,categoria,lote_id,potrero_id) VALUES('upgrade-animal','UPGRADE','982111000000001','H','Vaca','upgrade-lot','upgrade-paddock')");
 await pool.query("INSERT INTO eventos(animal_id,tipo,timestamp) VALUES('upgrade-animal','ALTA_INICIAL',public.ganpro_now_ms())");
 await pool.query("INSERT INTO movimientos_financieros(tipo,categoria,monto,fecha,descripcion) VALUES('GASTO','SANIDAD',100,public.ganpro_now_ms(),'Anterior sin inventar pago')");
 const snapshot=async()=>(await pool.query(`SELECT jsonb_build_object('animals',(SELECT jsonb_agg(a) FROM animals a),
 'events',(SELECT jsonb_agg(e) FROM eventos e),'documents',(SELECT jsonb_agg(m) FROM movimientos_financieros m),
 'lots',(SELECT jsonb_agg(l) FROM lotes l),'paddocks',(SELECT jsonb_agg(p) FROM potreros p)) data`)).rows[0].data;
 const before=await snapshot();
 const upgrade=await readFile(new URL('upgrade-60-to-62.sql',root),'utf8');
 await pool.query('DROP FUNCTION public.ganpro_stock_capabilities()');
 let partialRejected=false;
 try{await pool.query(upgrade);}catch{partialRejected=true;await pool.query('ROLLBACK');}
 if(!partialRejected||(await pool.query("SELECT to_regprocedure('public.ganpro_treasury_snapshot(bigint)') present")).rows[0].present)throw new Error('Incomplete base was not rejected atomically');
 await pool.query(await readFile(new URL('migrations/20261111000060_stock_contract.sql',root),'utf8'));
 await pool.query(upgrade);
 if(JSON.stringify(await snapshot())!==JSON.stringify(before))throw new Error('Upgrade changed existing records');
 const flags=(await pool.query("SELECT to_regprocedure('public.ganpro_treasury_snapshot(bigint)') IS NOT NULL treasury,to_regprocedure('public.ganpro_service_create(jsonb)') IS NOT NULL service")).rows[0];
 if(!flags.treasury||!flags.service)throw new Error('Upgrade did not install contracts');
 let rejected=false;
 try{await pool.query(upgrade);}catch{rejected=true;await pool.query('ROLLBACK');}
 if(!rejected||JSON.stringify(await snapshot())!==JSON.stringify(before))throw new Error('Repeated upgrade did not fail safely');
 console.log('60→62 preserved animals, RFID, events, documents, lots and paddocks; incomplete base and repeated application rejected without data changes.');
}finally{
 await pool?.end();
 if(created)await admin.query(`DROP DATABASE "${name}"`);
 await admin.end();
}
