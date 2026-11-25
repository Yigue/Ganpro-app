import {afterAll,beforeEach,expect,it} from 'vitest';
import {randomUUID} from 'node:crypto';
import {ADMIN,ADVISOR,asRole,command,DATE,entry,fixture,pool} from './fixtures';
beforeEach(fixture);afterAll(()=>pool.end());
const treasury=(at:number,actor:string|null=ADMIN,role='authenticated')=>asRole(actor,async c=>(await c.query('SELECT ganpro_treasury_snapshot($1) data',[at])).rows[0].data,role);
it('takes cash and outstanding amounts at the requested instant, excluding later payments',async()=>{
 const account=await command('finance.account',{nombre:'Caja',saldo_inicial:'100000',fecha:DATE});
 const doc=await command('finance.document',{tipo:'INGRESO',categoria:'OTRO',monto:'50000',fecha:DATE,contraparte:'Cliente'});
 await command('finance.document',{tipo:'GASTO',categoria:'OTRO',monto:'200000',fecha:DATE,contraparte:'Proveedor'});
 await command('finance.settle',{movimiento_id:doc.id,cuenta_id:account.id,monto:'10000',fecha:DATE+1000});
 const before=await treasury(DATE),after=await treasury(DATE+1000);
 expect(Number(before.saldo)).toBe(100000);expect(Number(after.saldo)).toBe(110000);
 expect(Number(before.documentos.find((d:{id:string})=>d.id===doc.id).pendiente)).toBe(50000);
 expect(Number(after.documentos.find((d:{id:string})=>d.id===doc.id).pendiente)).toBe(40000);
 expect(before.documentos).toHaveLength(2);
});
it('allows advisor reads and refuses anonymous access to the treasury snapshot',async()=>{
 await expect(treasury(DATE,ADVISOR)).resolves.toMatchObject({as_of:DATE});
 await expect(treasury(DATE,null,'anon')).rejects.toThrow();
});
it('creates catalog, schedule and ration once when the same batch is resent',async()=>{
 const key=randomUUID(),data=[{table:'operations_catalog',mode:'insert',data:{id:'drug',nombre:'Vacuna',tipo:'VACUNA'}},
  {table:'scheduled_operations',mode:'insert',data:{id:'schedule',operation_id:'drug',fecha_programada:DATE,estado:'PENDIENTE'}},
  {table:'raciones',mode:'insert',data:{id:'ration',nombre:'Ración',activa:true}}];
 await command('batch',data,key);await command('batch',data,key);
 expect((await pool.query('SELECT count(*)::int n FROM scheduled_operations')).rows[0].n).toBe(1);
 await expect(command('batch',[...data,{table:'raciones',mode:'insert',data:{nombre:'Otra'}}],key)).rejects.toThrow('GANPRO_IDEMPOTENCY_CONFLICT');
 expect((await pool.query('SELECT count(*)::int n FROM raciones')).rows[0].n).toBe(1);
});
it('replays service creation even after herd membership changes and does not recompute the saved count',async()=>{
 await entry(['BULL'],{sexo:'M',categoria:'Toro',lote_destino_id:'l1'});
 await entry(['COW'],{sexo:'H',categoria:'Vaca',lote_destino_id:'l1'});
 const key=randomUUID(),data={temporada:'2026',lote_id:'l1',toros:['BULL'],fecha_entrada:DATE};
 const first=await command('repro.service',data,key);
 await entry(['COW-2'],{sexo:'H',categoria:'Vaca',lote_destino_id:'l1'});
 expect(await command('repro.service',data,key)).toEqual(first);
 const services=(await pool.query('SELECT vientres FROM servicios')).rows;
 expect(services).toHaveLength(1);expect(services[0].vientres).toBe(1);
 expect((await pool.query("SELECT count(*)::int n FROM command_audit WHERE table_name='servicios' AND command_key=$1",[key])).rows[0].n).toBe(1);
 await expect(command('repro.service',data,randomUUID(),ADVISOR)).rejects.toThrow('GANPRO_FORBIDDEN');
});
it('creates a paddock once and rejects an edit with a stale version',async()=>{
 const key=randomUUID(),data={nombre:'Potrero nuevo',hectareas:10};
 const first=await command('config.paddock',data,key);expect(await command('config.paddock',data,key)).toEqual(first);
 const original=(await pool.query('SELECT server_updated_at FROM potreros WHERE id=$1',[first.id])).rows[0];
 await command('config.paddock',{id:first.id,nombre:'Actualizado',expected_version:Number(original.server_updated_at),hectareas:10});
 await expect(command('config.paddock',{id:first.id,nombre:'Obsoleto',expected_version:Number(original.server_updated_at),hectareas:10})).rejects.toThrow('GANPRO_CONFLICT');
});

it('uses a database-generated cut without confusing query time with transaction start',async()=>{
 const result=await asRole(ADMIN,async c=>{
  const start=(await c.query('SELECT ganpro_now_ms() t')).rows[0].t;
  const snapshot=(await c.query('SELECT ganpro_treasury_snapshot() data')).rows[0].data;
  expect(snapshot.as_of).toBeGreaterThanOrEqual(Number(start));return snapshot;
 });
 expect(result.documentos).toEqual([]);
});
