import React, { useState } from 'react';
import { ObservableErrorBoundary } from '@shared/components/ObservableErrorBoundary';
import { DashboardContainer } from './model/DashboardContainer';

/**
 * DashboardScreen — thin orchestration layer.
 * Manages only local UI state (selectedLoteId).
 * All data concerns delegated to DashboardContainer (WatermelonDB).
 */
export function DashboardScreen() {
  const [selectedLoteId, setSelectedLoteId] = useState<string | null>(null);

  return (
    <ObservableErrorBoundary fallbackTitle="Error al cargar dashboard">
      <DashboardContainer
        selectedLoteId={selectedLoteId}
        onSelectLote={setSelectedLoteId}
      />
    </ObservableErrorBoundary>
  );
}
