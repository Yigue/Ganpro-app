import type React from 'react';

/**
 * DashboardContainer — legacy container kept for backwards compatibility.
 *
 * The new architecture delegates data-fetching to each tab:
 *   - OperativoTab: connects animals, pesajes, eventos, tasks
 *   - FinancieroTab: connects movimientos_financieros
 *
 * This file exposes a combined container that bridges WatermelonDB
 * observables for any consumer that still needs the full dataset
 * (e.g., tests, widgets, future export flows).
 */

import withObservables from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';
import { database } from '@data/database/database';
import { EVENTO_TIPO } from '@core/constants/eventTypes';
import type AnimalModel from '@data/models/AnimalModel';
import type EventoModel from '@data/models/EventoModel';
import type LoteModel from '@data/models/LoteModel';
import type PrecioMercadoModel from '@data/models/PrecioMercadoModel';
import type MovimientoFinancieroModel from '@data/models/MovimientoFinancieroModel';
import { TaskModel } from '@data/models/TaskModel';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DashboardContainerOuterProps {
  loteId: string | null;
}

export interface DashboardContainerData {
  animals: AnimalModel[];
  pesajes: EventoModel[];
  eventosRecientes: EventoModel[];
  tasks: TaskModel[];
  transactions: MovimientoFinancieroModel[];
  lotes: LoteModel[];
  ultimoPrecio: PrecioMercadoModel[];
}

// ─── HOC factory ─────────────────────────────────────────────────────────────

/**
 * withDashboardData — higher-order component that injects the full dashboard
 * dataset into any component.
 *
 * Usage:
 *   const MyWidget = withDashboardData(MyWidgetView);
 *   <MyWidget loteId={null} />
 */
export function withDashboardData<P extends DashboardContainerData>(
  WrappedComponent: React.ComponentType<P & DashboardContainerOuterProps>
) {
  return withObservables(
    ['loteId'],
    ({ loteId }: DashboardContainerOuterProps) => {
      const loteFilter = loteId ? [Q.where('lote_id', loteId)] : [];
      return {
        animals: database
          .get<AnimalModel>('animals')
          .query(Q.where('estado', 'ACTIVO'), ...loteFilter)
          .observe(),
        pesajes: database
          .get<EventoModel>('eventos')
          .query(
            Q.where('tipo', EVENTO_TIPO.PESAJE),
            ...loteFilter,
            Q.sortBy('timestamp', Q.asc),
            Q.take(30)
          )
          .observe(),
        eventosRecientes: database
          .get<EventoModel>('eventos')
          .query(
            ...loteFilter,
            Q.sortBy('timestamp', Q.desc),
            Q.take(20)
          )
          .observe(),
        tasks: database
          .get<TaskModel>('tasks')
          .query(Q.sortBy('created_at', Q.desc))
          .observe(),
        transactions: database
          .get<MovimientoFinancieroModel>('movimientos_financieros')
          .query(...loteFilter, Q.sortBy('fecha', Q.desc))
          .observe(),
        lotes: database.get<LoteModel>('lotes').query().observe(),
        ultimoPrecio: database
          .get<PrecioMercadoModel>('precios_mercado')
          .query(Q.sortBy('fecha', Q.desc), Q.take(1))
          .observe(),
      };
    }
  )(WrappedComponent as React.ComponentType<DashboardContainerOuterProps>);
}
