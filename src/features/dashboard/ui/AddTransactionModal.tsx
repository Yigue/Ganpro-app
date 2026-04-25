import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@theme/index';
import type { FinancialCategoryModel } from '@data/models/FinancialCategoryModel';

export type TransactionTipo = 'INGRESO' | 'GASTO';

interface AddTransactionModalProps {
  visible: boolean;
  initialTipo?: TransactionTipo;
  onClose: () => void;
  categories: FinancialCategoryModel[]; // Categorías reales de la DB
  onSave: (data: {
    tipo: TransactionTipo;
    monto: string;
    concepto: string;
    categoria: string;
    fechaText: string;
  }) => void;
}

function todayFormatted(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * AddTransactionModal — modal para registrar un movimiento financiero.
 * Tipo pre-seleccionable (INGRESO | GASTO). Fecha como texto libre.
 * Usa categorías reales inyectadas desde la DB.
 */
export function AddTransactionModal({
  visible,
  initialTipo = 'INGRESO',
  onClose,
  categories,
  onSave,
}: AddTransactionModalProps) {
  const [tipo, setTipo] = useState<TransactionTipo>(initialTipo);
  const [monto, setMonto] = useState('');
  const [concepto, setConcepto] = useState('');
  const [categoria, setCategoria] = useState('');
  const [fechaText, setFechaText] = useState(todayFormatted());

  // Reiniciar al abrir
  useEffect(() => {
    if (visible) {
      setTipo(initialTipo);
      setMonto('');
      setConcepto('');
      setCategoria('');
      setFechaText(todayFormatted());
    }
  }, [visible, initialTipo]);

  // Filtrar categorías por tipo (Income/Expense)
  const filteredCategories = useMemo(() => {
    const dbType = tipo === 'INGRESO' ? 'INCOME' : 'EXPENSE';
    return categories.filter(c => c.type === dbType);
  }, [categories, tipo]);

  // Reset categoría cuando cambia el tipo si la actual no pertenece al nuevo tipo
  useEffect(() => {
    if (categoria && !filteredCategories.find(c => c.name === categoria)) {
      setCategoria('');
    }
  }, [tipo, filteredCategories]);

  const handleSave = () => {
    if (monto.trim().length === 0 || isNaN(parseFloat(monto))) {
      Alert.alert('Error', 'Ingresá un monto válido');
      return;
    }
    if (categoria.length === 0) {
      Alert.alert('Error', 'Seleccioná una categoría');
      return;
    }
    onSave({ tipo, monto: monto.trim(), concepto: concepto.trim(), categoria, fechaText: fechaText.trim() });
  };

  const tipoColor = tipo === 'INGRESO' ? colors.primary : colors.error;
  const tipoAlpha = tipo === 'INGRESO' ? colors.primaryAlpha : colors.errorAlpha;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Nuevo movimiento</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Tipo toggle */}
            <Text style={styles.fieldLabel}>Tipo</Text>
            <View style={styles.tipoRow}>
              <TouchableOpacity
                style={[
                  styles.tipoBtn,
                  tipo === 'INGRESO' && { backgroundColor: colors.primaryAlpha, borderColor: colors.primary },
                ]}
                onPress={() => setTipo('INGRESO')}
              >
                <Ionicons
                  name="arrow-up-circle-outline"
                  size={16}
                  color={tipo === 'INGRESO' ? colors.primary : colors.textSecondary}
                />
                <Text style={[styles.tipoBtnText, tipo === 'INGRESO' && { color: colors.primary, fontWeight: typography.weights.bold }]}>
                  Ingreso
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tipoBtn,
                  tipo === 'GASTO' && { backgroundColor: colors.errorAlpha, borderColor: colors.error },
                ]}
                onPress={() => setTipo('GASTO')}
              >
                <Ionicons
                  name="arrow-down-circle-outline"
                  size={16}
                  color={tipo === 'GASTO' ? colors.error : colors.textSecondary}
                />
                <Text style={[styles.tipoBtnText, tipo === 'GASTO' && { color: colors.error, fontWeight: typography.weights.bold }]}>
                  Gasto
                </Text>
              </TouchableOpacity>
            </View>

            {/* Monto */}
            <Text style={styles.fieldLabel}>Monto *</Text>
            <TextInput
              style={[styles.input, { borderColor: tipoColor + '60' }]}
              value={monto}
              onChangeText={setMonto}
              placeholder="ej: 50000"
              placeholderTextColor={colors.textDisabled}
              keyboardType="numeric"
            />

            {/* Concepto */}
            <Text style={styles.fieldLabel}>Concepto</Text>
            <TextInput
              style={styles.input}
              value={concepto}
              onChangeText={setConcepto}
              placeholder="ej: Venta 10 novillos gordos"
              placeholderTextColor={colors.textDisabled}
              maxLength={200}
            />

            {/* Categoría */}
            <Text style={styles.fieldLabel}>Categoría *</Text>
            <View style={styles.chipRow}>
              {filteredCategories.length === 0 ? (
                <Text style={styles.noCatsText}>No hay categorías para este tipo. Agregalas desde el Dashboard.</Text>
              ) : (
                filteredCategories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.chip,
                      categoria === cat.name && { borderColor: tipoColor, backgroundColor: tipoAlpha },
                    ]}
                    onPress={() => setCategoria(cat.name)}
                  >
                    <Text style={[
                      styles.chipText,
                      categoria === cat.name && { color: tipoColor, fontWeight: typography.weights.bold },
                    ]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* Fecha */}
            <Text style={styles.fieldLabel}>Fecha (DD/MM/AAAA)</Text>
            <TextInput
              style={styles.input}
              value={fechaText}
              onChangeText={setFechaText}
              placeholder="ej: 23/04/2026"
              placeholderTextColor={colors.textDisabled}
              keyboardType="numeric"
              maxLength={10}
            />
          </ScrollView>

          {/* Acciones */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: tipoColor }]}
              onPress={handleSave}
            >
              <Text style={styles.saveText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  noCatsText: {
    color: colors.textDisabled,
    fontSize: typography.sizes.xs,
    fontStyle: 'italic',
    paddingVertical: spacing.sm,
  },
  tipoRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tipoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tipoBtnText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: 12,
  },
  saveText: {
    color: colors.textOnPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
});
