import React, { useState, useCallback } from 'react';
import { ObservableErrorBoundary } from '@shared/components/ObservableErrorBoundary';
import { InventoryContainer } from './model/InventoryContainer';
import type AnimalModel from '@data/models/AnimalModel';
import type { CategoriaType } from '@core/constants/categories';

/**
 * InventoryScreen — thin orchestration layer.
 * Manages only local UI state (filter, refreshing, selected animal).
 * All data concerns delegated to InventoryContainer (WatermelonDB).
 */
export function InventoryScreen() {
  const [filterCategory, setFilterCategory] = useState<CategoriaType | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // WatermelonDB observables are reactive — spinner is pure UX feedback
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const onAnimalPress = useCallback((_animal: AnimalModel) => {
    // TODO: open AnimalDetailModal when implemented
  }, []);

  return (
    <ObservableErrorBoundary fallbackTitle="Error al cargar inventario">
      <InventoryContainer
        filterCategory={filterCategory}
        onFilterChange={setFilterCategory}
        onAnimalPress={onAnimalPress}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />
    </ObservableErrorBoundary>
  );
}
