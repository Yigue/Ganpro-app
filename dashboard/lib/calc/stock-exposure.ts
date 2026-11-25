import type {Animal,AnimalMovement,Evento} from '@/lib/db/types';
import {DAY_MS} from './fechas';
export interface Exposure {animalDays:number;averageHeads:number;headsAtEnd:number;legacyAnimals:number;byLot:Map<string|null,number>}

/** Reconstruct membership using the last past move or the origin of the first future move. */
export function historicalLot(animal:Animal,moves:AnimalMovement[],at:number):string|null{
 const rows=moves.filter(m=>m.animal_id===animal.id).sort((a,b)=>a.fecha-b.fecha||a.created_at-b.created_at);
 const past=rows.filter(m=>m.fecha<=at).at(-1),future=rows.find(m=>m.fecha>at);
 return past?past.lote_destino_id:future?future.lote_origen_id:animal.lote_id;
}
/** A recorded entry/exit is a fact; current state is only the fallback for incomplete legacy history. */
function presentAt(animal:Animal,events:Evento[],at:number):boolean{
 const entries=events.filter(e=>['COMPRA','NACIMIENTO','ALTA_INICIAL'].includes(e.tipo));
 const since=entries.length?Math.min(...entries.map(e=>e.timestamp)):animal.created_at;
 if(at<since)return false;
 let present=events.some(e=>['VENTA','MUERTE'].includes(e.tipo))||animal.estado==='ACTIVO';
 for(const e of events.filter(e=>e.timestamp<=at)){
  if(['COMPRA','NACIMIENTO','ALTA_INICIAL'].includes(e.tipo))present=true;
  if(['VENTA','MUERTE'].includes(e.tipo))present=false;
  if(e.tipo==='ANULACION'&&e.valor!=null)present=e.valor>0;
 }
 return present;
}
/** Integrate actual residence intervals, so later sales/transfers do not change past head-days. */
export function stockExposure(animals:Animal[],events:Evento[],moves:AnimalMovement[],from:number,to:number):Exposure{
 const result:Exposure={animalDays:0,averageHeads:0,headsAtEnd:0,legacyAnimals:0,byLot:new Map()};
 if(to<from)return result;
 const end=to+1,days=(end-from)/DAY_MS;
 for(const animal of animals){
  const life=events.filter(e=>e.animal_id===animal.id).sort((a,b)=>a.timestamp-b.timestamp||a.created_at-b.created_at);
  const history=moves.filter(m=>m.animal_id===animal.id);
  const boundaries=[...new Set([from,end,animal.created_at,...life.map(e=>e.timestamp),...history.map(m=>m.fecha)])].filter(t=>t>=from&&t<=end).sort((a,b)=>a-b);
  let used=false;
  for(let i=0;i<boundaries.length-1;i++){
   const start=boundaries[i];if(!presentAt(animal,life,start))continue;
   const duration=(boundaries[i+1]-start)/DAY_MS,lot=historicalLot(animal,history,start);
   result.animalDays+=duration;result.byLot.set(lot,(result.byLot.get(lot)??0)+duration);used=true;
  }
  if(presentAt(animal,life,to))result.headsAtEnd++;
  if((used||animal.created_at<=to)&&!life.some(e=>['COMPRA','NACIMIENTO','ALTA_INICIAL'].includes(e.tipo)))result.legacyAnimals++;
 }
 result.averageHeads=result.animalDays/days;
 return result;
}
