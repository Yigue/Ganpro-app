import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, SectionList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import withObservables from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';
import { ObservableErrorBoundary } from '@shared/components/ObservableErrorBoundary';
import { EmptyState } from '@shared/components/EmptyState';
import { SanidadCalendar } from '../ui/SanidadCalendar';
import { database } from '@data/database/database';
import { colors, spacing, typography } from '@theme/index';
import { OperationCatalogModel } from '@data/models/OperationCatalogModel';
import { OperationLogModel } from '@data/models/OperationLogModel';
import { ScheduledOperationModel } from '@data/models/ScheduledOperationModel';

// ─── Types ──────────────────────────────────────────────────────────────────

interface SanidadContainerOuterProps {
  refreshing: boolean;
  onRefresh: () => void;
}

interface SanidadContainerProps extends SanidadContainerOuterProps {
  operationLogs: OperationLogModel[];
  scheduledOps: ScheduledOperationModel[];
  operationCatalog: OperationCatalogModel[];
}

// ─── Inner View ──────────────────────────────────────────────────────────────

function SanidadView({
  operationLogs,
  scheduledOps,
  operationCatalog,
  refreshing,
  onRefresh,
}: SanidadContainerProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const today = new Date();
  const yearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  // Build calendar day info from logs and scheduled ops
  const calendarDays = useMemo(() => {
    const map = new Map<string, { hasScheduled: boolean; hasCompleted: boolean }>();

    scheduledOps.forEach((op) => {
      const dateStr = new Date(op.fechaProgramada).toISOString().slice(0, 10);
      const existing = map.get(dateStr) ?? { hasScheduled: false, hasCompleted: false };
      map.set(dateStr, { ...existing, hasScheduled: true });
    });

    operationLogs.forEach((log) => {
      const dateStr = new Date(log.fechaAplicacion).toISOString().slice(0, 10);
      const existing = map.get(dateStr) ?? { hasScheduled: false, hasCompleted: false };
      map.set(dateStr, { ...existing, hasCompleted: true });
    });

    return Array.from(map.entries()).map(([date, info]) => ({ date, ...info }));
  }, [scheduledOps, operationLogs]);

  // Filter logs by selected date, or show all
  const filteredLogs = useMemo(() => {
    if (!selectedDate) return operationLogs;
    return operationLogs.filter((log) => {
      const dateStr = new Date(log.fechaAplicacion).toISOString().slice(0, 10);
      return dateStr === selectedDate;
    });
  }, [operationLogs, selectedDate]);

  // Filter scheduled ops by selected date
  const filteredScheduled = useMemo(() => {
    if (!selectedDate) return scheduledOps;
    return scheduledOps.filter((op) => {
      const dateStr = new Date(op.fechaProgramada).toISOString().slice(0, 10);
      return dateStr === selectedDate;
    });
  }, [scheduledOps, selectedDate]);

  const sections = useMemo(() => {
    const result = [];
    if (filteredScheduled.length > 0) {
      result.push({ title: 'Programadas', data: filteredScheduled, type: 'scheduled' as const });
    }
    if (filteredLogs.length > 0) {
      result.push({ title: 'Historial', data: filteredLogs, type: 'log' as const });
    }
    return result;
  }, [filteredScheduled, filteredLogs]);

  const catalogMap = useMemo(() => {
    const m = new Map<string, string>();
    operationCatalog.forEach((op) => m.set(op.id, op.nombre));
    return m;
  }, [operationCatalog]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Sanidad</Text>
        {selectedDate && (
          <TouchableOpacity onPress={() => setSelectedDate(null)}>
            <Text style={styles.clearFilter}>Ver todo</Text>
          </TouchableOpacity>
        )}
      </View>

      <SanidadCalendar
        yearMonth={yearMonth}
        days={calendarDays}
        selectedDate={selectedDate}
        onDateSelect={(d) => setSelectedDate((prev) => (prev === d ? null : d))}
      />

      {sections.length === 0 ? (
        <EmptyState
          icon="💉"
          title="Sin operaciones"
          subtitle={selectedDate ? 'No hay operaciones para este día' : 'No hay operaciones registradas'}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item, section }) => {
            if (section.type === 'scheduled') {
              const op = item as ScheduledOperationModel;
              const name = catalogMap.get(op.operationId ?? '') ?? 'Operación';
              const dateStr = new Date(op.fechaProgramada).toLocaleDateString('es-AR');
              return (
                <View style={[styles.row, styles.rowScheduled]}>
                  <View style={styles.rowLeft}>
                    <Text style={styles.rowName}>{name}</Text>
                    <Text style={styles.rowMeta}>{dateStr}</Text>
                  </View>
                  <View style={[styles.badge, styles.badgeWarning]}>
                    <Text style={styles.badgeText}>Pendiente</Text>
                  </View>
                </View>
              );
            }

            const log = item as OperationLogModel;
            const name = catalogMap.get(log.operationId ?? '') ?? 'Operación';
            const dateStr = new Date(log.fechaAplicacion).toLocaleDateString('es-AR');
            return (
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <Text style={styles.rowName}>{name}</Text>
                  <Text style={styles.rowMeta}>{dateStr}{log.responsable ? ` · ${log.responsable}` : ''}</Text>
                </View>
                <View style={[styles.badge, styles.badgeSuccess]}>
                  <Text style={styles.badgeText}>OK</Text>
                </View>
              </View>
            );
          }}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

// ─── Container: connects WatermelonDB observables ────────────────────────────

const NINETY_DAYS_AGO = Date.now() - 90 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_AHEAD = Date.now() + 30 * 24 * 60 * 60 * 1000;

/**
 * SanidadContainer — connects SanidadView with live WatermelonDB observables.
 * Loads last 90 days of logs and next 30 days of scheduled ops.
 */
export const SanidadContainer = withObservables(
  [],
  () => ({
    operationLogs: database
      .get<OperationLogModel>('operation_logs')
      .query(Q.where('fecha_aplicacion', Q.gte(NINETY_DAYS_AGO)))
      .observe(),
    scheduledOps: database
      .get<ScheduledOperationModel>('scheduled_operations')
      .query(
        Q.where('fecha_programada', Q.lte(THIRTY_DAYS_AHEAD)),
        Q.where('estado', Q.notEq('DONE'))
      )
      .observe(),
    operationCatalog: database
      .get<OperationCatalogModel>('operations_catalog')
      .query()
      .observe(),
  })
)(SanidadView);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  clearFilter: {
    color: colors.primary,
    fontSize: typography.sizes.sm,
  },
  sectionHeader: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: spacing.touchTarget,
  },
  rowScheduled: {
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  rowLeft: { flex: 1 },
  rowName: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  rowMeta: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeSuccess: { backgroundColor: 'rgba(0,214,143,0.15)' },
  badgeWarning: { backgroundColor: 'rgba(245,158,11,0.15)' },
  badgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  list: { paddingBottom: spacing.xxl },
});
