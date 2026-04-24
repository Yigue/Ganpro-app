import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@theme/index';

export interface PieSlice {
  label: string;
  value: number;
  color: string;
}

interface SimplePieChartProps {
  data: PieSlice[];
}

/**
 * SimplePieChart — gráfico de distribución horizontal segmentado.
 * Implementado con Views/Flexbox, sin librerías externas de gráficos.
 * Muestra una barra segmentada proporcional con leyenda debajo.
 */
export function SimplePieChart({ data }: SimplePieChartProps) {
  const total = data.reduce((sum, s) => sum + s.value, 0);

  if (total === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Sin animales registrados</Text>
      </View>
    );
  }

  const slices = data.filter((s) => s.value > 0);

  return (
    <View style={styles.container}>
      {/* Barra segmentada */}
      <View style={styles.barRow}>
        {slices.map((slice, i) => {
          const pct = (slice.value / total) * 100;
          return (
            <View
              key={slice.label}
              style={[
                styles.barSegment,
                {
                  flex: slice.value,
                  backgroundColor: slice.color,
                  borderTopLeftRadius: i === 0 ? 6 : 0,
                  borderBottomLeftRadius: i === 0 ? 6 : 0,
                  borderTopRightRadius: i === slices.length - 1 ? 6 : 0,
                  borderBottomRightRadius: i === slices.length - 1 ? 6 : 0,
                },
              ]}
            >
              {pct >= 10 && (
                <Text style={styles.segmentPct}>{pct.toFixed(0)}%</Text>
              )}
            </View>
          );
        })}
      </View>

      {/* Leyenda en grilla */}
      <View style={styles.legend}>
        {slices.map((slice) => {
          const pct = ((slice.value / total) * 100).toFixed(1);
          return (
            <View key={slice.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
              <Text style={styles.legendLabel}>{slice.label}</Text>
              <Text style={styles.legendValue}>{slice.value}</Text>
              <Text style={styles.legendPct}>({pct}%)</Text>
            </View>
          );
        })}
      </View>

      {/* Total */}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>{total} cabezas</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  emptyContainer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
  },
  barRow: {
    flexDirection: 'row',
    height: 32,
    borderRadius: 6,
    overflow: 'hidden',
    gap: 1,
  },
  barSegment: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 4,
  },
  segmentPct: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: 'rgba(0,0,0,0.7)',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: '48%',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    flex: 1,
  },
  legendValue: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    fontVariant: ['tabular-nums'],
  },
  legendPct: {
    color: colors.textDisabled,
    fontSize: typography.sizes.xs,
    fontVariant: ['tabular-nums'],
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  totalValue: {
    color: colors.primary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    fontVariant: ['tabular-nums'],
  },
});
