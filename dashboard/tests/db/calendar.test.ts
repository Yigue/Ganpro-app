import {beforeEach,afterAll,it,expect} from 'vitest';
import {pool,fixture,command,entry,DATE} from './fixtures';
beforeEach(fixture);afterAll(()=>pool.end());
it('completes a whole-herd task only through application, fixing recipients and blocking duplicate application',async()=>{
 await entry(['A','B']);await pool.query("INSERT INTO operations_catalog(id,nombre,tipo,dias_carencia) VALUES('drug','Test','TRATAMIENTO',10)");
 await pool.query("INSERT INTO scheduled_operations(id,operation_id,fecha_programada,estado) VALUES('schedule','drug',$1,'PENDIENTE')",[DATE]);
 await expect(command('health.schedule-status',{id:'schedule',estado:'COMPLETADO'})).rejects.toThrow('GANPRO_SCHEDULE_APPLICATION');
 const d={destino:'rodeo',operation_id:'drug',fecha:DATE,dosis:1,scheduled_id:'schedule'};await command('health.apply',d);
 expect((await pool.query('SELECT count(*)::int n FROM aplicacion_animales')).rows[0].n).toBe(2);
 expect((await pool.query('SELECT estado FROM scheduled_operations')).rows[0].estado).toBe('COMPLETADO');
 await expect(command('health.apply',d)).rejects.toThrow('GANPRO_CONFLICT');expect((await pool.query('SELECT count(*)::int n FROM operation_logs')).rows[0].n).toBe(1);
});
it('cancels a pending schedule without recording a treatment',async()=>{
 await pool.query("INSERT INTO operations_catalog(id,nombre,tipo) VALUES('drug','Test','TRATAMIENTO')");await pool.query("INSERT INTO scheduled_operations(id,operation_id,fecha_programada,estado) VALUES('schedule','drug',$1,'PENDIENTE')",[DATE]);
 await command('health.schedule-status',{id:'schedule',estado:'CANCELADO'});expect((await pool.query('SELECT estado FROM scheduled_operations')).rows[0].estado).toBe('CANCELADO');expect((await pool.query('SELECT * FROM operation_logs')).rows).toHaveLength(0);
});
