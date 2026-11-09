import type {Polygon} from './geometry';
export interface MapPaddock{
 id:string;nombre:string;hectareas:number|null;geometry:Polygon|null;invalid:boolean;version:number;
 tipo:string;forraje:string;recurso:string;capacidadEV:number|null;capacidadCabezas:number|null;
 agua:boolean|null;sombra:boolean|null;notas:string;perimetro:number|null;cabezas:number;ev:number|null;
 categorias:Array<{categoria:string;cabezas:number}>;
}
export type BaseLayer='calles'|'satelite'|'relieve';
