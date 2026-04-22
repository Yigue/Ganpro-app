import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type AnimalModel from '@data/models/AnimalModel';
import { StatusBadge } from '@shared/components/StatusBadge';
import { colors, spacing, typography } from '@theme/index';
import type { CategoriaType } from '@core/constants/categories';

interface AnimalListItemProps {
  /** Animal record from WatermelonDB */
  animal: AnimalModel;
  /** Callback when the item is pressed */
  onPress?: (animal: AnimalModel) => void;
}

/**
 * Pure presentational component for a single animal row in the inventory list.
 * Renders caravana ID, sex label, and categoria badge.
 */
export function AnimalListItem({ animal, onPress }: AnimalListItemProps) {
  const sexoLabel = animal.sexo === 'M' ? 'Macho' : 'Hembra';

  return (
    <View style={styles.container}>
      <View style={styles.info}>
        <Text style={styles.caravana} numberOfLines={1}>
          {animal.idCaravana}
        </Text>
        <Text style={styles.meta}>
          {sexoLabel}
          {animal.raza ? ` · ${animal.raza}` : ''}
        </Text>
      </View>
      <StatusBadge
        label={animal.categoria}
        categoria={animal.categoria as CategoriaType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    minHeight: spacing.touchTarget,
  },
  info: { flex: 1, marginRight: spacing.sm },
  caravana: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    fontVariant: ['tabular-nums'],
  },
  meta: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    marginTop: 2,
  },
});
