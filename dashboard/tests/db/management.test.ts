import {beforeEach,afterAll,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {pool,fixture,command,entry,DATE,asRole,ADMIN} from './fixtures';
import {managementSchema} from '../../lib/management/schema';
beforeEach(fixture);afterAll(()=>pool.end());
it('tracks a reproductive cycle, a single calf, parents and a weaning weight',async()=>{
 const serviceDate=DATE-250*86400000;
 await entry(['MOTHER'],{fecha:serviceDate-86400000,sexo:'H',categoria:'Vaca',lote_destino_id:'l1'});await entry(['FATHER'],{fecha:serviceDate-86400000,sexo:'M',categoria:'Toro',lote_destino_id:'l1'});
 const ids=(await pool.query('SELECT id,id_caravana FROM animals')).rows;const mother=ids.find(a=>a.id_caravana==='MOTHER').id,father=ids.find(a=>a.id_caravana==='FATHER').id;
 await pool.query(`INSERT INTO servicios(id,temporada,lote_id,toros,fecha_entrada,fecha_salida) VALUES('s','2026','l1',$1,$2,$3)`,[[father],serviceDate,DATE]);
 const cycle=await command('repro.cycle',{madre_id:mother,padre_id:father,servicio_id:'s',fecha:serviceDate});
 await command('repro.stage',{id:cycle.id,etapa:'TACTO',resultado:'PRENADA',fecha:DATE-100*86400000});
 const key=randomUUID(),birth={id:cycle.id,etapa:'PARTO',fecha:DATE-30*86400000,caravana:'CALF',sexo:'H',peso:35};await command('repro.stage',birth,key);await command('repro.stage',birth,key);
 const calf=(await pool.query(`SELECT * FROM animals WHERE id_caravana='CALF'`)).rows[0];expect(calf).toMatchObject({madre_id:mother,padre_id:father,peso_actual:35});
 await expect(command('repro.stage',birth)).rejects.toThrow('GANPRO_CONFLICT');
 await command('repro.stage',{id:cycle.id,etapa:'DESTETE',fecha:DATE,peso:120});expect((await pool.query('SELECT estado,peso_destete FROM repro_ciclos')).rows[0]).toEqual({estado:'DESTETADA',peso_destete:'120.00'});
});
it('executes grazing transfers and prevents overlapping plans and premature reuse',async()=>{
 await entry(['A'],{lote_destino_id:'l1'});
 const data={lote_id:'l1',potrero_id:'p2',entrada:DATE,salida:DATE+2*86400000,descanso_dias:10,forraje_kg_ms_ha:2000,remanente_kg_ms_ha:1000,consumo_ev_dia:10};
 const plan=await command('grazing.plan',data);await expect(command('grazing.plan',data)).rejects.toThrow('GANPRO_GRAZING_CONFLICT');
 await command('grazing.start',{id:plan.id,fecha:DATE});expect((await pool.query('SELECT potrero_id FROM animals')).rows[0].potrero_id).toBe('p2');
 await command('grazing.finish',{id:plan.id,fecha:DATE+2*86400000,potrero_destino_id:'p1'});
 await expect(command('grazing.plan',{...data,entrada:DATE+3*86400000,salida:DATE+4*86400000})).rejects.toThrow('GANPRO_REST_PERIOD');
 expect((await pool.query('SELECT potrero_id FROM animals')).rows[0].potrero_id).toBe('p1');
});
it('keeps physical inventory snapshots immutable and validates missing weights',async()=>{
 await entry(['A']);await expect(command('inventory.close',{fecha:Date.now(),precios:{Novillo:'2.00'}})).rejects.toThrow('GANPRO_MISSING_WEIGHT');
 await pool.query('UPDATE animals SET peso_actual=100');await command('inventory.close',{fecha:Date.now(),precios:{Novillo:'2.00'}});
 await pool.query('UPDATE animals SET peso_actual=200');const close=(await pool.query('SELECT kg,valor_animales FROM inventario_cierres')).rows[0];expect(close).toEqual({kg:'100.00',valor_animales:'200.00'});
 const raw=await asRole(ADMIN,async c=>(await c.query('SELECT ganpro_management_snapshot() data')).rows[0].data);expect(managementSchema.parse(raw).cierres).toHaveLength(1);
});
it('reconciles the existing bank posting without producing a second payment',async()=>{
 const account=await command('finance.account',{nombre:'Banco',saldo_inicial:'1000',fecha:DATE});const doc=await command('finance.document',{tipo:'GASTO',categoria:'OTRO',monto:'100',fecha:DATE,contraparte:'C'});
 const posting=await command('finance.settle',{movimiento_id:doc.id,cuenta_id:account.id,monto:'100',fecha:DATE});
 const statement={cuenta_id:account.id,desde:DATE,hasta:DATE,saldo_inicial:'1000',saldo_final:'900',filas:[{fecha:DATE,referencia:'R1',descripcion:'Pago',monto:'-100'}]};
 await expect(command('bank.import',{...statement,saldo_final:'800'})).rejects.toThrow('GANPRO_STATEMENT_BALANCE');
 await command('bank.import',statement);const line=(await pool.query('SELECT id FROM banco_lineas')).rows[0].id;
 await command('bank.match',{extracto_id:line,asiento_id:posting.id});await expect(command('bank.match',{extracto_id:line,asiento_id:posting.id})).rejects.toThrow('GANPRO_CONFLICT');
 expect((await pool.query('SELECT count(*)::int n FROM asientos_caja')).rows[0].n).toBe(1);
});
it('rolls back scenario metadata and replaced lines when one new line is invalid',async()=>{
 const first={tipo:'plan',nombre:'Original',supuestos:{},resultado:{},lineas:[{mes:'2026-10',tipo:'VENTA',categoria:'Novillo',cabezas:1,kg:300,precioKg:2}]};
 const scenario=await command('scenario.save',first);
 await expect(command('scenario.save',{...first,id:scenario.id,nombre:'Broken',lineas:[{mes:'invalid',tipo:'VENTA',categoria:'Novillo',cabezas:1,kg:300,precioKg:2}]})).rejects.toThrow();
 expect((await pool.query('SELECT nombre FROM escenarios')).rows[0].nombre).toBe('Original');expect((await pool.query('SELECT count(*)::int n FROM escenario_lineas')).rows[0].n).toBe(1);
});
it('compares two inventory cuts and preserves the calculated result',async()=>{
 await pool.query(`INSERT INTO inventario_cierres(fecha,cabezas,kg,valor_animales,valor_insumos,animales,insumos,actor_id) VALUES($1,0,0,0,0,'[]','[]',$2)`,[Date.now()-86400000,ADMIN]);
 await entry(['A'],{kg:100});await command('inventory.close',{fecha:Date.now(),precios:{Novillo:'2.00'}});
 const result=(await pool.query('SELECT resultado FROM inventario_cierres WHERE resultado IS NOT NULL')).rows[0].resultado;
 expect(result).toMatchObject({variacion_animales:200,produccion_kg:0,margen:100});
});
it('enforces private document upload paths and attachment visibility in SQL',async()=>{
 const doc=await command('finance.document',{tipo:'GASTO',categoria:'OTRO',monto:'100',fecha:DATE,contraparte:'C'});
 await expect(asRole(ADMIN,c=>c.query(`INSERT INTO storage.objects(bucket_id,name) VALUES('comprobantes','another-user/file.pdf')`))).rejects.toThrow();
 const path=`${ADMIN}/file.pdf`;
 await asRole(ADMIN,c=>c.query(`INSERT INTO storage.objects(bucket_id,name) VALUES('comprobantes',$1)`,[path]));
 expect((await asRole(ADMIN,c=>c.query('SELECT * FROM storage.objects'))).rows).toHaveLength(0);
 await command('document.attach',{movimiento_id:doc.id,path,nombre:'factura.pdf',sha256:'a'.repeat(64)});
 expect((await asRole(ADMIN,c=>c.query('SELECT * FROM storage.objects'))).rows).toHaveLength(1);
});
