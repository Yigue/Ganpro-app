import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ListRenderItemInfo,
} from 'react-native';
import { colors, spacing, typography } from '@theme/index';

interface BatchQueueItem {
  rfid: string;
  animalId?: string;
}

interface BatchModeViewProps {
  queue: BatchQueueItem[];
  onClear: () => void;
  onProcess: () => void;
  ensureFocus: () => void;
}

function QueueRow({ item }: { item: BatchQueueItem }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowRfid} numberOfLines={1} ellipsizeMode="middle">
        {item.rfid}
      </Text>
      <View style={[styles.rowBadge, item.animalId ? styles.rowBadgeFound : styles.rowBadgeMissing]}>
        <Text style={[styles.rowBadgeText, item.animalId ? styles.rowBadgeTextFound : styles.rowBadgeTextMissing]}>
          {item.animalId ? 'registrado' : 'nuevo'}
        </Text>
      </View>
    </View>
  );
}

export function BatchModeView({ queue, onClear, onProcess, ensureFocus }: BatchModeViewProps) {
  function renderItem({ item }: ListRenderItemInfo<BatchQueueItem>) {
    return <QueueRow item={item} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Modo Lote</Text>
        <Text style={styles.count}>
          {queue.length} {queue.length === 1 ? 'animal escaneado' : 'animales escaneados'}
        </Text>
      </View>

      {queue.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📡</Text>
          <Text style={styles.emptyText}>Esperando escaneos...</Text>
          <Text style={styles.emptySubtext}>
            Acerque el lector a los aretes para agregar animales a la cola
          </Text>
        </View>
      ) : (
        <FlatList
          data={queue}
          keyExtractor={(item, index) => `${item.rfid}-${index}`}
          renderItem={renderItem}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {queue.length > 0 && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => {
              onClear();
              ensureFocus();
            }}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Limpiar cola"
          >
            <Text style={styles.clearBtnText}>Limpiar cola</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.processBtn}
            onPress={() => {
              onProcess();
              ensureFocus();
            }}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Procesar ${queue.length} animales`}
          >
            <Text style={styles.processBtnText}>PROCESAR ({queue.length})</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  count: {
    color: colors.primary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    fontVariant: ['tabular-nums'],
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
  },
  emptySubtext: {
    color: colors.textDisabled,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: spacing.xs,
    paddingBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  rowRfid: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
  rowBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  rowBadgeFound: {
    backgroundColor: colors.primaryAlpha,
    borderColor: colors.primary,
  },
  rowBadgeMissing: {
    backgroundColor: colors.warningAlpha,
    borderColor: colors.warning,
  },
  rowBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  rowBadgeTextFound: {
    color: colors.primary,
  },
  rowBadgeTextMissing: {
    color: colors.warning,
  },
  actions: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  clearBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.error,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: {
    color: colors.error,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  processBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    height: spacing.touchTargetLg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processBtnText: {
    color: colors.textOnPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.heavy,
    letterSpacing: 2,
  },
});
