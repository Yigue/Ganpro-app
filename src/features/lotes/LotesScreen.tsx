import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import withObservables from '@nozbe/with-observables';
import { useDatabase } from '@shared/hooks/useDatabase';
import { useHapticFeedback } from '@shared/hooks/useHapticFeedback';
import { Button } from '@shared/components/Button';
import { EmptyState } from '@shared/components/EmptyState';
import { ObservableErrorBoundary } from '@shared/components/ObservableErrorBoundary';
import { colors, spacing, typography } from '@theme/index';
import type LoteModel from '@data/models/LoteModel';
import { database } from '@data/database/database';
import { LoteFormModal } from './LoteFormModal';

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
      title="Sin lotes"
      subtitle="Creá el primer lote para poder registrar animales"
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

const LoteListWithData = withObservables([], () => ({
  lotes: database.get<LoteModel>('lotes').query().observe(),
}))(LoteListInner);

export function LotesScreen() {
  const database = useDatabase();
  const { triggerHeavy } = useHapticFeedback();
  const [showModal, setShowModal] = useState(false);
  const [editingLote, setEditingLote] = useState<LoteModel | null>(null);

  const handleDelete = useCallback(
    (lote: LoteModel) => {
      Alert.alert(
        'Eliminar Lote',
        `¿Eliminar "${lote.nombre}"? Los animales asignados quedarán sin lote.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: () => {
              triggerHeavy();
              void database.write(() => lote.destroyPermanently());
            },
          },
        ]
      );
    },
    [database, triggerHeavy]
  );

  const handleEdit = useCallback((lote: LoteModel) => {
    setEditingLote(lote);
    setShowModal(true);
  }, []);

  return (
    <ObservableErrorBoundary fallbackTitle="Error al cargar lotes">
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Lotes</Text>
          <Button
            label="+ Nuevo"
            onPress={() => {
              setEditingLote(null);
              setShowModal(true);
            }}
            size="sm"
            style={styles.newButton}
          />
        </View>

        <LoteListWithData onEdit={handleEdit} onDelete={handleDelete} />

        <LoteFormModal
          visible={showModal}
          lote={editingLote}
          onClose={() => {
            setShowModal(false);
            setEditingLote(null);
          }}
        />
      </SafeAreaView>
    </ObservableErrorBoundary>
  );
}

function LoteCard({
  lote,
  onEdit,
  onDelete,
}: {
  lote: LoteModel;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{lote.nombre}</Text>
        {lote.ubicacion ? (
          <Text style={styles.cardUbicacion}>{lote.ubicacion}</Text>
        ) : null}
        {lote.descripcion ? (
          <Text style={styles.cardDesc}>{lote.descripcion}</Text>
        ) : null}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  newButton: { paddingHorizontal: spacing.md },
  list: { paddingBottom: spacing.xxl },
  separator: { height: 1, backgroundColor: colors.border },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: spacing.touchTarget,
  },
  cardInfo: { flex: 1 },
  cardName: {
    color: colors.textPrimary,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  cardUbicacion: {
    color: colors.primary,
    fontSize: typography.sizes.sm,
    marginTop: 2,
  },
  cardDesc: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    width: spacing.touchTarget,
    height: spacing.touchTarget,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: { backgroundColor: 'rgba(255,61,113,0.15)' },
  actionBtnText: { fontSize: 20 },
});
