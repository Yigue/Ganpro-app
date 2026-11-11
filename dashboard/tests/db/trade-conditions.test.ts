import {beforeEach,afterAll,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {pool,fixture,command,entry,DATE,snapshot,asRole,ADVISOR} from './fixtures';
import {ledgerSchema} from '../../lib/db/ledger-types';
beforeEach(fixture);afterAll(()=>pool.end());
it('keeps gross kg while charging desbasted kg and creates a term receivable without inventing cash',async()=>{
 await entry(['A','B']);const result=await command('stock.movement',{tipo:'VENTA',fecha:DATE,caravanas:['A','B'],modalidad_precio:'KG',kg:1000,desbaste_pct:3,precio_unitario:'5520',plazo_dias:30,metodo_pago:'TRANSFERENCIA',condiciones:'Entrega en campo',monto:'1'});
 expect((await pool.query('SELECT monto,kg,kg_facturados,desbaste_pct,plazo_dias,metodo_pago,condiciones FROM movimientos_financieros WHERE id=$1',[result.id])).rows[0]).toEqual({monto:5354400,kg:1000,kg_facturados:'970.00',desbaste_pct:'3.00',plazo_dias:30,metodo_pago:'TRANSFERENCIA',condiciones:'Entrega en campo'});
 const due=(await pool.query('SELECT vencimiento FROM movimientos_financieros WHERE id=$1',[result.id])).rows[0].vencimiento;
 expect(new Date(Number(due)).toISOString()).toBe('2026-11-01T02:59:59.999Z');expect((await pool.query('SELECT * FROM asientos_caja')).rows).toHaveLength(0);
 expect(ledgerSchema.parse(await snapshot()).documentos.find(d=>d.id===result.id)).toMatchObject({pendiente:'5354400.00',metodo_pago:'TRANSFERENCIA',plazo_dias:30});
});
it('stores agreed method and actual partial payment separately, replaying once',async()=>{
 await entry(['A']);const account=await command('finance.account',{nombre:'Caja',saldo_inicial:'0',fecha:DATE});const key=randomUUID();
 const body={tipo:'VENTA',fecha:DATE,caravanas:['A'],modalidad_precio:'CABEZA',precio_unitario:'200',pagado:'50',cuenta_id:account.id,metodo_pago:'EFECTIVO'};
 const sale=await command('stock.movement',body,key);await command('stock.movement',body,key);
 await command('finance.settle',{movimiento_id:sale.id,fecha:DATE+86400000,monto:'100',cuenta_id:account.id,metodo_pago:'TRANSFERENCIA'});
 const data=ledgerSchema.parse(await snapshot());expect(data.totales.saldo).toBe('150.00');expect(data.documentos.find(d=>d.id===sale.id)).toMatchObject({pendiente:'50.00',metodo_pago:'EFECTIVO'});expect(new Set(data.asientos.map(a=>a.metodo_pago))).toEqual(new Set(['EFECTIVO','TRANSFERENCIA']));
});
it('rejects contradictory terms, gender and category filters with no partial sale',async()=>{
 await entry(['A']);const base={tipo:'VENTA',fecha:DATE,caravanas:['A'],modalidad_precio:'KG',precio_unitario:'10',kg:300};
 await expect(command('stock.movement',{...base,desbaste_pct:21})).rejects.toThrow('GANPRO_TRADE_TERMS');
 await expect(command('stock.movement',{...base,plazo_dias:30,vencimiento:DATE+31*86400000})).rejects.toThrow('GANPRO_TRADE_TERMS');
 await expect(command('stock.movement',{...base,categoria_filtro:'Vaca'})).rejects.toThrow('GANPRO_CATEGORY_SELECTION');
 await expect(entry(['BAD'],{sexo:'M',categoria:'Vaca'})).rejects.toThrow('GANPRO_SEX_CATEGORY');
 expect((await pool.query('SELECT estado FROM animals')).rows).toEqual([{estado:'ACTIVO'}]);
});
it('creates a cattle group once and transfers untagged animals by identity without changing geometry',async()=>{
 const key=randomUUID(),data={nombre:'Recría nueva',descripcion:'Grupo 2026'};const lot=await command('stock.lot-save',data,key);expect(await command('stock.lot-save',data,key)).toEqual(lot);
 await expect(command('stock.lot-save',data)).rejects.toThrow('GANPRO_DUPLICATE_LOT');await command('stock.generic',{cantidad:3,sexo:'H',categoria:'Vaca'});
 const ids=(await pool.query('SELECT id FROM animals')).rows.map(a=>a.id);
 await command('stock.movement',{tipo:'TRASLADO',fecha:Date.now(),animal_ids:ids,lote_destino_id:lot.id,potrero_destino_id:'p2'});
 expect((await pool.query('SELECT lote_id,potrero_id FROM animals')).rows).toEqual(Array(3).fill({lote_id:lot.id,potrero_id:'p2'}));
 expect((await pool.query("SELECT count(*)::int n FROM eventos WHERE tipo='ALTA_INICIAL'")).rows[0].n).toBe(3);
 expect((await pool.query('SELECT geo_json FROM lotes WHERE id=$1',[lot.id])).rows[0].geo_json).toBeNull();
 await expect(command('stock.lot-save',{...data,id:lot.id,expected_version:0})).rejects.toThrow('GANPRO_CONFLICT');
});
it('exposes read-only stock contract readiness for an advisor',async()=>{
 const result=await asRole(ADVISOR,async c=>(await c.query('SELECT public.ganpro_stock_capabilities() data')).rows[0].data);
 expect(result).toEqual({version:60,intake:true,movement:true,lots:true});
});
