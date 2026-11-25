import {afterAll,beforeEach,expect,it} from 'vitest';
import {ADMIN,asRole,command,DATE,entry,fixture,pool} from './fixtures';
import type {Animal,OperationLog} from '../../lib/db/types';
import {treatmentsForAnimal} from '../../lib/calc/treatment-history';
import {animalesEnCarencia} from '../../lib/calc/sanidad';
import {operationTimestamp,businessToday} from '../../lib/calc/business-date';
import {managementSchema} from '../../lib/management/schema';
import {consumptionExpenses} from '../../lib/management/economic';
import {healthExpenses} from '../../lib/management/health-expenses';
beforeEach(fixture);afterAll(()=>pool.end());
it('keeps the animal page withdrawal aligned with the SQL sales guard after a transfer',async()=>{
 await entry(['TREATED'],{lote_destino_id:'l1'});
 await pool.query("INSERT INTO operations_catalog(id,nombre,tipo,dias_carencia) VALUES('drug','Producto','TRATAMIENTO',10)");
 await command('health.apply',{destino:'lote',lote_id:'l1',operation_id:'drug',fecha:DATE,dosis:1});
 await pool.query("INSERT INTO lotes(id,nombre) VALUES('l2','Recría')");
 await command('stock.movement',{tipo:'TRASLADO',caravanas:['TREATED'],lote_destino_id:'l2',fecha:DATE+1000});
 const animal=(await pool.query<Animal>('SELECT * FROM animals')).rows[0];
 const logs=(await pool.query<OperationLog>(`SELECT l.*,coalesce((SELECT jsonb_agg(jsonb_build_object('animal_id',r.animal_id))
   FROM aplicacion_animales r WHERE r.aplicacion_id=l.id),'[]') aplicacion_animales FROM operation_logs l`)).rows;
 expect(animalesEnCarencia([animal],treatmentsForAnimal(animal,logs,[],[]),DATE+2000)).toHaveLength(1);
 await expect(command('stock.movement',{tipo:'VENTA',caravanas:['TREATED'],fecha:DATE+2000,kg:300,monto:'100'})).rejects.toThrow('GANPRO_WITHDRAWAL');
});
it('starts grazing after a same-day afternoon intake using registration time',async()=>{
 const now=Date.now(),day=businessToday(new Date(now));
 const effective=operationTimestamp(day,Date.parse(`${day}T12:00:00-03:00`),now);
 await entry(['AFTERNOON'],{fecha:effective-1000,lote_destino_id:'l1'});
 const plan=await command('grazing.plan',{lote_id:'l1',potrero_id:'p2',entrada:effective,salida:effective+86400000,
  descanso_dias:10,forraje_kg_ms_ha:2000,remanente_kg_ms_ha:1000,consumo_ev_dia:10});
 await command('grazing.start',{id:plan.id,fecha:effective});
 expect((await pool.query('SELECT potrero_id FROM animals')).rows[0].potrero_id).toBe('p2');
});
it('keeps the exact application reference through the snapshot and avoids a duplicate economic cost',async()=>{
 await entry(['COST'],{lote_destino_id:'l1'});
 await pool.query("INSERT INTO operations_catalog(id,nombre,tipo) VALUES('drug','Producto','TRATAMIENTO')");
 const supply=await command('supply.open',{nombre:'Dosis',tipo:'MEDICAMENTO',unidad:'DOSIS',operation_id:'drug',cantidad:10,valor_inicial:'200',fecha:DATE,partida:'D1',caducidad:DATE+86400000});
 const batch=(await pool.query('SELECT id FROM insumo_partidas')).rows[0].id;
 await command('health.apply',{destino:'lote',lote_id:'l1',operation_id:'drug',fecha:DATE,dosis:1,insumo_id:supply.id,partida_id:batch});
 const raw=await asRole(ADMIN,async c=>(await c.query('SELECT ganpro_management_snapshot() data')).rows[0].data);
 const expenses=consumptionExpenses(managementSchema.parse(raw));
 const logs=(await pool.query<OperationLog>('SELECT * FROM operation_logs')).rows;
 expect(expenses).toHaveLength(1);expect(expenses[0].aplicacion_id).toBe(logs[0].id);
 expect(expenses[0].monto).toBe(20);expect(healthExpenses(logs,expenses)).toEqual([]);
 expect((await pool.query('SELECT count(*)::int n FROM asientos_caja')).rows[0].n).toBe(0);
});
