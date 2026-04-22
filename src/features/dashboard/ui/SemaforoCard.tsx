import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@theme/index';

type Status = 'green' | 'yellow' | 'red' | 'gray';

interface SemaforoCardProps {
  title: string;
  value: string;
  status: Status;
}

const STATUS_COLOR: Record<Status, string> = {
  green: colors.primary,
  yellow: colors.warning,
  red: colors.error,
  gray: colors.textDisabled,
};

/**
 * SemaforoCard — pure KPI card with color-coded status indicator.
 * Used in Dashboard for GDP, mortalidad, precio de mercado.
 */
export function SemaforoCard({ title, value, status }: SemaforoCardProps) {
  const color = STATUS_COLOR[status];

  return (
    <View style={[styles.card, { borderColor: `${color}40` }]}>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  value: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.heavy,
    fontVariant: ['tabular-nums'],
  },
  title: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
    marginTop: 4,
  },
});
