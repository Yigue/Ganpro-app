import {beforeEach,afterAll,it,expect} from 'vitest';
import {pool,fixture,command,entry,DATE} from './fixtures';
beforeEach(fixture);afterAll(()=>pool.end());
async function historical(tag='A',rfid:string|null=null){
 await pool.query(`INSERT INTO animals(id,id_caravana,rfid,sexo,categoria,estado,peso_actual) VALUES('old',$1,$2,'H','Vaca','VENDIDO',400)`,[tag,rfid]);
}
it('preserves a sold animal and targets only the active animal sharing its visual tag',async()=>{
 await historical();await entry(['A']);
 await command('stock.movement',{tipo:'TRASLADO',caravanas:['A'],potrero_destino_id:'p2',fecha:DATE});
 await command('stock.import',{sexo:'M',categoria:'Novillo',filas:[{caravana:'A',peso:300,fecha:DATE}]});
 const rows=(await pool.query('SELECT id,estado,potrero_id,peso_actual FROM animals')).rows;
 expect(rows.find(a=>a.id==='old')).toMatchObject({estado:'VENDIDO',potrero_id:null,peso_actual:400});
 expect(rows.find(a=>a.estado==='ACTIVO')).toMatchObject({potrero_id:'p2',peso_actual:300});
 expect((await pool.query('SELECT animal_id FROM animal_movements')).rows[0].animal_id).not.toBe('old');
});
it('still rejects two reserved animals with the same normalized visual tag',async()=>{
 await historical();await entry(['A']);await expect(entry([' a '])).rejects.toThrow();
 expect((await pool.query(`SELECT count(*)::int n FROM animals WHERE estado='ACTIVO'`)).rows[0].n).toBe(1);
});
it('does not recycle a globally registered RFID from a sold animal',async()=>{
 await historical('A','982000000000001');
 await expect(command('stock.save',{id_caravana:'B',rfid:'982000000000001',sexo:'H',categoria:'Vaca'})).rejects.toThrow();
 expect((await pool.query('SELECT count(*)::int n FROM animals')).rows[0].n).toBe(1);
});
it('requires review before a CSV creates another animal using a closed visual tag',async()=>{
 await historical();await expect(command('stock.import',{sexo:'H',categoria:'Vaca',filas:[{caravana:'A',peso:300,fecha:DATE}]})).rejects.toThrow('GANPRO_REUSED_TAG_REVIEW');
 expect((await pool.query('SELECT count(*)::int n FROM animals')).rows[0].n).toBe(1);
});
it('rejects a mismatching RFID on a visual-only CSV match',async()=>{
 await command('stock.save',{id_caravana:'A',rfid:'982000000000001',sexo:'H',categoria:'Vaca'});
 await expect(command('stock.import',{sexo:'H',categoria:'Vaca',filas:[{caravana:'A',rfid:'982000000000002',peso:300,fecha:DATE}]})).rejects.toThrow('GANPRO_CONFLICT');
 expect((await pool.query('SELECT peso_actual FROM animals')).rows[0].peso_actual).toBeNull();
});
it('refuses a sale reversal that would reactivate a historical tag already reassigned',async()=>{
 await entry(['A']);await command('stock.movement',{tipo:'VENTA',fecha:DATE,caravanas:['A'],kg:300,monto:'100',contraparte:'C'});
 const sale=(await pool.query(`SELECT id FROM movimientos_financieros WHERE categoria='VENTA'`)).rows[0].id;
 await entry(['A'],{fecha:DATE+86400000});
 await expect(command('finance.void',{id:sale,fecha:DATE+86400000,motivo:'Revisión'})).rejects.toThrow('GANPRO_TAG_REUSE_CONFLICT');
 expect((await pool.query('SELECT anulado_en FROM movimientos_financieros WHERE id=$1',[sale])).rows[0].anulado_en).toBeNull();
 expect((await pool.query(`SELECT count(*)::int n FROM animals WHERE estado='ACTIVO'`)).rows[0].n).toBe(1);
});
