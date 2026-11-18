import {Pool} from 'pg';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const connectionString=process.env.GANPRO_AUDIT_DATABASE_URL;
if(!connectionString)throw new Error('Definí GANPRO_AUDIT_DATABASE_URL; no se usan credenciales de escritura de la aplicación.');
const pool=new Pool({connectionString,max:1,connectionTimeoutMillis:10000});
let client;
try{
 client=await pool.connect();
 await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 await client.query("SET LOCAL statement_timeout='15s'");
 await client.query("SET LOCAL lock_timeout='2s'");
 const migrations=new URL('../supabase/migrations/',import.meta.url);
 const files=(await readdir(migrations)).filter(n=>n.endsWith('.sql')).sort();
 const digest=createHash('sha256');
 for(const name of files)digest.update(name).update(await readFile(new URL(name,migrations)));
 const capabilities=await client.query(await readFile(new URL('../supabase/diagnostics/stock-operations.sql',import.meta.url),'utf8'));
 const functions=await client.query(`SELECT signature,to_regprocedure(signature) IS NOT NULL presente
 FROM unnest(ARRAY['public.ganpro_ledger_snapshot(text)','public.ganpro_management_snapshot()',
 'public.ganpro_command(text,uuid,jsonb)','public.ganpro_animals_at(bigint)']) signature`);
 const required={animals:['id','id_caravana','rfid','estado','sexo','categoria','lote_id','potrero_id','peso_actual'],
 operation_logs:['id','receptores_fijados','cantidad_animales'],aplicacion_animales:['aplicacion_id','animal_id'],
 eventos:['animal_id','timestamp','tipo'],lotes:['id'],potreros:['id'],categorias_config:['categoria','sexo'],
 movimientos_financieros:['id','tipo','monto','anulado_en','saldo_previo_conciliado','ledger_version'],asientos_caja:['movimiento_id','monto']};
 const columns=await client.query("SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public'");
 const known=new Set(columns.rows.map(r=>`${r.table_name}.${r.column_name}`));
 const missing=Object.entries(required).flatMap(([t,cols])=>cols.filter(c=>!known.has(`${t}.${c}`)).map(c=>`${t}.${c}`));
 let checks=null;
 if(!missing.length){
  checks=(await client.query(await readFile(new URL('../supabase/diagnostics/business-baseline.sql',import.meta.url),'utf8'))).rows[0];
 }
 const transaction=(await client.query('SHOW transaction_read_only')).rows[0].transaction_read_only;
 await client.query('ROLLBACK');
 console.log(JSON.stringify({fecha:new Date().toISOString(),modo:transaction,ultima_migracion_repositorio:files.at(-1),
  huella_migraciones:digest.digest('hex'),contrato:capabilities.rows[0],funciones:functions.rows,columnas_faltantes:missing,
  controles:checks,limites:['La presencia de funciones/columnas no certifica que cada migración se aplicó íntegra.',
   'Los saldos iniciales y el padrón físico requieren conciliación con sus responsables.',
   'Un cero sólo es concluyente con acceso de lectura completo; RLS puede limitar el universo.',
   'No verifica Vercel, teléfonos, copias de respaldo ni restauración.']},null,2));
}catch(error){
 if(client)await client.query('ROLLBACK').catch(()=>{});
 console.error(JSON.stringify({error:'No se pudo completar el diagnóstico. Revisá conexión, permisos y esquema.',
  codigo:error && typeof error==='object' && 'code' in error ? error.code : 'AUDIT_FAILED'}));
 process.exitCode=1;
}finally{client?.release();await pool.end();}
