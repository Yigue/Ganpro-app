import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@theme/index';

interface Props {
  count: number;
  categoria: string;
  loteNombre: string;
  onPress: () => void;
  isBulkSelect: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
}

export const GenericGroupCard: React.FC<Props> = ({
  count,
  categoria,
  loteNombre,
  onPress,
  isBulkSelect,
  isSelected,
  onToggleSelect,
}) => {
  return (
    <TouchableOpacity
      style={[styles.card, isSelected && styles.cardSelected]}
      activeOpacity={0.7}
      onPress={() => isBulkSelect ? onToggleSelect() : onPress()}
    >
      <View style={styles.content}>
        {isBulkSelect && (
          <View style={styles.checkbox}>
            <Ionicons
              name={isSelected ? "checkbox" : "square-outline"}
              size={24}
              color={isSelected ? colors.primary : colors.textSecondary}
            />
          </View>
        )}
        <View style={styles.main}>
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Ionicons name="copy-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.title}>{count}x {categoria}</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Sin Identificar</Text>
            </View>
          </View>
          <View style={styles.footer}>
            <Ionicons name="location-sharp" size={14} color={colors.textSecondary} />
            <Text style={styles.footerText}>Lote: {loteNombre}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0,214,143,0.05)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    marginRight: spacing.md,
  },
  main: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  badge: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
});
