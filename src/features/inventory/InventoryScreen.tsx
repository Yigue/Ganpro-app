import React, { useState, useMemo } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import withObservables from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';
import { StatusBadge } from '@shared/components/StatusBadge';
import { EmptyState } from '@shared/components/EmptyState';
import { ObservableErrorBoundary } from '@shared/components/ObservableErrorBoundary';
import { colors, spacing, typography } from '@theme/index';
import {
  CATEGORIA,
  type CategoriaType,
} from '@core/constants/categories';
import type AnimalModel from '@data/models/AnimalModel';
import { database } from '@data/database/database';

const ALL_CATEGORIES = [null, ...Object.values(CATEGORIA)] as (CategoriaType | null)[];

interface InventoryListOuterProps {
  filterCategory: CategoriaType | null;
  onFilterChange: (cat: CategoriaType | null) => void;
}

interface InventoryListProps extends InventoryListOuterProps {
  animals: AnimalModel[];
  allAnimals: AnimalModel[];
}

function InventoryListInner({
  animals,
  allAnimals,
  filterCategory,
  onFilterChange,
}: InventoryListProps) {
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    allAnimals.forEach((a) => {
      c[a.categoria] = (c[a.categoria] ?? 0) + 1;
    });
    return c;
  }, [allAnimals]);

  return (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>Inventario</Text>
        <Text style={styles.subtitle}>{animals.length} animales activos</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statsRow}
      >
        {Object.values(CATEGORIA).map((cat) =>
          counts[cat] ? (
            <View key={cat} style={styles.statCard}>
              <Text style={[styles.statCount, { color: colors.category[cat] }]}>
                {counts[cat]}
              </Text>
              <Text style={styles.statLabel}>{cat}</Text>
            </View>
          ) : null
        )}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {ALL_CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat ?? 'all'}
            style={[styles.filterChip, filterCategory === cat && styles.filterChipActive]}
            onPress={() => onFilterChange(cat)}
          >
            <Text
              style={[
                styles.filterChipText,
                filterCategory === cat && styles.filterChipTextActive,
              ]}
            >
              {cat ?? 'Todos'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

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
              <AnimalListItem animal={item} />
            </ObservableErrorBoundary>
          )}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </>
  );
}

const InventoryListWithData = withObservables(
  ['filterCategory'],
  ({ filterCategory }: InventoryListOuterProps) => ({
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
)(InventoryListInner);

export function InventoryScreen() {
  const [filterCategory, setFilterCategory] = useState<CategoriaType | null>(null);

  return (
    <ObservableErrorBoundary fallbackTitle="Error al cargar inventario">
      <SafeAreaView style={styles.container} edges={['top']}>
        <InventoryListWithData
          filterCategory={filterCategory}
          onFilterChange={setFilterCategory}
        />
      </SafeAreaView>
    </ObservableErrorBoundary>
  );
}

function AnimalListItem({ animal }: { animal: AnimalModel }) {
  return (
    <View style={styles.animalItem}>
      <View style={styles.animalInfo}>
        <Text style={styles.animalRfid}>{animal.idCaravana}</Text>
        <Text style={styles.animalMeta}>
          {animal.sexo === 'M' ? 'Macho' : 'Hembra'}
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
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterChipActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0,214,143,0.12)',
  },
  filterChipText: { color: colors.textSecondary, fontSize: typography.sizes.sm },
  filterChipTextActive: { color: colors.primary, fontWeight: typography.weights.bold },
  list: { paddingBottom: spacing.xxl },
  animalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    minHeight: spacing.touchTarget,
  },
  animalInfo: { flex: 1 },
  animalRfid: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    fontVariant: ['tabular-nums'],
  },
  animalMeta: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    marginTop: 2,
  },
  separator: { height: 1, backgroundColor: colors.border },
});
