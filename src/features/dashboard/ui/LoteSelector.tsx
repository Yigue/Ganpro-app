import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@theme/index';
import type LoteModel from '@data/models/LoteModel';

interface LoteSelectorProps {
  lotes: LoteModel[];
  selectedLoteId: string | null;
  onSelect: (id: string | null) => void;
}

/**
 * LoteSelector — horizontal chip bar to filter dashboard data by lote.
 */
export function LoteSelector({ lotes, selectedLoteId, onSelect }: LoteSelectorProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      <TouchableOpacity
        style={[styles.chip, selectedLoteId === null && styles.chipActive]}
        onPress={() => onSelect(null)}
      >
        <Text style={[styles.chipText, selectedLoteId === null && styles.chipTextActive]}>
          Todos
        </Text>
      </TouchableOpacity>
      {lotes.map((l) => (
        <TouchableOpacity
          key={l.id}
          style={[styles.chip, selectedLoteId === l.id && styles.chipActive]}
          onPress={() => onSelect(l.id)}
        >
          <Text style={[styles.chipText, selectedLoteId === l.id && styles.chipTextActive]}>
            {l.nombre}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
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
