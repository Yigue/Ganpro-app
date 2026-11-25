import type {Evento,Servicio} from '@/lib/db/types';
export interface ReproductiveCycle {
 id:string;madre_id:string;servicio_id:string;fecha_servicio:number;estado:string;
 fecha_tacto?:number|null;ternero_id:string|null;fecha_parto:number|null;fecha_destete:number|null;peso_destete:number|null;
}
export interface Cohort {
 registrados:number;declarados:number|null;cobertura:number|null;tactadas:number;prenadas:number;partos:number;
 destetados:number;kgDestetados:number;pesosFaltantes:number;pctPrenez:number|null;pctDestete:number|null;solapados:boolean;
}
/** Indicators count actual cycle facts and unique calves, never stock or purchases as a proxy for weaning. */
export function reproductiveCohort(services:Servicio[],cycles:ReproductiveCycle[],events:Evento[],asOf:number):Cohort{
 const ids=new Set(services.map(s=>s.id)),rows=cycles.filter(c=>ids.has(c.servicio_id)&&c.fecha_servicio<=asOf);
 const mothers=new Set(rows.map(c=>c.madre_id)),solapados=mothers.size!==rows.length;
 const declarados=services.length&&services.every(s=>s.vientres!=null)?services.reduce((sum,s)=>sum+s.vientres!,0):null;
 const registered=rows.length;
 const diagnoses=rows.flatMap(c=>{
  const event=events.find(e=>e.animal_id===c.madre_id&&e.tipo==='TACTO'&&e.timestamp===c.fecha_tacto&&e.timestamp<=asOf);
  if(!event)return [];
  return [{pregnant:/tacto:(prenada|preñada)/i.test(event.notas??''),empty:/tacto:(vacia|vacía)/i.test(event.notas??'')}];
 }).filter(d=>d.pregnant||d.empty);
 const born=new Set(rows.filter(c=>c.ternero_id&&c.fecha_parto!=null&&c.fecha_parto<=asOf).map(c=>c.ternero_id));
 const weaned=new Map(rows.filter(c=>c.ternero_id&&c.fecha_destete!=null&&c.fecha_destete<=asOf).map(c=>[c.ternero_id!,c]));
 const prenadas=diagnoses.filter(d=>d.pregnant).length;
 return {registrados:registered,declarados,cobertura:declarados&& !solapados?registered/declarados*100:null,
  tactadas:diagnoses.length,prenadas,partos:born.size,destetados:weaned.size,
  kgDestetados:[...weaned.values()].reduce((sum,c)=>sum+(c.peso_destete??0),0),
  pesosFaltantes:[...weaned.values()].filter(c=>c.peso_destete==null).length,
  pctPrenez:!solapados&&diagnoses.length?prenadas/diagnoses.length*100:null,
  pctDestete:!solapados&&registered>0&&declarados!=null&&declarados>0&&registered<=declarados?weaned.size/declarados*100:null,solapados};
}
