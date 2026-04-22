import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ObservableErrorBoundary } from '@shared/components/ObservableErrorBoundary';
import { EmptyState } from '@shared/components/EmptyState';
import withObservables from '@nozbe/with-observables';
import { FlatList } from 'react-native';
import { colors, spacing, typography } from '@theme/index';
import { database } from '@data/database/database';
import type LoteModel from '@data/models/LoteModel';

// ─── LoteCard (pure presentational) ─────────────────────────────────────────

interface LoteCardProps {
  lote: LoteModel;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * LoteCard — pure presentational card for a single potrero/lote row.
 */
export function LoteCard({ lote, onEdit, onDelete }: LoteCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{lote.nombre}</Text>
        {lote.ubicacion ? <Text style={styles.cardSub}>{lote.ubicacion}</Text> : null}
        <View style={styles.cardBadges}>
          {lote.hectareas != null && lote.hectareas > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{lote.hectareas} ha</Text>
            </View>
          ) : null}
          {lote.densidadCarga != null && lote.densidadCarga > 0 ? (
            <View style={[styles.badge, styles.badgeDensidad]}>
              <Text style={[styles.badgeText, styles.badgeTextDensidad]}>
                {lote.densidadCarga.toFixed(1)} an/ha
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={onEdit} activeOpacity={0.8}>
          <Text style={styles.actionBtnText}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.deleteBtn]}
          onPress={onDelete}
          activeOpacity={0.8}
        >
          <Text style={styles.actionBtnText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── LoteList (container with withObservables) ────────────────────────────────

interface LoteListOuterProps {
  onEdit: (lote: LoteModel) => void;
  onDelete: (lote: LoteModel) => void;
}

interface LoteListProps extends LoteListOuterProps {
  lotes: LoteModel[];
}

function LoteListInner({ lotes, onEdit, onDelete }: LoteListProps) {
  return lotes.length === 0 ? (
    <EmptyState
      icon="🌿"
      title="Sin potreros"
      subtitle="Creá el primer potrero para registrar animales"
    />
  ) : (
    <FlatList
      data={lotes}
      keyExtractor={(l) => l.id}
      renderItem={({ item }) => (
        <ObservableErrorBoundary key={item.id}>
          <LoteCard
            lote={item}
            onEdit={() => onEdit(item)}
            onDelete={() => onDelete(item)}
          />
        </ObservableErrorBoundary>
      )}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

/**
 * LoteList — container that observes the lotes collection from WatermelonDB.
 */
export const LoteList = withObservables([], () => ({
  lotes: database.get<LoteModel>('lotes').query().observe(),
}))(LoteListInner);

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  list: { paddingBottom: spacing.xxl },
  separator: { height: 1, backgroundColor: colors.border },
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
  cardBadges: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
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
  badgeDensidad: { backgroundColor: colors.infoAlpha },
  badgeTextDensidad: { color: colors.info },
  cardActions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: {
    width: spacing.touchTarget,
    height: spacing.touchTarget,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: { backgroundColor: colors.errorAlpha },
  actionBtnText: { fontSize: 20 },
});
