import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@theme/index';

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  color?: string;
  trend?: 'up' | 'down' | 'flat';
}

/**
 * KPICard — tarjeta de métrica principal para el Dashboard Operativo.
 * Muestra icono, valor principal, título y tendencia opcional.
 */
export function KPICard({ title, value, subtitle, iconName, color = colors.primary, trend }: KPICardProps) {
  const trendIcon: React.ComponentProps<typeof Ionicons>['name'] | null =
    trend === 'up' ? 'trending-up-outline'
    : trend === 'down' ? 'trending-down-outline'
    : trend === 'flat' ? 'remove-outline'
    : null;

  const trendColor =
    trend === 'up' ? colors.primary
    : trend === 'down' ? colors.error
    : colors.textSecondary;

  return (
    <View style={[styles.card, { borderColor: `${color}30` }]}>
      <View style={[styles.iconContainer, { backgroundColor: `${color}18` }]}>
        <Ionicons name={iconName} size={20} color={color} />
      </View>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle != null && (
        <Text style={styles.subtitle}>{subtitle}</Text>
      )}
      {trendIcon != null && (
        <View style={styles.trendRow}>
          <Ionicons name={trendIcon} size={12} color={trendColor} />
        </View>
      )}
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
    gap: 4,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  value: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.heavy,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  title: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textDisabled,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
});
