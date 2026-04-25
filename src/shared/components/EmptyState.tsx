import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@theme/index';

interface Props {
  icon?: string;
  title: string;
  subtitle?: string;
}

import { Ionicons } from '@expo/vector-icons';

export function EmptyState({ icon = '🐄', title, subtitle }: Props) {
  const isIonicon = icon.length > 2;
  return (
    <View style={styles.container}>
      {isIonicon ? (
        <Ionicons name={icon as any} size={64} color={colors.textSecondary} />
      ) : (
        <Text style={styles.icon}>{icon}</Text>
      )}
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  icon: { fontSize: 64 },
  title: {
    color: colors.textPrimary,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.md,
    textAlign: 'center',
  },
});
