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
import type LoteModel from '@data/models/LoteModel';

interface EtapaInput {
  nombre: string;
  diasDesdeInicio: number;
  descripcion: string;
}

const IATF_DEFAULT_ETAPAS: EtapaInput[] = [
  { nombre: 'Día 0 — Colocación CIDR + BE', diasDesdeInicio: 0, descripcion: 'Colocar DIU CIDR + Benzoato de Estradiol 2mg IM' },
  { nombre: 'Día 7 — Retiro CIDR + PGF2α', diasDesdeInicio: 7, descripcion: 'Retirar CIDR + Prostaglandina F2α 25mg IM' },
  { nombre: 'Día 8 — GnRH o BE', diasDesdeInicio: 8, descripcion: 'Gonadorelina 100mcg IM o Benzoato de Estradiol 1mg IM' },
  { nombre: 'Día 9 — Inseminación Artificial', diasDesdeInicio: 9, descripcion: 'Inseminación a tiempo fijo (IATF)' },
  { nombre: 'Día 37 — Ecografía', diasDesdeInicio: 37, descripcion: 'Diagnóstico de preñez por ecografía' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function ProtocoloFormModal({ visible, onClose }: Props) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['85%', '95%'], []);

  const database = useDatabase();
  const { triggerSuccess } = useHapticFeedback();

  const [nombre, setNombre] = useState('Protocolo IATF Ovsynch');
  const [lotes, setLotes] = useState<LoteModel[]>([]);
  const [selectedLoteId, setSelectedLoteId] = useState<string | null>(null);
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
      setNombre('Protocolo IATF Ovsynch');
      setSelectedLoteId(null);
      setNotas('');

      void (async () => {
        try {
          const loaded = await database.get<LoteModel>('lotes').query().fetch();
          setLotes(loaded);
        } catch (e) {
          console.error('[ProtocoloForm] load lotes error:', e);
        }
      })();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible, database]);

  const handleSave = useCallback(async () => {
    if (!nombre.trim()) {
      Alert.alert('Error', 'El nombre del protocolo es obligatorio');
      return;
    }
    if (!selectedLoteId) {
      Alert.alert('Error', 'Seleccioná un lote');
      return;
    }
    setSaving(true);
    try {
      const repo = new SanidadRepository(database);
      await repo.createProtocolo({
        nombre: nombre.trim(),
        loteId: selectedLoteId,
        fechaInicio: Date.now(),
        notas: notas.trim(),
        etapas: IATF_DEFAULT_ETAPAS,
      });
      triggerSuccess();
      onClose();
    } catch (error) {
      console.error('[ProtocoloForm] Save error:', error);
      Alert.alert('Error', 'No se pudo guardar el protocolo.');
    } finally {
      setSaving(false);
    }
  }, [nombre, selectedLoteId, notas, database, triggerSuccess, onClose]);

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
        <Text style={styles.title}>Nuevo Protocolo IATF</Text>

        <Text style={styles.fieldLabel}>NOMBRE DEL PROTOCOLO</Text>
        <TextInput
          style={styles.input}
          value={nombre}
          onChangeText={setNombre}
          placeholderTextColor={colors.textDisabled}
        />

        <Text style={styles.fieldLabel}>LOTE *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
          <View style={styles.chips}>
            {lotes.map((l) => (
              <TouchableOpacity
                key={l.id}
                style={[styles.chip, selectedLoteId === l.id && styles.chipActive]}
                onPress={() => setSelectedLoteId(l.id)}
              >
                <Text style={[styles.chipText, selectedLoteId === l.id && styles.chipTextActive]}>
                  {l.nombre}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <Text style={styles.sectionTitle}>Etapas del Protocolo</Text>
        <View style={styles.etapasList}>
          {IATF_DEFAULT_ETAPAS.map((e, i) => (
            <View key={i} style={styles.etapa}>
              <View style={styles.etapaDot} />
              <View style={styles.etapaInfo}>
                <Text style={styles.etapaNombre}>{e.nombre}</Text>
                <Text style={styles.etapaDesc}>{e.descripcion}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.fieldLabel}>NOTAS (opcional)</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          placeholder="Observaciones del protocolo..."
          placeholderTextColor={colors.textDisabled}
          multiline
          textAlignVertical="top"
          value={notas}
          onChangeText={setNotas}
        />

        <Button
          label="INICIAR PROTOCOLO"
          onPress={handleSave}
          size="lg"
          disabled={!nombre.trim() || !selectedLoteId}
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
  inputMultiline: { height: 80, paddingTop: spacing.sm },
  chipsScroll: { marginTop: spacing.xs },
  chips: { flexDirection: 'row', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { borderColor: '#C35BD0', backgroundColor: 'rgba(195,91,208,0.12)' },
  chipText: { color: colors.textSecondary, fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
  chipTextActive: { color: '#C35BD0', fontWeight: typography.weights.bold },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    marginTop: spacing.md,
  },
  etapasList: { gap: spacing.sm },
  etapa: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  etapaDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#C35BD0',
    marginTop: 5,
  },
  etapaInfo: { flex: 1 },
  etapaNombre: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  etapaDesc: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  saveButton: { marginTop: spacing.lg },
});
