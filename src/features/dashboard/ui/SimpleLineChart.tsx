import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EmptyState } from '@shared/components/EmptyState';
import { colors, spacing, typography } from '@theme/index';

interface GdpChartProps {
  /** Sorted weight data points for the GDP line chart */
  data: { x: number; y: number }[];
}

/**
 * SimpleLineChart — pure presentational dot-plot for GDP weight curve.
 * No external chart lib, renders absolute-positioned dots.
 */
export function SimpleLineChart({ data }: GdpChartProps) {
  if (data.length < 2) {
    return (
      <EmptyState
        icon="⚖️"
        title="Pocos pesajes"
        subtitle="Registrá al menos 2 pesajes para ver la curva GDP"
      />
    );
  }

  const CHART_H = 120;
  const maxY = Math.max(...data.map((d) => d.y));
  const minY = Math.min(...data.map((d) => d.y));
  const range = maxY - minY || 1;

  return (
    <View style={styles.container}>
      <View style={[styles.chart, { height: CHART_H }]}>
        {data.map((point, i) => {
          const xPct = i / (data.length - 1);
          const yPct = (point.y - minY) / range;
          return (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  left: `${xPct * 88 + 4}%` as `${number}%`,
                  bottom: yPct * (CHART_H - 24) + 8,
                },
              ]}
            />
          );
        })}
        <Text style={styles.maxLabel}>{maxY.toFixed(0)} kg</Text>
        <Text style={styles.minLabel}>{minY.toFixed(0)} kg</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.sm },
  chart: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    position: 'relative',
    paddingHorizontal: spacing.sm,
  },
  dot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  maxLabel: {
    position: 'absolute',
    top: 8,
    right: 8,
    color: colors.textDisabled,
    fontSize: typography.sizes.xs,
  },
  minLabel: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    color: colors.textDisabled,
    fontSize: typography.sizes.xs,
  },
});
