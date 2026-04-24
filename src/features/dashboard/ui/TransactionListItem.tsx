import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { colors, spacing, typography } from '@theme/index';
import type MovimientoFinancieroModel from '@data/models/MovimientoFinancieroModel';

interface TransactionListItemProps {
  transaction: MovimientoFinancieroModel;
}

/**
 * TransactionListItem — fila de movimiento financiero.
 * Verde para INGRESO, rojo para GASTO.
 */
export function TransactionListItem({ transaction }: TransactionListItemProps) {
  const isIngreso = transaction.tipo === 'INGRESO';
  const color = isIngreso ? colors.primary : colors.error;
  const iconName: React.ComponentProps<typeof Ionicons>['name'] = isIngreso
    ? 'arrow-up-circle-outline'
    : 'arrow-down-circle-outline';

  const formatMonto = (n: number): string => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n.toFixed(0)}`;
  };

  const fechaLabel = transaction.fecha
    ? format(new Date(transaction.fecha), "d MMM yyyy", { locale: es })
    : '—';

  return (
    <View style={styles.row}>
      {/* Icono */}
      <View style={[styles.iconContainer, { backgroundColor: isIngreso ? colors.primaryAlpha : colors.errorAlpha }]}>
        <Ionicons name={iconName} size={20} color={color} />
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.descripcion} numberOfLines={1}>
          {transaction.descripcion?.trim().length ? transaction.descripcion : transaction.categoria}
        </Text>
        <Text style={styles.meta}>
          {transaction.categoria} · {fechaLabel}
        </Text>
      </View>

      {/* Monto */}
      <Text style={[styles.monto, { color }]}>
        {isIngreso ? '+' : '-'}{formatMonto(transaction.monto)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  descripcion: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  meta: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
  },
  monto: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    fontVariant: ['tabular-nums'],
  },
});
