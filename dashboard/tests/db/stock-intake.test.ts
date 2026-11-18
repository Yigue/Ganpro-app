import {beforeEach,afterAll,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {pool,fixture,command,entry,DATE} from './fixtures';
beforeEach(fixture);afterAll(()=>pool.end());
const defaults={sexo:'H',categoria:'Vaca',lote_id:'l1',potrero_id:'p1'};
const animals=async()=>(await pool.query('SELECT * FROM animals ORDER BY id')).rows;
it('creates generic opening stock once and identifies the same record without losing history',async()=>{
 const key=randomUUID();await command('stock.generic',{...defaults,cantidad:3},key);await command('stock.generic',{...defaults,cantidad:3},key);
 const rows=await animals();expect(rows).toHaveLength(3);expect(rows.every(a=>a.visual_pendiente&&!a.rfid)).toBe(true);
 expect((await pool.query('SELECT * FROM movimientos_financieros')).rows).toHaveLength(0);
 const a=rows[0];await command('stock.save',{...a,id_caravana:'VISIBLE-1',rfid:'982000000000001',expected_version:a.server_updated_at});
 expect((await pool.query('SELECT * FROM animals WHERE id=$1',[a.id])).rows[0]).toMatchObject({id_caravana:'VISIBLE-1',visual_pendiente:false,rfid:'982000000000001'});
 expect((await pool.query("SELECT * FROM eventos WHERE animal_id=$1 AND tipo='IDENTIFICACION'",[a.id])).rows).toHaveLength(1);
});
it('creates, recognizes and links RFID readings atomically, including legacy mobile identities',async()=>{
 await command('stock.generic',{...defaults,cantidad:1});const generic=(await animals())[0];
 const ts=Date.now();await command('stock.readings',{...defaults,lecturas:[{rfid:'982000000000002',captured_at:ts,peso:300},{rfid:'982000000000003',animal_id:generic.id,expected_version:generic.server_updated_at,captured_at:ts}]});
 expect(await animals()).toHaveLength(2);
 await command('stock.readings',{...defaults,lecturas:[{rfid:'982000000000002',captured_at:ts}]});expect(await animals()).toHaveLength(2);
 await pool.query("INSERT INTO animals(id,id_caravana,sexo,categoria) VALUES('legacy','982000000000004','H','Vaca')");
 await command('stock.readings',{...defaults,lecturas:[{rfid:'982000000000004',captured_at:ts}]});
 expect((await pool.query("SELECT rfid FROM animals WHERE id='legacy'")).rows[0].rfid).toBe('982000000000004');expect(await animals()).toHaveLength(3);
 expect((await pool.query("SELECT timestamp FROM eventos WHERE tipo='PESAJE'")).rows).toEqual([{timestamp:String(ts)}]);
});
it('rolls back a batch if a later reading is closed, repeated or stale',async()=>{
 await pool.query("INSERT INTO animals(id,id_caravana,rfid,sexo,categoria,estado) VALUES('sold','OLD','982000000000005','H','Vaca','VENDIDO')");
 const r={rfid:'982000000000006',captured_at:Date.now()};
 await expect(command('stock.readings',{...defaults,lecturas:[r,{...r,rfid:'982000000000005'}]})).rejects.toThrow('GANPRO_INACTIVE_ANIMAL');expect(await animals()).toHaveLength(1);
 await expect(command('stock.readings',{...defaults,lecturas:[r,r]})).rejects.toThrow('GANPRO_DUPLICATE_TAG');
 await command('stock.generic',{...defaults,cantidad:1});const generic=(await animals()).find(a=>a.id!=='sold');
 await expect(command('stock.readings',{...defaults,lecturas:[{...r,animal_id:generic.id,expected_version:0}]})).rejects.toThrow('GANPRO_CONFLICT');expect((await animals()).find(a=>a.id===generic.id).rfid).toBeNull();
});
it('calculates per-head purchases and per-kg sales from real selections, not client totals',async()=>{
 await command('stock.movement',{tipo:'COMPRA',fecha:DATE,cantidad:2,sexo:'H',categoria:'Vaca',modalidad_precio:'CABEZA',precio_unitario:'100.25',monto:'1'});
 const rows=await animals();expect(rows).toHaveLength(2);expect(rows.every(a=>a.visual_pendiente)).toBe(true);
 expect((await pool.query("SELECT monto,modalidad_precio,precio_unitario,detalle_categorias FROM movimientos_financieros")).rows[0]).toMatchObject({monto:200.5,modalidad_precio:'CABEZA',precio_unitario:'100.25',detalle_categorias:[{categoria:'Vaca',cabezas:2}]});
 await command('stock.movement',{tipo:'VENTA',fecha:DATE,animal_ids:rows.map(a=>a.id),modalidad_precio:'KG',kg:600,precio_unitario:'2.10',monto:'1'});
 expect((await pool.query("SELECT monto,cabezas,kg,contraparte FROM movimientos_financieros WHERE categoria='VENTA'")).rows[0]).toMatchObject({monto:1260,cabezas:2,kg:600,contraparte:null});
 expect((await animals()).every(a=>a.estado==='VENDIDO')).toBe(true);
});
it('allows a per-head sale without weights and rejects an invalid selection without side effects',async()=>{
 await entry(['ONE']);const id=(await animals())[0].id;
 await expect(command('stock.movement',{tipo:'VENTA',fecha:DATE,animal_ids:[id,'absent'],modalidad_precio:'CABEZA',precio_unitario:'99'})).rejects.toThrow('GANPRO_INACTIVE_ANIMAL');
 await command('stock.movement',{tipo:'VENTA',fecha:DATE,animal_ids:[id],modalidad_precio:'CABEZA',precio_unitario:'99'});
 expect((await pool.query("SELECT monto,kg FROM movimientos_financieros WHERE categoria='VENTA'")).rows[0]).toEqual({monto:99,kg:null});
});
