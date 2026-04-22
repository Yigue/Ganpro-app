import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@theme/index';
import type { CategoriaType } from '@core/constants/categories';
import { CATEGORIA } from '@core/constants/categories';

interface CategoryFilterBarProps {
  /** Active category filter; null means "All" */
  activeCategory: CategoriaType | null;
  /** Count per category, used for stat cards */
  counts: Record<string, number>;
  /** Callback when user selects a category chip */
  onSelect: (cat: CategoriaType | null) => void;
}

const ALL_CATEGORIES = [null, ...Object.values(CATEGORIA)] as (CategoriaType | null)[];

/**
 * Pure presentational component rendering:
 * 1. Horizontal stat cards (category counts)
 * 2. Horizontal filter chips (category filter)
 */
export function CategoryFilterBar({
  activeCategory,
  counts,
  onSelect,
}: CategoryFilterBarProps) {
  return (
    <>
      {/* Stat Cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statsRow}
      >
        {Object.values(CATEGORIA).map((cat) =>
          counts[cat] ? (
            <View key={cat} style={styles.statCard}>
              <Text style={[styles.statCount, { color: colors.category?.[cat] ?? colors.primary }]}>
                {counts[cat]}
              </Text>
              <Text style={styles.statLabel}>{cat}</Text>
            </View>
          ) : null
        )}
      </ScrollView>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {ALL_CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat ?? 'all'}
            style={[styles.chip, activeCategory === cat && styles.chipActive]}
            onPress={() => onSelect(cat)}
            accessibilityRole="button"
            accessibilityState={{ selected: activeCategory === cat }}
          >
            <Text
              style={[
                styles.chipText,
                activeCategory === cat && styles.chipTextActive,
              ]}
            >
              {cat ?? 'Todos'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    minWidth: 72,
  },
  statCount: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.heavy,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    marginTop: 2,
  },
  filterRow: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0,214,143,0.12)',
  },
  chipText: { color: colors.textSecondary, fontSize: typography.sizes.sm },
  chipTextActive: { color: colors.primary, fontWeight: typography.weights.bold },
});
