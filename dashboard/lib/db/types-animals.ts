export type Rol = 'admin' | 'campo' | 'asesor';

export interface Base {
  id: string;
  created_at: number;
  updated_at: number;
  server_updated_at?: number;
}

export interface Potrero extends Base {
  map_version?:number;perimetro_m?:number|null;tipo_potrero?:string;capacidad_cabezas?:number|null;estado_forraje?:string;agua?:boolean|null;sombra?:boolean|null;notas?:string|null;
  nombre: string;
  hectareas: number | null;
  recurso_forrajero: string | null;
  capacidad_ev: number | null;
  geo_json: string | null;
}

export interface Lote extends Base {
  nombre: string;
  ubicacion: string | null;
  descripcion: string | null;
  hectareas: number | null;
  costo_alquiler_ha: number | null;
  geo_json: string | null;
  densidad_carga: number | null;
}

export type EstadoAnimal = 'ACTIVO' | 'VENDIDO' | 'MUERTO' | 'DESCARTE';

export interface Animal extends Base {
  visual_pendiente?:boolean;
  id_caravana: string;
  rfid: string | null;
  sexo: 'M' | 'H';
  categoria: string;
  raza: string | null;
  fecha_nacimiento: number | null;
  peso_actual: number | null;
  estado: EstadoAnimal;
  lote_id: string | null;
  potrero_id: string | null;
  synced_at: number | null;
}

export interface AnimalMovement extends Base {
  animal_id: string;
  potrero_origen_id: string | null;
  potrero_destino_id: string | null;
  lote_origen_id: string | null;
  lote_destino_id: string | null;
  fecha: number;
}

export interface Evento extends Base {
  animal_id: string;
  tipo: string;
  valor: number | null;
  notas: string | null;
  timestamp: number;
  lote_destino_id: string | null;
  dte_numero: string | null;
}

export interface SyncLog extends Base {
  entity_type: string;
  entity_id: string;
  action: string;
  synced: boolean;
  timestamp: number;
}
