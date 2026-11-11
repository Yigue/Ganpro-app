import {expect,it} from 'vitest';
import {parseBankCsv} from './bank-csv';
import {consumptionExpenses} from './economic';
import type {ManagementData} from './schema';
it('parses quoted descriptions without skipping malformed financial rows',()=>{
 const rows=parseBankCsv('fecha;referencia;descripcion;monto\n2026-11-10;A;"Pago; proveedor";-10.25',()=>1);
 expect(rows[0]).toEqual({fecha:1,referencia:'A',descripcion:'Pago; proveedor',monto:'-10.25'});
 expect(()=>parseBankCsv('fecha;referencia;descripcion;monto\n2026-11-10;A;Pago;invalid',()=>1)).toThrow();
 expect(()=>parseBankCsv('fecha;referencia;descripcion;monto\n2026-11-10;A;Pago;-1\n2026-11-10;A;Otro;-2',()=>1)).toThrow();
});
it('uses the saved consumption cost rather than repricing it from the current product price',()=>{
 const data={insumos:[{id:'s',nombre:'Maíz',tipo:'ALIMENTO'}],consumos:[{id:'x',insumo_id:'s',origen:'CONSUMO',fecha:1,valor:'-20.25',cantidad:'-2',lote_id:'l'}]} as ManagementData;
 expect(consumptionExpenses(data)[0]).toMatchObject({id:'consumo:x',monto:20.25,categoria:'NUTRICION',tipo:'GASTO',lote_id:'l'});
});
