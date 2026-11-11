import {beforeEach,afterAll,it,expect} from 'vitest';
import {pool,fixture,command,entry,DATE} from './fixtures';
beforeEach(fixture);afterAll(()=>pool.end());
it('accepts the reported untagged cow with 180kg and no assigned lot or paddock',async()=>{
 await command('stock.generic',{cantidad:1,sexo:'H',categoria:'Vaca',peso_actual:180});
 expect((await pool.query('SELECT sexo,categoria,peso_actual,lote_id,potrero_id FROM animals')).rows).toEqual([{sexo:'H',categoria:'Vaca',peso_actual:180,lote_id:null,potrero_id:null}]);
 expect((await pool.query("SELECT tipo,valor FROM eventos WHERE tipo='PESAJE'")).rows).toEqual([{tipo:'PESAJE',valor:180}]);
});
it('accepts the reported 28-head sale at 5520 ARS per kg and 5500kg, without client or payment',async()=>{
 const tags=Array.from({length:28},(_,i)=>String(2660+i));await entry(tags,{categoria:'Ternero'});
 const ids=(await pool.query('SELECT id FROM animals')).rows.map(a=>a.id);
 await command('stock.movement',{tipo:'VENTA',fecha:DATE,animal_ids:ids,caravanas:[],modalidad_precio:'KG',precio_unitario:'5520',kg:5500});
 expect((await pool.query("SELECT cabezas,kg,monto,contraparte FROM movimientos_financieros WHERE categoria='VENTA'")).rows).toEqual([{cabezas:28,kg:5500,monto:30360000,contraparte:null}]);
 expect((await pool.query('SELECT * FROM asientos_caja')).rows).toHaveLength(0);
 expect((await pool.query("SELECT count(*)::int n FROM animals WHERE estado='VENDIDO'")).rows[0].n).toBe(28);
});
