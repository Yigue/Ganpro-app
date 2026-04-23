import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ListRenderItemInfo,
} from 'react-native';
import { colors, spacing, typography } from '@theme/index';
import { type QueueItem } from '@store/scanStore';

interface SessionQueueViewProps {
  queue: QueueItem[];
  onClear: () => void;
  onProcess: () => void;
  onBulkRegister: () => void;
  onItemPress: (item: QueueItem) => void;
  ensureFocus: () => void;
}

function StatusIndicator({ status }: { status: QueueItem['status'] }) {
  if (status === 'loading') {
    return <ActivityIndicator size="small" color={colors.textDisabled} />;
  }

  const dotColor: Record<Exclude<QueueItem['status'], 'loading'>, string> = {
    pending: colors.success,
    pending_registration: colors.warning,
    processed: colors.textDisabled,
    processing: colors.info,
  };

  return (
    <View
      style={[styles.statusDot, { backgroundColor: dotColor[status as Exclude<QueueItem['status'], 'loading'>] }]}
    />
  );
}

function badgeText(item: QueueItem): string {
  switch (item.status) {
    case 'loading':
      return 'verificando';
    case 'pending':
      return item.categoria ?? 'registrado';
    case 'pending_registration':
      return 'nuevo';
    case 'processed':
      return '✓';
    case 'processing':
      return 'procesando';
  }
}

function badgeColor(status: QueueItem['status']): string {
  switch (status) {
    case 'loading':
      return colors.textDisabled;
    case 'pending':
      return colors.primary;
    case 'pending_registration':
      return colors.warning;
    case 'processed':
      return colors.textDisabled;
    case 'processing':
      return colors.info;
  }
}

function SessionQueueRow({
  item,
  onItemPress,
}: {
  item: QueueItem;
  onItemPress: (item: QueueItem) => void;
}) {
  const isInteractive = item.status !== 'loading';

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => onItemPress(item)}
      activeOpacity={isInteractive ? 0.8 : 1}
      disabled={!isInteractive}
      accessibilityRole="button"
      accessibilityLabel={`Animal ${item.rfid}`}
    >
      <StatusIndicator status={item.status} />
      <Text style={styles.rowRfid} numberOfLines={1} ellipsizeMode="middle">
        {item.rfid}
      </Text>
      {item.categoria != null && (
        <Text style={styles.rowCategoria} numberOfLines={1}>
          {item.categoria}
        </Text>
      )}
      <Text style={[styles.rowBadge, { color: badgeColor(item.status) }]}>
        {badgeText(item)}
      </Text>
    </TouchableOpacity>
  );
}

export function SessionQueueView({
  queue,
  onClear,
  onProcess,
  onBulkRegister,
  onItemPress,
  ensureFocus,
}: SessionQueueViewProps) {
  const unknownCount = queue.filter(i => i.status === 'pending_registration').length;
  const knownCount = queue.filter(i => i.animalId != null).length;

  function renderItem({ item }: ListRenderItemInfo<QueueItem>) {
    return <SessionQueueRow item={item} onItemPress={onItemPress} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sesion Activa</Text>
        <Text style={styles.count}>{queue.length} animales</Text>
      </View>

      {queue.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📡</Text>
          <Text style={styles.emptyText}>Escaneando...</Text>
          <Text style={styles.emptySubtext}>
            Los animales aparecen aqui al leerlos
          </Text>
        </View>
      ) : (
        <FlatList
          data={queue}
          keyExtractor={(item) => item.rfid}
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
            onPress={() => { onClear(); ensureFocus(); }}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Limpiar cola"
          >
            <Text style={styles.clearBtnText}>Limpiar</Text>
          </TouchableOpacity>

          {unknownCount > 0 && (
            <TouchableOpacity
              style={styles.bulkRegBtn}
              onPress={() => { onBulkRegister(); ensureFocus(); }}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Registrar ${unknownCount} animales nuevos`}
            >
              <Text style={styles.bulkRegBtnText}>
                🏷️  REGISTRAR {unknownCount} NUEVO{unknownCount !== 1 ? 'S' : ''}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.processBtn, knownCount === 0 && styles.processBtnDisabled]}
            onPress={() => { onProcess(); ensureFocus(); }}
            disabled={knownCount === 0}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Procesar lote de ${knownCount} animales`}
          >
            <Text style={styles.processBtnText}>
              PROCESAR LOTE ({knownCount})
            </Text>
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
    minHeight: 44,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  rowRfid: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
  rowCategoria: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  rowBadge: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
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
  processBtnDisabled: { opacity: 0.4 },
  processBtnText: {
    color: colors.textOnPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.heavy,
    letterSpacing: 2,
  },
  bulkRegBtn: {
    backgroundColor: colors.warning,
    borderRadius: 16,
    height: spacing.touchTargetLg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulkRegBtnText: {
    color: colors.background,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.heavy,
    letterSpacing: 1,
  },
});
