import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import withObservables from '@nozbe/with-observables';
import { ObservableErrorBoundary } from '@shared/components/ObservableErrorBoundary';
import { colors, spacing, typography } from '@theme/index';
import { database } from '@data/database/database';
import { LoteSelector } from './ui/LoteSelector';
import { OperativoTab } from './ui/OperativoTab';
import { FinancieroTab } from './ui/FinancieroTab';
import type LoteModel from '@data/models/LoteModel';

type DashTab = 'operativo' | 'financiero';

// ── Inner component (receives lotes from WatermelonDB) ────────────────────────

interface DashboardInnerProps {
  lotes: LoteModel[];
}

function DashboardInner({ lotes }: DashboardInnerProps) {
  const [activeTab, setActiveTab] = useState<DashTab>('operativo');
  const [selectedLoteId, setSelectedLoteId] = useState<string | null>(null);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
      </View>

      {/* Lote selector — filtro global */}
      <LoteSelector
        lotes={lotes}
        selectedLoteId={selectedLoteId}
        onSelect={setSelectedLoteId}
      />

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'operativo' && styles.tabActive]}
          onPress={() => setActiveTab('operativo')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'operativo' && styles.tabTextActive]}>
            Operativo
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'financiero' && styles.tabActive]}
          onPress={() => setActiveTab('financiero')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'financiero' && styles.tabTextActive]}>
            Financiero
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab content */}
      <View style={styles.content}>
        {activeTab === 'operativo' ? (
          <OperativoTab loteId={selectedLoteId} />
        ) : (
          <FinancieroTab loteId={selectedLoteId} />
        )}
      </View>
    </SafeAreaView>
  );
}

// ── Container: connects lotes observable ─────────────────────────────────────

const DashboardConnected = withObservables(
  [],
  () => ({
    lotes: database.get<LoteModel>('lotes').query().observe(),
  })
)(DashboardInner);

// ── Main Screen export ────────────────────────────────────────────────────────

export function DashboardScreen() {
  return (
    <ObservableErrorBoundary fallbackTitle="Error al cargar dashboard">
      <DashboardConnected />
    </ObservableErrorBoundary>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  tabTextActive: {
    color: colors.textOnPrimary,
    fontWeight: typography.weights.bold,
  },
  content: {
    flex: 1,
  },
});
