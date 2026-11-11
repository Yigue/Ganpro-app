import type {Base} from './types-animals';
export interface MovimientoFinanciero extends Base {
  tipo: 'GASTO' | 'INGRESO';
  categoria: string;
  lote_id: string | null;
  animal_id: string | null;
  monto: number;
  fecha: number;
  descripcion: string | null;
  comprobante: string | null;
  dte_numero: string | null;
  cabezas: number | null;
  kg: number | null;
  categoria_animal: string | null;
  renspa_destino: string | null;
  dte_estado: 'EMITIDO' | 'ANULADO' | 'RETORNO' | null;
  desbaste_pct?:number|string|null;kg_facturados?:number|string|null;plazo_dias?:number|null;metodo_pago?:string|null;condiciones?:string|null;
  modalidad_precio?: 'KG'|'CABEZA'|null;
  precio_unitario?: number|string|null;
  detalle_categorias?: {categoria:string;cabezas:number}[]|null;
  fecha_cobro: number | null;
  cobrado: boolean | null;
}

export interface PrecioMercado extends Base {
  fecha: number;
  novillo_kg: number | null;
  ternero_kg: number | null;
  vaca_kg: number | null;
  vaca_descarte_kg: number | null;
  ternera_kg: number | null;
  vaquillona_kg: number | null;
  toro_kg: number | null;
  dolar_oficial: number | null;
  dolar_mep: number | null;
  fuente: string;
}
