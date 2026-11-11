import 'server-only';
import {getAnimals,getPotreros,getCategoriasConfig} from '@/lib/db/client';
import {readGeometry} from './geometry';
import type {MapPaddock} from './types';
export async function getMapData():Promise<MapPaddock[]>{
 const [animals,paddocks,config]=await Promise.all([getAnimals(),getPotreros(),getCategoriasConfig()]);
 const coefficients=new Map(config.map(c=>[c.categoria,c.ev]));
 return paddocks.map(p=>{
  const here=animals.filter(a=>a.estado==='ACTIVO'&&a.potrero_id===p.id);
  const groups=new Map<string,number>();here.forEach(a=>groups.set(a.categoria,(groups.get(a.categoria)??0)+1));
  return {id:p.id,nombre:p.nombre,hectareas:p.hectareas,...readGeometry(p.geo_json),version:p.map_version??0,
   tipo:p.tipo_potrero??'SIN_DATOS',forraje:p.estado_forraje??'SIN_DATOS',recurso:p.recurso_forrajero??'',
   capacidadEV:p.capacidad_ev,capacidadCabezas:p.capacidad_cabezas??null,agua:p.agua??null,sombra:p.sombra??null,notas:p.notas??'',perimetro:p.perimetro_m??null,
   cabezas:here.length,ev:here.every(a=>coefficients.has(a.categoria))?here.reduce((n,a)=>n+coefficients.get(a.categoria)!,0):null,
   categorias:[...groups].map(([categoria,cabezas])=>({categoria,cabezas})),};
 });
}
