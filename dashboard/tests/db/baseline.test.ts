import {afterAll,beforeEach,expect,it} from 'vitest';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {command,entry,fixture,pool,DATE} from './fixtures';
const exec=promisify(execFile);
beforeEach(fixture);
afterAll(()=>pool.end());
it('audits the schema and records in a read-only transaction without changing their counts',async()=>{
 await entry(['AUDIT-A']);
 const before=await pool.query('SELECT count(*) FROM public.command_audit');
 const {stdout}=await exec(process.execPath,['scripts/audit-database.mjs'],{
  env:{...process.env,GANPRO_AUDIT_DATABASE_URL:process.env.GANPRO_TEST_DATABASE_URL},
 });
 const report=JSON.parse(stdout);
 expect(report.modo).toBe('on');
 expect(report.columnas_faltantes).toEqual([]);
 expect(report.controles.cabezas_activas).toBe('1');
 expect(report.funciones.every((f:{presente:boolean})=>f.presente)).toBe(true);
 expect((await pool.query('SELECT count(*) FROM public.command_audit')).rows).toEqual(before.rows);
});
it('does not report normal expense payments or their reversals as overpayments',async()=>{
 const account=await command('finance.account',{nombre:'Caja auditoría',saldo_inicial:'1000',fecha:DATE});
 await entry(['AUDIT-B'],{pagado:'40',cuenta_id:account.id});
 const payment=(await pool.query('SELECT id FROM public.asientos_caja LIMIT 1')).rows[0].id;
 await command('finance.reverse',{id:payment,fecha:DATE,motivo:'Corrección de prueba'});
 const {stdout}=await exec(process.execPath,['scripts/audit-database.mjs'],{
  env:{...process.env,GANPRO_AUDIT_DATABASE_URL:process.env.GANPRO_TEST_DATABASE_URL},
 });
 expect(JSON.parse(stdout).controles.documentos_con_sobrepago).toBe('0');
});
it('recognizes a generic initial-stock event without inventing a purchase or a birth',async()=>{
 await command('stock.generic',{cantidad:1,sexo:'H',categoria:'Vaca',lote_id:'l1',potrero_id:'p1'});
 const {stdout}=await exec(process.execPath,['scripts/audit-database.mjs'],{
  env:{...process.env,GANPRO_AUDIT_DATABASE_URL:process.env.GANPRO_TEST_DATABASE_URL},
 });
 expect(JSON.parse(stdout).controles.altas_sin_evento_de_origen).toBe('0');
 expect((await pool.query('SELECT count(*)::int n FROM movimientos_financieros')).rows[0].n).toBe(0);
});
