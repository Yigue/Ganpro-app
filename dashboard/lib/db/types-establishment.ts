import type {Rol,Base} from './types-animals';
import type {PrecioMercado} from './types-finance';
export interface Servicio extends Base {
  temporada: string;
  lote_id: string;
  toros: string[];
  vientres: number | null;
  fecha_entrada: number;
  fecha_salida: number | null;
  notas: string | null;
}

export interface RevisacionToro extends Base {
  animal_id: string;
  fecha: number;
  apto: boolean;
  sanitaria: string | null;
  circunferencia_escrotal_cm: number | null;
  notas: string | null;
}

export interface RacionIngrediente extends Base {
  racion_id: string;
  suplemento_id: string;
  porcentaje: number;
}

export interface SigsaStock extends Base {
  fecha: number;
  categoria: string;
  cabezas: number;
  fuente: 'ACTA' | 'HISTORICO' | 'CSV';
  acta_numero: string | null;
}

export interface CategoriaConfig {
  categoria: string;
  sexo: 'M' | 'H' | null;
  ev: number;
  orden: number;
  recategoriza_a: string | null;
  edad_recategorizacion_meses: number | null;
  consumo_sal_g_dia: number | null;
  precio_columna: keyof PrecioMercado | null;
}

export interface Establecimiento {
  id: 1;
  nombre: string;
  renspa: string | null;
  localidad: string | null;
  provincia: string | null;
  hectareas_ganaderas: number | null;
  inicio_ejercicio_mes: number;
  dias_alerta_pesada: number;
  dias_alerta_sanidad: number;
}

export interface Perfil {
  id: string;
  nombre: string | null;
  email: string | null;
  rol: Rol;
  created_at: string;
}
