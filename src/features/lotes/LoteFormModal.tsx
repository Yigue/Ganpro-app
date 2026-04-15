import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useDatabase } from '@shared/hooks/useDatabase';
import { useHapticFeedback } from '@shared/hooks/useHapticFeedback';
import { Button } from '@shared/components/Button';
import { colors, spacing, typography } from '@theme/index';
import LoteModel from '@data/models/LoteModel';

interface Props {
  visible: boolean;
  lote: LoteModel | null; // null = create, LoteModel = edit
  onClose: () => void;
}

export function LoteFormModal({ visible, lote, onClose }: Props) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['60%'], []);

  const database = useDatabase();
  const { triggerSuccess } = useHapticFeedback();

  const [nombre, setNombre] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
      setNombre(lote?.nombre ?? '');
      setUbicacion(lote?.ubicacion ?? '');
      setDescripcion(lote?.descripcion ?? '');
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible, lote]);

  const handleSave = useCallback(async () => {
    if (!nombre.trim()) {
      Alert.alert('Error', 'El nombre del lote es obligatorio');
      return;
    }
    setSaving(true);
    try {
      await database.write(async () => {
        if (lote) {
          // Edit
          await lote.update((l) => {
            l.nombre = nombre.trim();
            l.ubicacion = ubicacion.trim();
            l.descripcion = descripcion.trim();
          });
        } else {
          // Create
          await database.get<LoteModel>('lotes').create((l) => {
            l.nombre = nombre.trim();
            l.ubicacion = ubicacion.trim();
            l.descripcion = descripcion.trim();
          });
        }
      });
      triggerSuccess();
      onClose();
    } catch (error) {
      console.error('[LoteForm] Save error:', error);
      Alert.alert('Error', 'No se pudo guardar el lote.');
    } finally {
      setSaving(false);
    }
  }, [nombre, ubicacion, descripcion, lote, database, triggerSuccess, onClose]);

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
        <Text style={styles.title}>{lote ? 'Editar Lote' : 'Nuevo Lote'}</Text>

        <Text style={styles.fieldLabel}>NOMBRE *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Lote Norte"
          placeholderTextColor={colors.textDisabled}
          value={nombre}
          onChangeText={setNombre}
          autoCapitalize="words"
          returnKeyType="next"
        />

        <Text style={styles.fieldLabel}>UBICACIÓN</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Potrero 3, sector sur"
          placeholderTextColor={colors.textDisabled}
          value={ubicacion}
          onChangeText={setUbicacion}
          returnKeyType="next"
        />

        <Text style={styles.fieldLabel}>DESCRIPCIÓN</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          placeholder="Notas adicionales..."
          placeholderTextColor={colors.textDisabled}
          value={descripcion}
          onChangeText={setDescripcion}
          multiline
          textAlignVertical="top"
        />

        <Button
          label={lote ? 'GUARDAR CAMBIOS' : 'CREAR LOTE'}
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
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
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
  inputMultiline: {
    height: 80,
    paddingTop: spacing.sm,
  },
  saveButton: { marginTop: spacing.lg },
});
