import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@theme/index';
import type { CategoriaType } from '@core/constants/categories';

interface Props {
  label: string;
  categoria?: CategoriaType;
  color?: string;
}

export function StatusBadge({ label, categoria, color }: Props) {
  const badgeColor =
    color ??
    (categoria ? colors.category[categoria] : colors.textSecondary);

  return (
    <View style={[styles.badge, { borderColor: badgeColor }]}>
      <Text style={[styles.text, { color: badgeColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  text: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
