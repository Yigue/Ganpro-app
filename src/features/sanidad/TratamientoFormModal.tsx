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
import { Q } from '@nozbe/watermelondb';
import { useDatabase } from '@shared/hooks/useDatabase';
import { useHapticFeedback } from '@shared/hooks/useHapticFeedback';
import { Button } from '@shared/components/Button';
import { colors, spacing, typography } from '@theme/index';
import { SanidadRepository } from '@data/repositories/SanidadRepository';
import type MedicamentoModel from '@data/models/MedicamentoModel';
import type AnimalModel from '@data/models/AnimalModel';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function TratamientoFormModal({ visible, onClose }: Props) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['75%', '95%'], []);

  const database = useDatabase();
  const { triggerSuccess } = useHapticFeedback();

  const [rfid, setRfid] = useState('');
  const [animal, setAnimal] = useState<AnimalModel | null>(null);
  const [medicamentos, setMedicamentos] = useState<MedicamentoModel[]>([]);
  const [selectedMedId, setSelectedMedId] = useState<string | null>(null);
  const [dosisAplicada, setDosisAplicada] = useState('');
  const [responsable, setResponsable] = useState('');
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
      setRfid('');
      setAnimal(null);
      setSelectedMedId(null);
      setDosisAplicada('');
      setResponsable('');
      setNotas('');

      void (async () => {
        try {
          const repo = new SanidadRepository(database);
          const meds = await repo.queryMedicamentos().fetch();
          setMedicamentos(meds);
        } catch (e) {
          console.error('[TratamientoForm] load meds error:', e);
        }
      })();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible, database]);

  const lookupAnimal = useCallback(async () => {
    if (!rfid.trim()) return;
    try {
      const results = await database
        .get<AnimalModel>('animals')
        .query(Q.where('id_caravana', rfid.trim()))
        .fetch();
      if (results.length > 0) {
        setAnimal(results[0]);
      } else {
        Alert.alert('No encontrado', `No hay animal con caravana ${rfid.trim()}`);
        setAnimal(null);
      }
    } catch (e) {
      console.error('[TratamientoForm] lookup error:', e);
    }
  }, [rfid, database]);

  const handleSave = useCallback(async () => {
    if (!animal) {
      Alert.alert('Error', 'Buscá un animal primero');
      return;
    }
    if (!selectedMedId) {
      Alert.alert('Error', 'Seleccioná un medicamento');
      return;
    }
    setSaving(true);
    try {
      const repo = new SanidadRepository(database);
      await repo.createTratamiento({
        animalId: animal.id,
        medicamentoId: selectedMedId,
        loteId: animal.loteId ?? undefined,
        fechaAplicacion: Date.now(),
        dosisAplicada: dosisAplicada ? parseFloat(dosisAplicada) : undefined,
        responsable: responsable.trim(),
        notas: notas.trim(),
      });
      triggerSuccess();
      onClose();
    } catch (error) {
      console.error('[TratamientoForm] Save error:', error);
      Alert.alert('Error', 'No se pudo registrar el tratamiento.');
    } finally {
      setSaving(false);
    }
  }, [animal, selectedMedId, dosisAplicada, responsable, notas, database, triggerSuccess, onClose]);

  const selectedMed = medicamentos.find((m) => m.id === selectedMedId);

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
        <Text style={styles.title}>Registrar Tratamiento</Text>

        <Text style={styles.fieldLabel}>CARAVANA ANIMAL</Text>
        <View style={styles.rfidRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Ej: ARG001234"
            placeholderTextColor={colors.textDisabled}
            value={rfid}
            onChangeText={setRfid}
            autoCapitalize="characters"
            returnKeyType="search"
            onSubmitEditing={lookupAnimal}
          />
          <TouchableOpacity style={styles.searchBtn} onPress={lookupAnimal}>
            <Text style={styles.searchBtnText}>Buscar</Text>
          </TouchableOpacity>
        </View>

        {animal && (
          <View style={styles.animalFound}>
            <Text style={styles.animalFoundText}>✓ {animal.idCaravana}</Text>
            <Text style={styles.animalFoundSub}>{animal.categoria} · {animal.sexo === 'M' ? 'Macho' : 'Hembra'}</Text>
          </View>
        )}

        <Text style={styles.fieldLabel}>MEDICAMENTO</Text>
        {medicamentos.length === 0 ? (
          <Text style={styles.noMeds}>Sin medicamentos. Agregá desde el Vademécum.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
            <View style={styles.chips}>
              {medicamentos.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.chip, selectedMedId === m.id && styles.chipActive]}
                  onPress={() => setSelectedMedId(m.id)}
                >
                  <Text style={[styles.chipText, selectedMedId === m.id && styles.chipTextActive]}>
                    {m.nombre}
                  </Text>
                  {m.diasCarencia > 0 && (
                    <Text style={styles.chipSub}>{m.diasCarencia}d carencia</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}

        {selectedMed && (
          <View style={styles.medInfo}>
            <Text style={styles.medInfoText}>
              Carencia: {selectedMed.diasCarencia} días · Vía: {selectedMed.viaAdministracion}
            </Text>
            {selectedMed.dosisDefault && (
              <Text style={styles.medInfoText}>
                Dosis sugerida: {selectedMed.dosisDefault} {selectedMed.unidadDosis}
              </Text>
            )}
          </View>
        )}

        <Text style={styles.fieldLabel}>DOSIS APLICADA</Text>
        <TextInput
          style={styles.input}
          placeholder={selectedMed?.dosisDefault ? String(selectedMed.dosisDefault) : 'ml / comprimidos'}
          placeholderTextColor={colors.textDisabled}
          keyboardType="numeric"
          value={dosisAplicada}
          onChangeText={setDosisAplicada}
        />

        <Text style={styles.fieldLabel}>RESPONSABLE</Text>
        <TextInput
          style={styles.input}
          placeholder="Nombre del veterinario"
          placeholderTextColor={colors.textDisabled}
          value={responsable}
          onChangeText={setResponsable}
        />

        <Text style={styles.fieldLabel}>NOTAS (opcional)</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          placeholder="Observaciones..."
          placeholderTextColor={colors.textDisabled}
          multiline
          textAlignVertical="top"
          value={notas}
          onChangeText={setNotas}
        />

        <Button
          label="REGISTRAR TRATAMIENTO"
          onPress={handleSave}
          size="lg"
          disabled={!animal || !selectedMedId}
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
  rfidRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  searchBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    height: spacing.touchTarget,
    justifyContent: 'center',
  },
  searchBtnText: {
    color: colors.background,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },
  animalFound: {
    backgroundColor: 'rgba(0,214,143,0.12)',
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  animalFoundText: {
    color: colors.primary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  animalFoundSub: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    marginTop: 2,
  },
  noMeds: { color: colors.textDisabled, fontSize: typography.sizes.sm, fontStyle: 'italic' },
  chipsScroll: { marginTop: spacing.xs },
  chips: { flexDirection: 'row', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minWidth: 100,
  },
  chipActive: { borderColor: colors.warning, backgroundColor: 'rgba(255,170,0,0.12)' },
  chipText: { color: colors.textSecondary, fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
  chipTextActive: { color: colors.warning, fontWeight: typography.weights.bold },
  chipSub: { color: colors.textDisabled, fontSize: typography.sizes.xs, marginTop: 2 },
  medInfo: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    gap: 4,
  },
  medInfoText: { color: colors.textSecondary, fontSize: typography.sizes.sm },
  saveButton: { marginTop: spacing.lg },
});
