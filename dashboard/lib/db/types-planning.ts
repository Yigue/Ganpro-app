import type {Base} from './types-animals';
export type TipoEscenario = 'negocio' | 'peso' | 'plan' | 'cria';

export interface Escenario extends Base {
  tipo: TipoEscenario;
  nombre: string;
  fecha: number;
  lote_id: string | null;
  estado: 'PROYECTADO' | 'EN_CURSO' | 'CERRADO';
  supuestos: Record<string, unknown>;
  resultado: Record<string, unknown>;
  resultado_real: Record<string, unknown> | null;
  escenario_real_id: string | null;
}

export interface EscenarioLinea extends Base {
  escenario_id: string;
  mes: string;
  tipo: 'VENTA' | 'COMPRA';
  categoria: string;
  cabezas: number;
  kg: number | null;
  precio_kg: number | null;
  monto: number | null;
  movimiento_id: string | null;
}
