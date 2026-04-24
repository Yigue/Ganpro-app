import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, spacing, typography } from '@theme/index';

export interface BarChartMonth {
  label: string;   // ej: "Nov", "Dic"
  ingresos: number;
  egresos: number;
}

interface BarChartProps {
  data: BarChartMonth[];
  maxBarHeight?: number;
}

/**
 * BarChart — gráfico de barras dobles (Ingresos vs Egresos) por mes.
 * Implementado con Views/Flexbox proporcionales al máximo del período.
 * Sin librerías externas de gráficos.
 */
export function BarChart({ data, maxBarHeight = 100 }: BarChartProps) {
  if (data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Sin movimientos financieros</Text>
      </View>
    );
  }

  const maxValue = Math.max(
    ...data.map((d) => Math.max(d.ingresos, d.egresos)),
    1
  );

  const formatAmount = (n: number): string => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n.toFixed(0)}`;
  };

  return (
    <View style={styles.container}>
      {/* Eje Y – referencia */}
      <View style={styles.yAxis}>
        <Text style={styles.yLabel}>{formatAmount(maxValue)}</Text>
        <Text style={styles.yLabel}>{formatAmount(maxValue / 2)}</Text>
        <Text style={styles.yLabel}>$0</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.barsScroll}
      >
        {data.map((month) => {
          const ingresoH = (month.ingresos / maxValue) * maxBarHeight;
          const egresoH = (month.egresos / maxValue) * maxBarHeight;

          return (
            <View key={month.label} style={styles.monthGroup}>
              {/* Barras */}
              <View style={[styles.barsContainer, { height: maxBarHeight }]}>
                {/* Ingreso */}
                <View style={styles.barWrapper}>
                  {month.ingresos > 0 && (
                    <View
                      style={[
                        styles.bar,
                        styles.barIngreso,
                        { height: ingresoH },
                      ]}
                    />
                  )}
                </View>
                {/* Egreso */}
                <View style={styles.barWrapper}>
                  {month.egresos > 0 && (
                    <View
                      style={[
                        styles.bar,
                        styles.barEgreso,
                        { height: egresoH },
                      ]}
                    />
                  )}
                </View>
              </View>
              {/* Label mes */}
              <Text style={styles.monthLabel}>{month.label}</Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Leyenda */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendText}>Ingresos</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.error }]} />
          <Text style={styles.legendText}>Egresos</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
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
  yAxis: {
    height: 120,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: 20, // altura del label mes
  },
  yLabel: {
    color: colors.textDisabled,
    fontSize: typography.sizes.xs,
    fontVariant: ['tabular-nums'],
  },
  barsScroll: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-end',
    paddingRight: spacing.sm,
  },
  monthGroup: {
    alignItems: 'center',
    gap: 4,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  barWrapper: {
    width: 14,
    justifyContent: 'flex-end',
  },
  bar: {
    width: 14,
    borderRadius: 3,
    minHeight: 3,
  },
  barIngreso: {
    backgroundColor: colors.primary,
  },
  barEgreso: {
    backgroundColor: colors.error,
  },
  monthLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
  },
  legend: {
    position: 'absolute',
    top: 0,
    right: 0,
    gap: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
  },
});
