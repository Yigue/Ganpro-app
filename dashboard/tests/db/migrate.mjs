import {Pool} from 'pg';
import {readFile,readdir} from 'node:fs/promises';
const url=new URL(process.env.GANPRO_TEST_DATABASE_URL??'');
if(!['localhost','127.0.0.1'].includes(url.hostname)||!url.pathname.endsWith('_tests'))throw new Error('Only a dedicated local database ending in _tests is allowed');
const pool=new Pool({connectionString:url.toString()});
try{
 const {rows}=await pool.query("SELECT to_regclass('public.animals') present");
 if(rows[0].present)throw new Error('Database must be empty; this script never resets existing schemas');
 await pool.query(await readFile(new URL('./bootstrap.sql',import.meta.url),'utf8'));
 const root=new URL('../../supabase/migrations/',import.meta.url);
 for(const name of (await readdir(root)).filter(n=>n.endsWith('.sql')).sort()){
  await pool.query(await readFile(new URL(name,root),'utf8'));console.log(`Applied ${name}`);
 }
 await pool.query('GRANT USAGE ON SCHEMA public,auth TO authenticated,anon,service_role;GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO authenticated,service_role;GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated,service_role');
}finally{await pool.end();}
