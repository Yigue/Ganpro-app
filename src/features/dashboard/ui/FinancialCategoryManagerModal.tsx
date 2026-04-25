import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@theme/index';
import { database } from '@data/database/database';
import FinancialCategoryModel from '@data/models/FinancialCategoryModel';

interface FinancialCategoryManagerModalProps {
  visible: boolean;
  onClose: () => void;
  categories: FinancialCategoryModel[];
}

export function FinancialCategoryManagerModal({
  visible,
  onClose,
  categories,
}: FinancialCategoryManagerModalProps) {
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    const alreadyExists = categories.some(
      (c) => c.name.toUpperCase() === trimmed.toUpperCase() && c.type === newType
    );
    if (alreadyExists) {
      Alert.alert('Error', 'La categoría ya existe para este tipo');
      return;
    }

    try {
      await database.write(async () => {
        await database.get<FinancialCategoryModel>('financial_categories').create((record) => {
          record.name = trimmed;
          record.type = newType;
          record.color = newType === 'INCOME' ? colors.primary : colors.error;
        });
      });
      setNewName('');
    } catch (e) {
      Alert.alert('Error', 'No se pudo crear la categoría');
    }
  };

  const handleDelete = async (category: FinancialCategoryModel) => {
    Alert.alert('Confirmar', `¿Eliminar categoría "${category.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await database.write(async () => {
              await category.destroyPermanently();
            });
          } catch (e) {
            Alert.alert('Error', 'No se pudo eliminar la categoría');
          }
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Gestionar Categorías</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[styles.typeBtn, newType === 'INCOME' && styles.typeBtnActiveIncome]}
              onPress={() => setNewType('INCOME')}
            >
              <Text style={[styles.typeText, newType === 'INCOME' && styles.typeTextActive]}>Ingresos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeBtn, newType === 'EXPENSE' && styles.typeBtnActiveExpense]}
              onPress={() => setNewType('EXPENSE')}
            >
              <Text style={[styles.typeText, newType === 'EXPENSE' && styles.typeTextActive]}>Gastos</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.addInputRow}>
            <TextInput
              style={styles.input}
              placeholder="Nombre..."
              placeholderTextColor={colors.textDisabled}
              value={newName}
              onChangeText={setNewName}
            />
            <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {categories
              .filter((c) => c.type === newType)
              .map((c) => (
                <View key={c.id} style={styles.listItem}>
                  <View style={styles.itemInfo}>
                    <View style={[styles.dot, { backgroundColor: c.color || colors.textSecondary }]} />
                    <Text style={styles.itemText}>{c.name}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(c)}>
                    <Ionicons name="trash-outline" size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
          </ScrollView>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  content: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 24,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: spacing.md,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  typeBtnActiveIncome: { backgroundColor: colors.primary },
  typeBtnActiveExpense: { backgroundColor: colors.error },
  typeText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  typeTextActive: { color: colors.background },
  addInputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
  },
  addBtn: {
    width: 48,
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { flexGrow: 0 },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  itemText: { color: colors.textPrimary, fontWeight: 'bold' },
  closeBtn: {
    marginTop: spacing.lg,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  closeBtnText: { color: colors.textPrimary, fontWeight: 'bold' },
});
