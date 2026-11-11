import {expect,it} from 'vitest';
import type {Animal} from '@/lib/db/types';
import {filterAnimals,addGenericSelection,categoryCounts} from './selection';
import {tradePreview} from './trade';
const animal=(id:string,extra:Partial<Animal>={}):Animal=>({id,created_at:1,updated_at:1,id_caravana:id,rfid:null,sexo:'H',categoria:'Vaca',raza:null,fecha_nacimiento:null,peso_actual:null,estado:'ACTIVO',lote_id:'l1',potrero_id:'p1',synced_at:null,...extra});
it('bulk-selects a count of untagged animals within the chosen category and lot',()=>{
 const rows=[animal('a',{visual_pendiente:true}),animal('b',{visual_pendiente:true}),animal('c',{categoria:'Ternera'}),animal('d',{estado:'VENDIDO'})];
 const here=filterAnimals(rows,{lote:'l1',categoria:'Vaca',identificacion:'pendiente',search:''});expect(here.map(a=>a.id)).toEqual(['a','b']);expect(addGenericSelection(here,['b'],1)).toEqual(['b','a']);expect(categoryCounts(rows,['a'])).toEqual([{categoria:'Ternera',disponibles:1,seleccionados:0},{categoria:'Vaca',disponibles:2,seleccionados:1}]);
});
it('applies shrink only to billed kilos, keeping the physical weight average',()=>{
 expect(tradePreview('KG',28,5500,5520,3)).toEqual({billedKg:5335,amount:29449200,average:5500/28});
 expect(tradePreview('CABEZA',28,5500,1000,0).amount).toBe(28000);
});
