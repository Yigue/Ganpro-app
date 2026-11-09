import {beforeEach,afterAll,it,expect} from 'vitest';
import {pool,fixture,command,entry,DATE,asRole,ADMIN,snapshot} from './fixtures';
import {ledgerSchema} from '../../lib/db/ledger-types';
beforeEach(fixture);afterAll(()=>pool.end());
const geometry={type:'Polygon',coordinates:[[[-60,-35],[-59.99,-35],[-59.99,-35.01],[-60,-35.01],[-60,-35]]]};
it('measures hectares on the server and prevents stale overwrites',async()=>{
 const result=await command('map.save',{nombre:'Mapa',geometry});expect(Number(result.hectareas)).toBeGreaterThan(90);expect(Number(result.hectareas)).toBeLessThan(110);
 await command('map.save',{id:result.id,expected_version:1,nombre:'Actualizado',geometry});
 await expect(command('map.save',{id:result.id,expected_version:1,nombre:'Obsoleto',geometry})).rejects.toThrow('GANPRO_MAP_CONFLICT');
 expect((await pool.query('SELECT nombre FROM potreros WHERE id=$1',[result.id])).rows[0].nombre).toBe('Actualizado');
});
it('rejects a self-crossing polygon without creating a paddock',async()=>{
 await expect(command('map.save',{nombre:'Invalid',geometry:{type:'Polygon',coordinates:[[[-60,-35],[-59.99,-35.01],[-59.99,-35],[-60,-35.01],[-60,-35]]]}})).rejects.toThrow('GANPRO_INVALID_GEOMETRY');
 expect((await pool.query('SELECT count(*)::int n FROM potreros')).rows[0].n).toBe(2);
});
it('adopts a previous document once, without inventing cash or duplicating expenses',async()=>{
 await pool.query(`INSERT INTO movimientos_financieros(id,tipo,categoria,monto,fecha,cobrado) VALUES('legacy','GASTO','OTRO',100,$1,true)`,[DATE]);
 await command('finance.adopt',{id:'legacy',fecha:DATE,contraparte:'Original',conciliado:'40',vencimiento:DATE});
 const data=ledgerSchema.parse(await snapshot());expect(data.totales).toMatchObject({saldo:'0',por_pagar:'60.00',pagos:'0'});expect(data.anteriores.cantidad).toBe(0);
 expect((await pool.query('SELECT count(*)::int n FROM movimientos_financieros')).rows[0].n).toBe(1);
 await expect(command('finance.adopt',{id:'legacy',fecha:DATE,contraparte:'Original',conciliado:'40'})).rejects.toThrow('GANPRO_CONFLICT');
});
it('annuls a sale with stock restoration and preserves the historical cut',async()=>{
 await entry(['A']);const sale=await command('stock.movement',{tipo:'VENTA',fecha:DATE,caravanas:['A'],kg:300,monto:'100',contraparte:'C'});
 const doc=(await pool.query(`SELECT id FROM movimientos_financieros WHERE categoria='VENTA'`)).rows[0].id;
 expect(sale).toBeDefined();await command('finance.void',{id:doc,fecha:DATE+86400000,motivo:'Corrección'});
 expect((await pool.query('SELECT estado FROM animals')).rows[0].estado).toBe('ACTIVO');
 expect(ledgerSchema.parse(await snapshot()).totales.por_cobrar).toBe('0');
});
it('protects the last admin and rolls back a clinical application when its schedule is stale',async()=>{
 await expect(asRole(ADMIN,c=>c.query(`UPDATE perfiles SET rol='asesor' WHERE id=$1`,[ADMIN]))).rejects.toThrow('GANPRO_LAST_ADMIN');
 await entry(['A']);await pool.query(`INSERT INTO operations_catalog(id,nombre,tipo,dias_carencia) VALUES('drug','Drug','TRATAMIENTO',10)`);
 await expect(command('health.apply',{destino:'animal',caravana:'A',operation_id:'drug',fecha:DATE,scheduled_id:'missing'})).rejects.toThrow('GANPRO_CONFLICT');
 expect((await pool.query('SELECT count(*)::int n FROM operation_logs')).rows[0].n).toBe(0);
});
const sync=(changes:unknown,since:number)=>asRole(null,c=>c.query('SELECT ganpro_sync_push($1,$2)',[JSON.stringify(changes),since]),'service_role');
it('preserves mobile v3 create dependencies and retries, rejecting stale deletes',async()=>{
 const pulled=await asRole(null,async c=>(await c.query('SELECT ganpro_sync_pull(0) data')).rows[0].data,'service_role');
 const changes={animals:{created:[{id:'mobile-a',id_caravana:'MOB',sexo:'M',categoria:'Novillo',estado:'ACTIVO',potrero_id:'mobile-p',created_at:DATE,updated_at:DATE}],updated:[],deleted:[]},potreros:{created:[{id:'mobile-p',nombre:'Mobile',created_at:DATE,updated_at:DATE}],updated:[],deleted:[]}};
 await sync(changes,pulled.timestamp);await sync(changes,pulled.timestamp);
 expect((await pool.query(`SELECT count(*)::int n FROM animals WHERE id='mobile-a'`)).rows[0].n).toBe(1);
 await expect(sync({animals:{created:[],updated:[],deleted:['mobile-a']}},pulled.timestamp)).rejects.toThrow('GANPRO_CONFLICT');
 const next=await asRole(null,async c=>(await c.query('SELECT ganpro_sync_pull($1) data',[pulled.timestamp])).rows[0].data,'service_role');
 expect(next.timestamp).toBeGreaterThan(pulled.timestamp);expect(next.changes.animals.created).toHaveLength(1);
});
