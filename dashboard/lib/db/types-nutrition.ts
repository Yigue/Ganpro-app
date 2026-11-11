import type {Base} from './types-animals';
export interface Suplemento extends Base {
  nombre: string;
  tipo: string;
  materia_seca_pct: number;
  proteina_bruta_pct: number | null;
  energia_mcal_kg: number | null;
  precio_por_tonelada: number | null;
  stock_kg: number | null;
  stock_minimo_kg: number | null;
  proveedor: string | null;
}

export interface Racion extends Base {
  nombre: string;
  descripcion: string | null;
  activa: boolean;
}

export interface PotreroFeedingLog extends Base {
  costo_total?:number|null;snapshot_formula?:Array<{suplemento_id:string;porcentaje:number}>|null;
  potrero_id: string;
  racion_id: string;
  cantidad_kg: number;
  fecha: number;
  notas: string | null;
}

export interface MangaAction extends Base {
  animal_id: string | null;
  action_type: string;
  payload: string;
  status: 'PENDING' | 'PROCESSED' | 'ERROR';
}
