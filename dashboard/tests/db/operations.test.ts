import {beforeEach,afterAll,describe,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {pool,fixture,command,snapshot,entry,DATE,ADVISOR,asRole} from './fixtures';
import {ledgerSchema} from '../../lib/db/ledger-types';
beforeEach(fixture);afterAll(()=>pool.end());
describe('atomic Ganpro stock and finance',()=>{
 it('blocks a concurrent second sale without duplicating income',async()=>{
  await entry(['A','B']);const data={tipo:'VENTA',fecha:DATE,caravanas:['A'],monto:'50',kg:300,contraparte:'Cliente'};
  const outcomes=await Promise.allSettled([command('stock.movement',data),command('stock.movement',data)]);
  expect(outcomes.filter(o=>o.status==='fulfilled')).toHaveLength(1);
  expect((await pool.query(`SELECT count(*)::int n FROM animals WHERE estado='ACTIVO'`)).rows[0].n).toBe(1);
  expect((await pool.query(`SELECT count(*)::int n FROM movimientos_financieros WHERE categoria='VENTA'`)).rows[0].n).toBe(1);
 });
 it('replays identical requests and rejects changed data on the same key',async()=>{
  const key=randomUUID(),data={tipo:'NACIMIENTO',fecha:DATE,caravanas:['COW'],sexo:'H',categoria:'Ternera'};
  expect(await command('stock.movement',data,key)).toEqual(await command('stock.movement',data,key));
  expect((await pool.query('SELECT count(*)::int n FROM animals')).rows[0].n).toBe(1);
  await expect(command('stock.movement',{...data,caravanas:['OTHER']},key)).rejects.toThrow('GANPRO_IDEMPOTENCY_CONFLICT');
 });
 it('rolls back every effect after an invalid payment account',async()=>{
  await expect(entry(['A'],{pagado:'50',cuenta_id:'foreign'})).rejects.toThrow('GANPRO_INVALID_REFERENCE');
  for(const table of ['animals','eventos','movimientos_financieros','command_receipts'])expect((await pool.query(`SELECT count(*)::int n FROM ${table}`)).rows[0].n).toBe(0);
 });
 it('validates sex, references and case-insensitive identity',async()=>{
  await expect(entry(['A'],{sexo:'M',categoria:'Vaca'})).rejects.toThrow('GANPRO_SEX_CATEGORY');
  await expect(entry(['A'],{potrero_destino_id:'missing'})).rejects.toThrow('GANPRO_INVALID_REFERENCE');
  await entry(['cow'],{sexo:'H',categoria:'Vaca'});await expect(entry(['COW'])).rejects.toThrow();
 });
 it('blocks a sale during withdrawal with no partial write',async()=>{
  await entry(['A']);await pool.query(`INSERT INTO operations_catalog(id,nombre,tipo) VALUES('drug','Test','TRATAMIENTO')`);
  await pool.query(`INSERT INTO operation_logs(animal_id,operation_id,fecha_aplicacion,fecha_fin_carencia) SELECT id,'drug',$1::bigint-1,$1::bigint+86400000 FROM animals`,[DATE]);
  await expect(command('stock.movement',{tipo:'VENTA',fecha:DATE,caravanas:['A'],kg:300,monto:'100',contraparte:'C'})).rejects.toThrow('GANPRO_WITHDRAWAL');
  expect((await pool.query(`SELECT estado FROM animals`)).rows[0].estado).toBe('ACTIVO');
 });
 it('reconciles 96 heads, 8m receivable, 4.5m payable and 7.5m cash',async()=>{
  const account=await command('finance.account',{nombre:'Caja',saldo_inicial:'3000000',fecha:DATE});
  const tags=Array.from({length:100},(_,i)=>'OPEN-'+i);
  await pool.query(`INSERT INTO animals(id,id_caravana,sexo,categoria,potrero_id) SELECT tag,tag,'M','Novillo','p1' FROM unnest($1::text[]) tag`,[tags]);
  await command('stock.movement',{tipo:'NACIMIENTO',fecha:DATE,caravanas:Array.from({length:8},(_,i)=>'BIRTH-'+i),sexo:'H',categoria:'Ternera',potrero_destino_id:'p1'});
  await entry(Array.from({length:10},(_,i)=>'BUY-'+i),{monto:'4000000'});
  await command('stock.movement',{tipo:'MUERTE',fecha:DATE,caravanas:tags.slice(0,2)});
  await command('stock.movement',{tipo:'VENTA',fecha:DATE,caravanas:tags.slice(2,22),monto:'14000000',kg:7000,contraparte:'Cliente',pagado:'6000000',cuenta_id:account.id});
  await command('finance.document',{tipo:'GASTO',categoria:'OTRO',fecha:DATE,monto:'2000000',contraparte:'Servicios',pagado:'1500000',cuenta_id:account.id});
  await command('stock.movement',{tipo:'TRASLADO',fecha:DATE,caravanas:tags.slice(22,37),potrero_destino_id:'p2'});
  expect((await pool.query(`SELECT count(*)::int n FROM animals WHERE estado='ACTIVO'`)).rows[0].n).toBe(96);
  const data=ledgerSchema.parse(await snapshot());expect(data.totales).toMatchObject({saldo:'7500000.00',por_cobrar:'8000000.00',por_pagar:'4500000.00',flujo:'4500000.00'});
 });
 it('prevents concurrent overpayment; internal transfers do not inflate cashflow',async()=>{
  const a=await command('finance.account',{nombre:'A',saldo_inicial:'100',fecha:DATE});const b=await command('finance.account',{nombre:'B',saldo_inicial:'0',fecha:DATE});
  const doc=await command('finance.document',{tipo:'INGRESO',categoria:'OTRO',fecha:DATE,monto:'100',contraparte:'C'});
  const results=await Promise.allSettled([1,2].map(()=>command('finance.settle',{movimiento_id:doc.id,cuenta_id:a.id,monto:'80',fecha:DATE})));
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
  await command('finance.transfer',{origen_id:a.id,destino_id:b.id,monto:'50',fecha:DATE});
  expect(ledgerSchema.parse(await snapshot()).totales).toMatchObject({saldo:'180.00',por_cobrar:'20.00',flujo:'80.00'});
 });
 it('uses exact cents and protects historical cuts',async()=>{
  const a=await command('finance.account',{nombre:'A',saldo_inicial:'0',fecha:DATE});const doc=await command('finance.document',{tipo:'INGRESO',categoria:'OTRO',fecha:DATE,monto:'0.30',contraparte:'C'});
  const first=await command('finance.settle',{movimiento_id:doc.id,cuenta_id:a.id,monto:'0.10',fecha:DATE});await command('finance.settle',{movimiento_id:doc.id,cuenta_id:a.id,monto:'0.20',fecha:DATE});
  expect(ledgerSchema.parse(await snapshot()).totales.saldo).toBe('0.30');
  await command('finance.reverse',{id:first.id,motivo:'Correction',fecha:DATE+86400000});
  await expect(command('finance.settle',{movimiento_id:doc.id,cuenta_id:a.id,monto:'0.10',fecha:DATE})).rejects.toThrow('GANPRO_DATE_ORDER');
 });
 it('enforces readonly/anonymous access in SQL',async()=>{
  await expect(command('finance.account',{nombre:'Forbidden',saldo_inicial:'0',fecha:DATE},randomUUID(),ADVISOR)).rejects.toThrow('GANPRO_FORBIDDEN');
  await expect(asRole(null,c=>c.query('SELECT public.ganpro_ledger_snapshot($1)',['2026-10']),'anon')).rejects.toThrow();
  await expect(asRole(ADVISOR,c=>c.query(`INSERT INTO cuentas_caja(nombre,saldo_inicial,fecha_apertura) VALUES('forbidden',0,1)`))).rejects.toThrow();
 });
});
