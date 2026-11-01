// Filas de las tablas de Supabase. Mismos nombres de columna que el esquema
// WatermelonDB v3 de la app; los timestamps son milisegundos Unix.
// Para regenerarlos desde el proyecto: npm run db:types

export type Rol = 'admin' | 'campo' | 'asesor';

interface Base {
  id: string;
  created_at: number;
  updated_at: number;
}

export interface Potrero extends Base {
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

export interface OperationCatalog extends Base {
  nombre: string;
  tipo: string;
  dias_carencia: number | null;
  costo_unitario: number | null;
  notas: string | null;
}

export interface OperationLog extends Base {
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

export interface TableMap {
  potreros: Potrero;
  lotes: Lote;
  animals: Animal;
  animal_movements: AnimalMovement;
  eventos: Evento;
  sync_logs: SyncLog;
  operations_catalog: OperationCatalog;
  operation_logs: OperationLog;
  scheduled_operations: ScheduledOperation;
  protocolos_iatf: ProtocoloIATF;
  etapas_protocolo: EtapaProtocolo;
  condicion_corporal: CondicionCorporal;
  suplementos: Suplemento;
  raciones: Racion;
  potrero_feeding_logs: PotreroFeedingLog;
  manga_action_queue: MangaAction;
  movimientos_financieros: MovimientoFinanciero;
  precios_mercado: PrecioMercado;
  servicios: Servicio;
  revisacion_toros: RevisacionToro;
  racion_ingredientes: RacionIngrediente;
  sigsa_stock: SigsaStock;
  categorias_config: CategoriaConfig;
  establecimiento: Establecimiento;
  perfiles: Perfil;
}

export type TableName = keyof TableMap;
