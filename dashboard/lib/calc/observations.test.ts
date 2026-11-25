import {afterEach,expect,it,vi} from 'vitest';
import type {AnimalMovement,Evento,Servicio} from '@/lib/db/types';
import {tratamientosFixture} from '../../tests/fixtures/treatments';
import {businessMonthStart,ejercicioDe,mesKey,ultimosMeses,DAY_MS as D} from './fechas';
import {gdpPorLote,kgGanados} from './pesadas';
import {herdGain} from '../../../src/shared/utils/herdMetrics';
import {stockExposure} from './stock-exposure';
import {costosPorLote} from './costos';
import {reproductiveCohort,type ReproductiveCycle} from './reproductive-cohort';
import {parseCsvRFID} from './csv';
import {projectTreasury} from './treasury';
const {animal,lote,expense}=tratamientosFixture;
const event=(tipo:string,timestamp:number,patch:Partial<Evento>={}):Evento=>({id:tipo+timestamp,created_at:timestamp,updated_at:timestamp,animal_id:'a',tipo,timestamp,valor:null,notas:null,lote_destino_id:null,dte_numero:null,...patch});
afterEach(()=>vi.useRealTimers());
it('keeps weight loss and computes the same 90-day weighted GDP as the mobile app',()=>{
 vi.useFakeTimers();vi.setSystemTime(20*D);
 const weights=new Map([['a',[{timestamp:0,valor:100},{timestamp:10*D,valor:120}]],['b',[{timestamp:0,valor:200},{timestamp:20*D,valor:190}]]]);
 expect(kgGanados(weights,0,20*D)).toBeCloseTo(10);
 const web=gdpPorLote([animal({}),animal({id:'b'})],weights)[0];
 const mobile=herdGain([...weights].flatMap(([animalId,points])=>points.map(p=>({...p,animalId}))));
 expect(web.gdpPromedio).toBeCloseTo(1/3);expect(web.gdpPromedio).toBe(mobile.dailyGain);expect(web.animalesConPesadas).toBe(2);
});
it('does not turn an invalid or conflicting same-time weight into production',()=>{
 expect(kgGanados(new Map([['a',[{timestamp:0,valor:100},{timestamp:0,valor:200},{timestamp:D,valor:300}]]]),0,D)).toBe(0);
});
it('uses Argentine month and fiscal boundaries even when UTC has advanced to the next month',()=>{
 expect(mesKey(Date.parse('2026-12-01T01:00:00Z'))).toBe('2026-11');
 expect(ejercicioDe(Date.parse('2026-07-01T01:00:00Z')).label).toBe('2025-26');
 expect(ejercicioDe(Date.parse('2026-07-01T03:00:00Z')).inicio).toBe(Date.parse('2026-07-01T03:00:00Z'));
 expect(ultimosMeses(2,Date.parse('2026-01-01T01:00:00Z')).map(m=>m.key)).toEqual(['2025-11','2025-12']);
 expect(new Date(businessMonthStart(2026,12)).toISOString()).toBe('2027-01-01T03:00:00.000Z');
});
it('preserves past costs when an animal is sold or moved after the reporting period',()=>{
 const before=animal({created_at:0}),after=animal({created_at:0,estado:'VENDIDO',lote_id:'l2'});
 const moves:AnimalMovement[]=[{id:'move',created_at:20*D,updated_at:20*D,animal_id:'a',fecha:20*D,lote_origen_id:'l1',lote_destino_id:'l2',potrero_origen_id:null,potrero_destino_id:null}];
 const events=[event('COMPRA',0),event('VENTA',21*D)];
 const params={lotes:[lote],movs:[expense({monto:100,fecha:D})],logs:[],catalogo:new Map(),desde:0,hasta:10*D-1,eventos:events};
 const original=costosPorLote({...params,animals:[before],movimientos:[]})[0];
 expect(costosPorLote({...params,animals:[after],movimientos:moves})[0]).toEqual(original);
 expect(original.porCabeza).toBe(100);expect(original.cabezasDia).toBe(10);
});
it('allocates only actual residence time before a sale within the reporting period',()=>{
 const exposure=stockExposure([animal({created_at:0,estado:'VENDIDO'})],[event('COMPRA',0),event('VENTA',5*D)],[],0,10*D-1);
 expect(exposure.averageHeads).toBe(0.5);expect(exposure.headsAtEnd).toBe(0);expect(exposure.animalDays).toBe(5);
});
it('does not rewrite recorded historic rent from the current lot budget',()=>{
 const params={lotes:[{...lote,hectareas:100,costo_alquiler_ha:99999}],animals:[animal({})],movs:[],logs:[],catalogo:new Map(),desde:1,hasta:D};
 expect(costosPorLote(params)[0].alquiler).toBe(0);
});
const service:Servicio={id:'s',created_at:1,updated_at:1,temporada:'2026',lote_id:'l1',toros:[],vientres:2,fecha_entrada:1,fecha_salida:null,notas:null};
const cycle:ReproductiveCycle={id:'cycle',madre_id:'a',servicio_id:'s',fecha_servicio:1,fecha_tacto:2,estado:'DESTETADA',ternero_id:'calf',fecha_parto:3,fecha_destete:4,peso_destete:120};
it('counts linked weaning facts and exposes coverage instead of counting bought or still-suckling calves',()=>{
 const summary=reproductiveCohort([service],[cycle,{...cycle,id:'c2',madre_id:'b',estado:'PARIDA',ternero_id:'second',fecha_destete:null,peso_destete:null}],
  [event('TACTO',2,{notas:'tacto:prenada'}),event('TACTO',2,{animal_id:'b',notas:'tacto:prenada'})],10);
 expect(summary).toMatchObject({registrados:2,tactadas:2,prenadas:2,partos:2,destetados:1,kgDestetados:120,pctDestete:50,cobertura:100});
});
it('does not display an aggregate percentage when the same mother appears in overlapping services',()=>{
 const summary=reproductiveCohort([service,{...service,id:'s2'}],[cycle,{...cycle,id:'c2',servicio_id:'s2'}],[],10);
 expect(summary.solapados).toBe(true);expect(summary.pctDestete).toBeNull();
});
it('projects current cash with both commitments and carries overdue documents into the first month',()=>{
 const asOf=Date.parse('2026-11-24T12:00:00-03:00');
 const result=projectTreasury({saldo:'100000.00',documentos:[{tipo:'INGRESO',pendiente:'50000.00',vencimiento:asOf-D*60},
  {tipo:'GASTO',pendiente:'200000.00',vencimiento:asOf+D},{tipo:'GASTO',pendiente:'0.00',vencimiento:asOf}]},['2026-11','2026-12'],asOf);
 expect(result[0]).toMatchObject({cobros:'50000.00',gastos:'200000.00',neto:'-150000.00',acumulado:'-50000.00',vencidosCobro:1});
 expect(result[1].acumulado).toBe('-50000.00');
});
it('keeps cent precision in the projected balance',()=>{
 const result=projectTreasury({saldo:'0.10',documentos:[{tipo:'INGRESO',pendiente:'0.20',vencimiento:Date.parse('2026-11-25T12:00:00-03:00')}]},['2026-11'],Date.parse('2026-11-24T12:00:00-03:00'));
 expect(result[0].acumulado).toBe('0.30');
});

it('rejects a provided invalid CSV date instead of treating it as a missing date',()=>{
 expect(parseCsvRFID('caravana;fecha\nA;31/02/2026').errores).toHaveLength(1);
 expect(parseCsvRFID('caravana;fecha\nA;2026-11-24').filas[0].fecha).toBe(Date.parse('2026-11-24T12:00:00-03:00'));
});
