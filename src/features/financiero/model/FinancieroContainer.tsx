import React from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import withObservables from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '@shared/components/EmptyState';
import { ObservableErrorBoundary } from '@shared/components/ObservableErrorBoundary';
import { TrendBadge } from '@shared/components/TrendBadge';
import { colors, spacing, typography } from '@theme/index';
import { database } from '@data/database/database';
import {
  TIPO_MOVIMIENTO,
  CATEGORIA_MOVIMIENTO,
} from '@core/constants/sanidad';
import type MovimientoFinancieroModel from '@data/models/MovimientoFinancieroModel';
import type PrecioMercadoModel from '@data/models/PrecioMercadoModel';

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIA_META: Record<string, { icon: string; color: string }> = {
  SANIDAD: { icon: '💉', color: colors.warning },
  NUTRICION: { icon: '🌾', color: colors.primary },
  ALQUILER: { icon: '🏡', color: colors.info },
  VENTA: { icon: '💰', color: colors.primary },
  COMPRA: { icon: '🛒', color: '#C35BD0' },
  OTRO: { icon: '📋', color: colors.textSecondary },
};

const FILTER_OPTIONS = [null, ...Object.keys(CATEGORIA_MOVIMIENTO)] as (string | null)[];

// ─── MovimientoItem (pure presentational) ────────────────────────────────────

interface MovimientoItemProps {
  mov: MovimientoFinancieroModel;
}

/**
 * MovimientoItem — pure presentational row for a single financial movement.
 */
export function MovimientoItem({ mov }: MovimientoItemProps) {
  const meta = CATEGORIA_META[mov.categoria] ?? CATEGORIA_META.OTRO;
  const isGasto = mov.tipo === TIPO_MOVIMIENTO.GASTO;
  return (
    <View style={styles.movItem}>
      <View style={[styles.movIconCircle, { backgroundColor: `${meta.color}20` }]}>
        <Text style={styles.movIcon}>{meta.icon}</Text>
      </View>
      <View style={styles.movInfo}>
        <Text style={styles.movDesc}>{mov.descripcion || mov.categoria}</Text>
        <Text style={styles.movDate}>{new Date(mov.fecha).toLocaleDateString('es-AR')}</Text>
      </View>
      <Text style={[styles.movMonto, { color: isGasto ? colors.error : colors.primary }]}>
        {isGasto ? '-' : '+'}${mov.monto.toLocaleString('es-AR')}
      </Text>
    </View>
  );
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface FinancieroContainerOuterProps {
  filterCategoria: string | null;
  onFilterChange: (c: string | null) => void;
  onAdd: () => void;
  onEditPrecios: () => void;
  refreshing: boolean;
  onRefresh: () => void;
}

interface FinancieroContainerProps extends FinancieroContainerOuterProps {
  movimientos: MovimientoFinancieroModel[];
  ultimoPrecio: PrecioMercadoModel[];
}

// ─── Inner View ──────────────────────────────────────────────────────────────

function FinancieroView({
  movimientos,
  ultimoPrecio,
  filterCategoria,
  onFilterChange,
  onAdd,
  onEditPrecios,
  refreshing,
  onRefresh,
}: FinancieroContainerProps) {
  const precio = ultimoPrecio[0];

  const gastos = movimientos.filter((m) => m.tipo === TIPO_MOVIMIENTO.GASTO);
  const ingresos = movimientos.filter((m) => m.tipo === TIPO_MOVIMIENTO.INGRESO);
  const totalGastos = gastos.reduce((s, m) => s + m.monto, 0);
  const totalIngresos = ingresos.reduce((s, m) => s + m.monto, 0);
  const balance = totalIngresos - totalGastos;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Financiero</Text>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, styles.summaryGasto]}>
          <Text style={styles.summaryAmount}>${totalGastos.toLocaleString('es-AR')}</Text>
          <Text style={styles.summaryLabel}>Gastos</Text>
          <TrendBadge value={0} />
        </View>
        <View style={[styles.summaryCard, styles.summaryIngreso]}>
          <Text style={[styles.summaryAmount, { color: colors.primary }]}>
            ${totalIngresos.toLocaleString('es-AR')}
          </Text>
          <Text style={styles.summaryLabel}>Ingresos</Text>
          <TrendBadge value={0} />
        </View>
        <View style={[styles.summaryCard, { borderColor: balance >= 0 ? colors.primary : colors.error }]}>
          <Text style={[styles.summaryAmount, { color: balance >= 0 ? colors.primary : colors.error }]}>
            ${Math.abs(balance).toLocaleString('es-AR')}
          </Text>
          <Text style={styles.summaryLabel}>{balance >= 0 ? 'Superávit' : 'Déficit'}</Text>
          <TrendBadge value={0} />
        </View>
      </View>

      {/* Precio de mercado card */}
      <TouchableOpacity style={styles.precioCard} onPress={onEditPrecios} activeOpacity={0.8}>
        <View style={styles.precioInfo}>
          <Text style={styles.precioTitle}>Precios de Mercado</Text>
          {precio ? (
            <Text style={styles.precioValue}>
              Novillo: ${precio.novilloKg}/kg · Ternero: ${precio.terneroKg}/kg
            </Text>
          ) : (
            <Text style={styles.precioEmpty}>Tocá para cargar precios actuales</Text>
          )}
        </View>
        <Text style={styles.precioEdit}>✏️</Text>
      </TouchableOpacity>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FILTER_OPTIONS.map((cat) => {
          const meta = cat ? CATEGORIA_META[cat] : null;
          return (
            <TouchableOpacity
              key={cat ?? 'all'}
              style={[styles.filterChip, filterCategoria === cat && styles.filterChipActive]}
              onPress={() => onFilterChange(cat)}
            >
              {meta && <Text style={styles.filterChipIcon}>{meta.icon}</Text>}
              <Text style={[styles.filterChipText, filterCategoria === cat && styles.filterChipTextActive]}>
                {cat ?? 'Todos'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* List */}
      {movimientos.length === 0 ? (
        <EmptyState icon="💸" title="Sin movimientos" subtitle="Registrá gastos e ingresos" />
      ) : (
        <FlatList
          data={movimientos}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => (
            <ObservableErrorBoundary key={item.id}>
              <MovimientoItem mov={item} />
            </ObservableErrorBoundary>
          )}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
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

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={onAdd} activeOpacity={0.85}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ─── Container: connects WatermelonDB observables ─────────────────────────────

/**
 * FinancieroContainer — connects FinancieroView with live WatermelonDB observables.
 * Filters movimientos by categoria when provided.
 */
export const FinancieroContainer = withObservables(
  ['filterCategoria'],
  ({ filterCategoria }: FinancieroContainerOuterProps) => ({
    movimientos: (filterCategoria
      ? database
          .get<MovimientoFinancieroModel>('movimientos_financieros')
          .query(Q.where('categoria', filterCategoria), Q.sortBy('fecha', Q.desc), Q.take(100))
      : database
          .get<MovimientoFinancieroModel>('movimientos_financieros')
          .query(Q.sortBy('fecha', Q.desc), Q.take(100))
    ).observe(),
    ultimoPrecio: database
      .get<PrecioMercadoModel>('precios_mercado')
      .query(Q.sortBy('fecha', Q.desc), Q.take(1))
      .observe(),
  })
)(FinancieroView);

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  summaryGasto: { borderColor: `${colors.error}40` },
  summaryIngreso: { borderColor: `${colors.primary}40` },
  summaryAmount: {
    color: colors.error,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.heavy,
    fontVariant: ['tabular-nums'],
  },
  summaryLabel: { color: colors.textSecondary, fontSize: typography.sizes.xs, marginTop: 2 },
  precioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  precioInfo: { flex: 1 },
  precioTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  precioValue: { color: colors.textSecondary, fontSize: typography.sizes.xs, marginTop: 2 },
  precioEmpty: { color: colors.textDisabled, fontSize: typography.sizes.xs, marginTop: 2 },
  precioEdit: { fontSize: 18 },
  filterRow: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  filterChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryAlpha },
  filterChipIcon: { fontSize: 14 },
  filterChipText: { color: colors.textSecondary, fontSize: typography.sizes.sm },
  filterChipTextActive: { color: colors.primary, fontWeight: typography.weights.bold },
  list: { paddingBottom: spacing.xxl * 2 },
  separator: { height: 1, backgroundColor: colors.border },
  movItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    gap: spacing.md,
    minHeight: spacing.touchTarget,
  },
  movIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  movIcon: { fontSize: 20 },
  movInfo: { flex: 1 },
  movDesc: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
  },
  movDate: { color: colors.textDisabled, fontSize: typography.sizes.xs, marginTop: 2 },
  movMonto: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    fontVariant: ['tabular-nums'],
  },
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  fabText: {
    color: colors.background,
    fontSize: 28,
    fontWeight: typography.weights.bold,
    lineHeight: 32,
  },
});
