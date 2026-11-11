// Native DTO exports remain available from this stable module path.
export * from './types-animals';
import type {Potrero,Lote,Animal,AnimalMovement,Evento,SyncLog} from './types-animals';
export * from './types-health';
import type {OperationCatalog,OperationLog,ScheduledOperation,ProtocoloIATF,EtapaProtocolo,CondicionCorporal} from './types-health';
export * from './types-nutrition';
import type {Suplemento,Racion,PotreroFeedingLog,MangaAction} from './types-nutrition';
export * from './types-finance';
import type {MovimientoFinanciero,PrecioMercado} from './types-finance';
export * from './types-establishment';
import type {Servicio,RevisacionToro,RacionIngrediente,SigsaStock,CategoriaConfig,Establecimiento,Perfil} from './types-establishment';
export * from './types-planning';
import type {Escenario,EscenarioLinea} from './types-planning';

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
  escenarios: Escenario;
  escenario_lineas: EscenarioLinea;
}
export type TableName = keyof TableMap;
