import type {ManagementData} from '@/lib/management/schema';
import type {Animal,Lote,Potrero,Suplemento,OperationCatalog,Servicio,EscenarioLinea,Escenario,MovimientoFinanciero} from '@/lib/db/types';
import type {LedgerSnapshot} from '@/lib/db/ledger-types';
export interface ManagementProps{
 data:ManagementData;editable:boolean;admin:boolean;animals:Animal[];lotes:Lote[];potreros:Potrero[];
 suplementos:Suplemento[];catalogo:OperationCatalog[];servicios:Servicio[];ledger:LedgerSnapshot;
 reales:MovimientoFinanciero[];lineas:EscenarioLinea[];escenarios:Escenario[];
}
