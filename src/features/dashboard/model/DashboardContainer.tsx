import withObservables from '@nozbe/with-observables';
import {Q} from '@nozbe/watermelondb';
import {database} from '@data/database/database';
import {EVENTO_TIPO} from '@core/constants/eventTypes';
import {DashboardView} from '../ui/DashboardView';
import type {DashboardContainerOuterProps} from './dashboard-types';
import type EventoModel from '@data/models/EventoModel';
import type LoteModel from '@data/models/LoteModel';
import type PrecioMercadoModel from '@data/models/PrecioMercadoModel';
import type AnimalModel from '@data/models/AnimalModel';
export const DashboardContainer = withObservables(
  ['selectedLoteId'],
  ({ selectedLoteId }: DashboardContainerOuterProps) => ({
    pesajes: database
      .get<EventoModel>('eventos')
      .query(
        Q.where('tipo', EVENTO_TIPO.PESAJE),
        ...(selectedLoteId ? [Q.on('animals', 'lote_id', selectedLoteId)] : []),
        Q.where('timestamp', Q.gte(Date.now() - 90 * 86400000)),
        Q.where('timestamp', Q.lte(Date.now())),
        Q.sortBy('timestamp', Q.asc)
      )
      .observe(),
    eventosRecientes: database
      .get<EventoModel>('eventos')
      .query(
        ...(selectedLoteId ? [Q.on('animals', 'lote_id', selectedLoteId)] : []),
        Q.sortBy('timestamp', Q.desc),
        Q.take(20)
      )
      .observe(),
    lotes: database.get<LoteModel>('lotes').query().observe(),
    ultimoPrecio: database
      .get<PrecioMercadoModel>('precios_mercado')
      .query(Q.sortBy('fecha', Q.desc), Q.take(1))
      .observe(),
    animalesMuertos: database
      .get<AnimalModel>('animals')
      .query(Q.where('estado', 'MUERTO'), ...(selectedLoteId ? [Q.where('lote_id',selectedLoteId)] : []))
      .observe(),
    todosAnimales: database.get<AnimalModel>('animals').query(...(selectedLoteId ? [Q.where('lote_id',selectedLoteId)] : [])).observe(),
  })
)(DashboardView);
