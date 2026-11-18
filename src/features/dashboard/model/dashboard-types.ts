import type EventoModel from '@data/models/EventoModel';
import type LoteModel from '@data/models/LoteModel';
import type PrecioMercadoModel from '@data/models/PrecioMercadoModel';
import type AnimalModel from '@data/models/AnimalModel';
export interface DashboardContainerOuterProps {
  selectedLoteId: string | null;
  onSelectLote: (id: string | null) => void;
}

export interface DashboardContainerProps extends DashboardContainerOuterProps {
  pesajes: EventoModel[];
  eventosRecientes: EventoModel[];
  lotes: LoteModel[];
  ultimoPrecio: PrecioMercadoModel[];
  animalesMuertos: AnimalModel[];
  todosAnimales: AnimalModel[];
}
