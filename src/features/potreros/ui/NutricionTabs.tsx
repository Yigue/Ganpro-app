import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { ObservableErrorBoundary } from '@shared/components/ObservableErrorBoundary';
import { EmptyState } from '@shared/components/EmptyState';
import { Button } from '@shared/components/Button';
import withObservables from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';
import { colors, spacing, typography } from '@theme/index';
import { database } from '@data/database/database';
import type RacionModel from '@data/models/RacionModel';
import type CondicionCorporalModel from '@data/models/CondicionCorporalModel';

// ─── RacionCard ───────────────────────────────────────────────────────────────

function RacionCard({ racion }: { racion: RacionModel }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{racion.kgDiaAnimal} kg/día/animal</Text>
        <Text style={styles.cardSub}>Lote ID: {racion.loteId.slice(0, 8)}…</Text>
        {racion.notas ? <Text style={styles.cardSub}>{racion.notas}</Text> : null}
      </View>
      <View style={[styles.badge, styles.badgeActive]}>
        <Text style={[styles.badgeText, styles.badgeTextActive]}>ACTIVA</Text>
      </View>
    </View>
  );
}

// ─── RacionTab (container) ────────────────────────────────────────────────────

interface RacionTabOuterProps {
  onAdd: () => void;
}
interface RacionTabProps extends RacionTabOuterProps {
  raciones: RacionModel[];
}

function RacionTabInner({ raciones, onAdd }: RacionTabProps) {
  return (
    <>
      <View style={styles.tabHeader}>
        <Text style={styles.tabSubtitle}>{raciones.length} raciones activas</Text>
        <Button label="+ Nueva" onPress={onAdd} size="sm" />
      </View>
      {raciones.length === 0 ? (
        <EmptyState icon="🌾" title="Sin raciones" subtitle="Asigná raciones a los potreros" />
      ) : (
        <FlatList
          data={raciones}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => (
            <ObservableErrorBoundary key={item.id}>
              <RacionCard racion={item} />
            </ObservableErrorBoundary>
          )}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </>
  );
}

/**
 * RacionTab — container that observes active raciones from WatermelonDB.
 */
export const RacionTab = withObservables(['onAdd'], () => ({
  raciones: database
    .get<RacionModel>('raciones')
    .query(Q.where('activa', true))
    .observe(),
}))(RacionTabInner);

// ─── CCCard ───────────────────────────────────────────────────────────────────

function CCCard({ registro }: { registro: CondicionCorporalModel }) {
  const scoreColor =
    registro.score <= 3
      ? colors.error
      : registro.score <= 6
      ? colors.warning
      : colors.primary;

  return (
    <View style={styles.card}>
      <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
        <Text style={[styles.scoreText, { color: scoreColor }]}>{registro.score}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>Score CC: {registro.score}/9</Text>
        <Text style={styles.cardSub}>
          {new Date(registro.fecha).toLocaleDateString('es-AR')}
          {registro.evaluador ? ` · ${registro.evaluador}` : ''}
        </Text>
        {registro.notas ? <Text style={styles.cardSub}>{registro.notas}</Text> : null}
      </View>
    </View>
  );
}

// ─── CCTab (container) ────────────────────────────────────────────────────────

interface CCTabOuterProps {
  onAdd: () => void;
}
interface CCTabProps extends CCTabOuterProps {
  registros: CondicionCorporalModel[];
}

function CCTabInner({ registros, onAdd }: CCTabProps) {
  return (
    <>
      <View style={styles.tabHeader}>
        <Text style={styles.tabSubtitle}>{registros.length} registros</Text>
        <Button label="+ CC" onPress={onAdd} size="sm" />
      </View>
      {registros.length === 0 ? (
        <EmptyState
          icon="📊"
          title="Sin registros CC"
          subtitle="Registrá la condición corporal del lote"
        />
      ) : (
        <FlatList
          data={registros}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => (
            <ObservableErrorBoundary key={item.id}>
              <CCCard registro={item} />
            </ObservableErrorBoundary>
          )}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </>
  );
}

/**
 * CCTab — container that observes condicion_corporal from WatermelonDB.
 */
export const CCTab = withObservables(['onAdd'], () => ({
  registros: database
    .get<CondicionCorporalModel>('condicion_corporal')
    .query(Q.sortBy('fecha', Q.desc), Q.take(50))
    .observe(),
}))(CCTabInner);

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  list: { paddingBottom: spacing.xxl },
  separator: { height: 1, backgroundColor: colors.border },
  tabHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  tabSubtitle: { color: colors.textSecondary, fontSize: typography.sizes.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    minHeight: spacing.touchTarget,
  },
  cardInfo: { flex: 1 },
  cardName: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  cardSub: { color: colors.textSecondary, fontSize: typography.sizes.sm, marginTop: 2 },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: colors.surfaceElevated,
  },
  badgeText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  badgeActive: { backgroundColor: colors.primaryAlpha },
  badgeTextActive: { color: colors.primary, fontWeight: typography.weights.bold },
  scoreCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: { fontSize: typography.sizes.lg, fontWeight: typography.weights.heavy },
});
