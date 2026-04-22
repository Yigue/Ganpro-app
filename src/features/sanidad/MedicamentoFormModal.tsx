import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useDatabase } from '@shared/hooks/useDatabase';
import { useHapticFeedback } from '@shared/hooks/useHapticFeedback';
import { Button } from '@shared/components/Button';
import { colors, spacing, typography } from '@theme/index';
import { SanidadRepository } from '@data/repositories/SanidadRepository';
// VIA_ADMINISTRACION kept for UI chip display; backend stores it in notas field
const VIA_ADMINISTRACION: Record<string, string> = {
  IM: 'Intramuscular',
  IV: 'Intravenosa',
  SC: 'Subcutánea',
  VO: 'Vía Oral',
  TOP: 'Tópica',
};

interface Props {
  visible: boolean;
  onClose: () => void;
}

const VIA_OPTIONS = Object.entries(VIA_ADMINISTRACION) as [string, string][];

export function MedicamentoFormModal({ visible, onClose }: Props) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['75%', '95%'], []);

  const database = useDatabase();
  const { triggerSuccess } = useHapticFeedback();

  const [nombre, setNombre] = useState('');
  const [principioActivo, setPrincipioActivo] = useState('');
  const [diasCarencia, setDiasCarencia] = useState('0');
  const [viaAdmin, setViaAdmin] = useState<string>('IM');
  const [dosisDefault, setDosisDefault] = useState('');
  const [unidadDosis, setUnidadDosis] = useState('ml');
  const [costoUnitario, setCostoUnitario] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
      setNombre('');
      setPrincipioActivo('');
      setDiasCarencia('0');
      setViaAdmin('IM');
      setDosisDefault('');
      setUnidadDosis('ml');
      setCostoUnitario('');
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible]);

  const handleSave = useCallback(async () => {
    if (!nombre.trim()) {
      Alert.alert('Error', 'El nombre del medicamento es obligatorio');
      return;
    }
    setSaving(true);
    try {
      const repo = new SanidadRepository(database);
      // V3: Medicamentos → OperationCatalog (tipo = 'SANIDAD')
      await repo.createOperation({
        nombre: nombre.trim(),
        tipo: 'SANIDAD',
        diasCarencia: parseInt(diasCarencia, 10) || 0,
        costoUnitario: costoUnitario ? parseFloat(costoUnitario) : undefined,
        notas: `via:${viaAdmin} dosis:${dosisDefault || '?'}${unidadDosis} pa:${principioActivo.trim()}`,
      });
      triggerSuccess();
      onClose();
    } catch (error) {
      console.error('[MedicamentoForm] Save error:', error);
      Alert.alert('Error', 'No se pudo guardar el medicamento.');
    } finally {
      setSaving(false);
    }
  }, [nombre, principioActivo, diasCarencia, viaAdmin, dosisDefault, unidadDosis, costoUnitario, database, triggerSuccess, onClose]);

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      backgroundStyle={styles.sheet}
      handleIndicatorStyle={styles.indicator}
      onDismiss={onClose}
      enablePanDownToClose
    >
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Nueva Operación Sanidad</Text>

        <Text style={styles.fieldLabel}>NOMBRE *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Ivermectina 1%"
          placeholderTextColor={colors.textDisabled}
          value={nombre}
          onChangeText={setNombre}
          autoCapitalize="words"
        />

        <Text style={styles.fieldLabel}>PRINCIPIO ACTIVO</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Ivermectina"
          placeholderTextColor={colors.textDisabled}
          value={principioActivo}
          onChangeText={setPrincipioActivo}
        />

        <Text style={styles.fieldLabel}>DÍAS DE CARENCIA *</Text>
        <TextInput
          style={styles.input}
          placeholder="0"
          placeholderTextColor={colors.textDisabled}
          keyboardType="numeric"
          value={diasCarencia}
          onChangeText={setDiasCarencia}
        />

        <Text style={styles.fieldLabel}>VÍA DE ADMINISTRACIÓN</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
          <View style={styles.chips}>
            {VIA_OPTIONS.map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={[styles.chip, viaAdmin === key && styles.chipActive]}
                onPress={() => setViaAdmin(key)}
              >
                <Text style={[styles.chipText, viaAdmin === key && styles.chipTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Text style={styles.fieldLabel}>DOSIS POR DEFECTO</Text>
            <TextInput
              style={styles.input}
              placeholder="5"
              placeholderTextColor={colors.textDisabled}
              keyboardType="numeric"
              value={dosisDefault}
              onChangeText={setDosisDefault}
            />
          </View>
          <View style={styles.rowItem}>
            <Text style={styles.fieldLabel}>UNIDAD</Text>
            <TextInput
              style={styles.input}
              placeholder="ml"
              placeholderTextColor={colors.textDisabled}
              value={unidadDosis}
              onChangeText={setUnidadDosis}
            />
          </View>
        </View>

        <Text style={styles.fieldLabel}>COSTO UNITARIO ($)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: 1500"
          placeholderTextColor={colors.textDisabled}
          keyboardType="numeric"
          value={costoUnitario}
          onChangeText={setCostoUnitario}
        />

        <Button
          label="GUARDAR MEDICAMENTO"
          onPress={handleSave}
          size="lg"
          disabled={!nombre.trim()}
          loading={saving}
          style={styles.saveButton}
        />
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: colors.surfaceElevated },
  indicator: { backgroundColor: colors.border, width: 40 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm },
  title: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    paddingHorizontal: spacing.md,
    height: spacing.touchTarget,
  },
  chipsScroll: { marginTop: spacing.xs },
  chips: { flexDirection: 'row', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    borderColor: colors.warning,
    backgroundColor: 'rgba(255,170,0,0.12)',
  },
  chipText: { color: colors.textSecondary, fontSize: typography.sizes.sm },
  chipTextActive: { color: colors.warning, fontWeight: typography.weights.bold },
  row: { flexDirection: 'row', gap: spacing.sm },
  rowItem: { flex: 1 },
  saveButton: { marginTop: spacing.lg },
});
