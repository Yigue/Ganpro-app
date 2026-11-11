import {beforeEach,afterAll,it,expect} from 'vitest';
import {pool,fixture,command,entry,DATE,snapshot} from './fixtures';
import {ledgerSchema} from '../../lib/db/ledger-types';
beforeEach(fixture);afterAll(()=>pool.end());
async function food(id:string,qty:number,value:string){await pool.query(`INSERT INTO suplementos(id,nombre,tipo,materia_seca_pct,stock_kg) VALUES($1,$1,'MAIZ',90,$2)`,[id,qty]);return command('supply.open',{nombre:id,tipo:'ALIMENTO',unidad:'KG',suplemento_id:id,cantidad:qty,valor_inicial:value,fecha:DATE});}
it('keeps treatment recipients after transfer and excludes later arrivals',async()=>{
 await pool.query(`INSERT INTO lotes(id,nombre) VALUES('l2','Otro')`);await entry(['A','B'],{lote_destino_id:'l1'});
 await pool.query(`INSERT INTO operations_catalog(id,nombre,tipo,dias_carencia,costo_unitario) VALUES('drug','Drug','TRATAMIENTO',10,5)`);
 await command('health.apply',{destino:'lote',lote_id:'l1',operation_id:'drug',fecha:DATE,dosis:2});
 await command('stock.movement',{tipo:'TRASLADO',fecha:DATE+86400000,caravanas:['A'],lote_destino_id:'l2'});
 await expect(command('stock.movement',{tipo:'VENTA',fecha:DATE+2*86400000,caravanas:['A'],kg:300,monto:'100',contraparte:'C'})).rejects.toThrow('GANPRO_WITHDRAWAL');
 await entry(['C'],{fecha:DATE+2*86400000,lote_destino_id:'l1'});
 await command('stock.movement',{tipo:'VENTA',fecha:DATE+3*86400000,caravanas:['C'],kg:300,monto:'100',contraparte:'C'});
 expect((await pool.query('SELECT cantidad_animales,costo_total FROM operation_logs')).rows[0]).toMatchObject({cantidad_animales:2,costo_total:'20.00'});
 await expect(pool.query(`UPDATE operation_logs SET dosis=0`)).rejects.toThrow('GANPRO_REVERSAL_REQUIRED');
});
it('joins purchasing, debt, cash and weighted historical consumption without duplicate expense',async()=>{
 const s=await food('maiz',100,'200');const account=await command('finance.account',{nombre:'Caja',saldo_inicial:'1000',fecha:DATE});
 const purchase=await command('supply.purchase',{insumo_id:s.id,cantidad:50,monto:'200',fecha:DATE,contraparte:'Proveedor',cuenta_id:account.id,pagado:'100'});
 const used=await command('supply.consume',{insumo_id:s.id,cantidad:30,fecha:DATE,lote_id:'l1',motivo:'Alimentación'});expect(Number(used.costo)).toBe(80);
 expect((await pool.query('SELECT cantidad,valor FROM insumos_campo')).rows[0]).toEqual({cantidad:'120.0000',valor:'320.00'});
 expect((await pool.query('SELECT stock_kg FROM suplementos')).rows[0].stock_kg).toBe(120);
 expect(ledgerSchema.parse(await snapshot()).totales).toMatchObject({saldo:'900.00',por_pagar:'100.00'});
 expect((await pool.query('SELECT es_inventario FROM movimientos_financieros WHERE id=$1',[purchase.id])).rows[0].es_inventario).toBe(true);
 await expect(pool.query(`UPDATE suplementos SET stock_kg=0`)).rejects.toThrow('GANPRO_MANAGED_STOCK');
 await expect(command('finance.void',{id:purchase.id,fecha:DATE,motivo:'Test'})).rejects.toThrow();
});
it('serializes concurrent consumptions so inventory never clips to zero',async()=>{
 const s=await food('maiz',100,'100');const results=await Promise.allSettled([1,2].map(()=>command('supply.consume',{insumo_id:s.id,cantidad:80,fecha:DATE,lote_id:'l1',motivo:'Test'})));
 expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect((await pool.query('SELECT cantidad FROM insumos_campo')).rows[0].cantidad).toBe('20.0000');
});
it('rolls back the delivery and every ingredient when a later ingredient is insufficient',async()=>{
 await entry(['A'],{lote_destino_id:'l1'});await food('one',100,'100');await food('two',0,'0');await pool.query(`INSERT INTO raciones(id,nombre) VALUES('r','Ración')`);
 await command('nutrition.formula',{racion_id:'r',items:[{suplemento_id:'one',porcentaje:50},{suplemento_id:'two',porcentaje:50}]});
 await expect(command('nutrition.deliver',{potrero_id:'p1',lote_id:'l1',racion_id:'r',cantidad_kg:100,fecha:DATE})).rejects.toThrow('GANPRO_INSUFFICIENT_STOCK');
 expect((await pool.query(`SELECT stock_kg FROM suplementos WHERE id='one'`)).rows[0].stock_kg).toBe(100);expect((await pool.query('SELECT count(*)::int n FROM potrero_feeding_logs')).rows[0].n).toBe(0);
});
it('consumes a medicine batch with the treatment and rejects expired dispensing atomically',async()=>{
 await entry(['A'],{lote_destino_id:'l1'});await pool.query(`INSERT INTO operations_catalog(id,nombre,tipo,dias_carencia) VALUES('drug','Drug','TRATAMIENTO',3)`);
 const s=await command('supply.open',{nombre:'Med',tipo:'MEDICAMENTO',unidad:'DOSIS',operation_id:'drug',cantidad:0,valor_inicial:'0',fecha:DATE});
 await command('supply.purchase',{insumo_id:s.id,cantidad:20,monto:'200',contraparte:'Vet',fecha:DATE,partida:'B1',caducidad:DATE+5*86400000});
 const batch=(await pool.query('SELECT id FROM insumo_partidas')).rows[0].id;
 await command('health.apply',{destino:'animal',caravana:'A',operation_id:'drug',insumo_id:s.id,partida_id:batch,dosis:2,fecha:DATE});
 expect((await pool.query('SELECT costo_total FROM operation_logs')).rows[0].costo_total).toBe('20.00');
 await expect(command('health.apply',{destino:'animal',caravana:'A',operation_id:'drug',insumo_id:s.id,partida_id:batch,dosis:2,fecha:DATE+6*86400000})).rejects.toThrow('GANPRO_EXPIRED_BATCH');
 expect((await pool.query('SELECT cantidad FROM insumos_campo')).rows[0].cantidad).toBe('18.0000');expect((await pool.query('SELECT count(*)::int n FROM operation_logs')).rows[0].n).toBe(1);
});
