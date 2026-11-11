import type {Base} from './types-animals';
export interface OperationCatalog extends Base {
  nombre: string;
  tipo: string;
  dias_carencia: number | null;
  costo_unitario: number | null;
  notas: string | null;
}

export interface OperationLog extends Base {
  receptores_fijados?:boolean; cantidad_animales?:number|null;costo_total?:number|null;aplicacion_animales?:Array<{animal_id:string}>;insumo_id?:string|null;
  animal_id: string | null;
  lote_id: string | null;
  operation_id: string;
  fecha_aplicacion: number;
  fecha_fin_carencia: number | null;
  dosis: number | null;
  responsable: string | null;
  acta_numero: string | null;
  producto_lote: string | null;
}

export interface ScheduledOperation extends Base {
  operation_id: string;
  lote_id: string | null;
  fecha_programada: number;
  estado: 'PENDIENTE' | 'COMPLETADO' | 'CANCELADO';
}

export interface ProtocoloIATF extends Base {
  nombre: string;
  lote_id: string;
  fecha_inicio: number;
  estado: 'ACTIVO' | 'COMPLETADO' | 'CANCELADO';
  notas: string | null;
}

export interface EtapaProtocolo extends Base {
  protocolo_id: string;
  nombre: string;
  dias_desde_inicio: number;
  descripcion: string | null;
  completada: boolean;
  fecha_completada: number | null;
  notificacion_id: string | null;
}

export interface CondicionCorporal extends Base {
  lote_id: string | null;
  animal_id: string | null;
  fecha: number;
  score: number;
  evaluador: string | null;
  notas: string | null;
}
