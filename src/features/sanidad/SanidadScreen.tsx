import React, { useState, useCallback } from 'react';
import { ObservableErrorBoundary } from '@shared/components/ObservableErrorBoundary';
import { SanidadContainer } from './model/SanidadContainer';

/**
 * SanidadScreen — thin orchestration layer.
 * Manages only local UI state (refreshing, modal visibility).
 * All data concerns delegated to SanidadContainer (WatermelonDB).
 */
export function SanidadScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  return (
    <ObservableErrorBoundary fallbackTitle="Error al cargar sanidad">
      <SanidadContainer
        refreshing={refreshing}
        onRefresh={onRefresh}
      />
    </ObservableErrorBoundary>
  );
}
