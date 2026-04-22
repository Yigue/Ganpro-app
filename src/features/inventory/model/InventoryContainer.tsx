import React, { useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import withObservables from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';
import { ObservableErrorBoundary } from '@shared/components/ObservableErrorBoundary';
import { EmptyState } from '@shared/components/EmptyState';
import { colors, spacing, typography } from '@theme/index';
import { AnimalListItem } from '../ui/AnimalListItem';
import { CategoryFilterBar } from '../ui/CategoryFilterBar';
import { database } from '@data/database/database';
import type AnimalModel from '@data/models/AnimalModel';
import type { CategoriaType } from '@core/constants/categories';

// ─── Types ──────────────────────────────────────────────────────────────────

interface InventoryContainerOuterProps {
  filterCategory: CategoriaType | null;
  onFilterChange: (cat: CategoriaType | null) => void;
  onAnimalPress: (animal: AnimalModel) => void;
  refreshing: boolean;
  onRefresh: () => void;
}

interface InventoryContainerProps extends InventoryContainerOuterProps {
  animals: AnimalModel[];
  allAnimals: AnimalModel[];
}

// ─── Inner Component (receives injected observables) ────────────────────────

function InventoryView({
  animals,
  allAnimals,
  filterCategory,
  onFilterChange,
  onAnimalPress,
  refreshing,
  onRefresh,
}: InventoryContainerProps) {
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    allAnimals.forEach((a) => {
      c[a.categoria] = (c[a.categoria] ?? 0) + 1;
    });
    return c;
  }, [allAnimals]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Inventario</Text>
        <Text style={styles.subtitle}>{allAnimals.length} animales activos</Text>
      </View>

      {/* Stats + Filter (pure UI, no side-effects) */}
      <CategoryFilterBar
        activeCategory={filterCategory}
        counts={counts}
        onSelect={onFilterChange}
      />

      {/* List */}
      {animals.length === 0 ? (
        <EmptyState
          icon="🐄"
          title="Sin animales"
          subtitle={
            filterCategory
              ? `No hay ${filterCategory}s activos`
              : 'Registre el primer animal escaneando una caravana'
          }
        />
      ) : (
        <FlatList
          data={animals}
          keyExtractor={(a) => a.id}
          renderItem={({ item }) => (
            <ObservableErrorBoundary key={item.id}>
              <AnimalListItem animal={item} onPress={onAnimalPress} />
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
    </SafeAreaView>
  );
}

// ─── Container: connects WatermelonDB observables ────────────────────────────

/**
 * InventoryContainer — wraps InventoryView with live WatermelonDB observables.
 * Reacts reactively to filter changes without additional fetches.
 */
export const InventoryContainer = withObservables(
  ['filterCategory'],
  ({ filterCategory }: InventoryContainerOuterProps) => ({
    animals: (filterCategory
      ? database
          .get<AnimalModel>('animals')
          .query(Q.where('estado', 'ACTIVO'), Q.where('categoria', filterCategory))
      : database.get<AnimalModel>('animals').query(Q.where('estado', 'ACTIVO'))
    ).observe(),
    allAnimals: database
      .get<AnimalModel>('animals')
      .query(Q.where('estado', 'ACTIVO'))
      .observe(),
  })
)(InventoryView);

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
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    marginTop: 2,
  },
  list: { paddingBottom: spacing.xxl },
  separator: { height: 1, backgroundColor: colors.border },
});
