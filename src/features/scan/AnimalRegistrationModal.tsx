import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput as RNTextInput,
} from 'react-native';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useDatabase } from '@shared/hooks/useDatabase';
import { useHapticFeedback } from '@shared/hooks/useHapticFeedback';
import { Button } from '@shared/components/Button';
import { colors, spacing, typography } from '@theme/index';
import {
  SEXO,
  CATEGORIAS_MACHO,
  CATEGORIAS_HEMBRA,
  ESTADO,
  type SexoType,
  type CategoriaType,
} from '@core/constants/categories';
import type PotreroModel from '@data/models/PotreroModel';
import { AnimalRepository } from '@data/repositories/AnimalRepository';

interface Props {
  visible: boolean;
  rfid: string;
  onClose: () => void;
  onSaved: (animal: import('@data/models/AnimalModel').default) => void;
}

export function AnimalRegistrationModal({ visible, rfid, onClose, onSaved }: Props) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['75%', '95%'], []);

  const database = useDatabase();
  const { triggerSelection, triggerSuccess } = useHapticFeedback();

  const [sexo, setSexo] = useState<SexoType | null>(null);
  const [categoria, setCategoria] = useState<CategoriaType | null>(null);
  const [raza, setRaza] = useState('');
  const [potreroId, setPotreroId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [potreros, setPotreros] = useState<PotreroModel[]>([]);

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
      setSexo(null);
      setCategoria(null);
      setRaza('');
      setPotreroId(null);
      void (async () => {
        try {
          setPotreros(await database.get<PotreroModel>('potreros').query().fetch());
        } catch (e) {
          console.error('[Registration] load potreros error:', e);
        }
      })();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible, database]);

  const handleSexoSelect = useCallback(
    (value: SexoType) => {
      triggerSelection();
      setSexo(value);
      setCategoria(null); // Reset category when sex changes
    },
    [triggerSelection]
  );

  const handleCategoriaSelect = useCallback(
    (value: CategoriaType) => {
      triggerSelection();
      setCategoria(value);
    },
    [triggerSelection]
  );

  const handlePotreroSelect = useCallback(
    (id: string) => {
      triggerSelection();
      setPotreroId(id);
    },
    [triggerSelection]
  );

  const isFormValid = sexo !== null && categoria !== null && potreroId !== null;

  const handleSave = useCallback(async () => {
    if (!isFormValid || !sexo || !categoria || !potreroId) return;
    setSaving(true);
    try {
      const repo = new AnimalRepository(database);
      const newAnimal = await repo.create({
        rfid,
        sexo,
        categoria,
        raza: raza.trim(),
        estado: ESTADO.ACTIVO,
        potreroId,
      });
      triggerSuccess();
      onSaved(newAnimal);
    } catch (error) {
      console.error('[Registration] Save error:', error);
      Alert.alert('Error', 'No se pudo guardar el animal. Intente nuevamente.');
    } finally {
      setSaving(false);
    }
  }, [isFormValid, database, rfid, sexo, categoria, raza, potreroId, triggerSuccess, onSaved]);

  const categoriasDisponibles =
    sexo === SEXO.MACHO ? CATEGORIAS_MACHO : CATEGORIAS_HEMBRA;

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
        {/* Header */}
        <Text style={styles.title}>Registrar Animal</Text>
        <Text style={styles.subtitle}>
          Caravana: <Text style={styles.rfidText}>{rfid}</Text>
        </Text>

        {/* SEXO */}
        <Text style={styles.sectionLabel}>SEXO</Text>
        <View style={styles.row}>
          {([SEXO.MACHO, SEXO.HEMBRA] as SexoType[]).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.bigButton, sexo === s && styles.bigButtonSelected]}
              onPress={() => handleSexoSelect(s)}
              activeOpacity={0.8}
              accessibilityRole="radio"
              accessibilityState={{ checked: sexo === s }}
            >
              <Text style={styles.bigButtonIcon}>
                {s === SEXO.MACHO ? '♂' : '♀'}
              </Text>
              <Text
                style={[
                  styles.bigButtonText,
                  sexo === s && styles.bigButtonTextSelected,
                ]}
              >
                {s === SEXO.MACHO ? 'Macho' : 'Hembra'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* CATEGORIA — visible only after sex is selected */}
        {sexo !== null && (
          <>
            <Text style={styles.sectionLabel}>CATEGORÍA</Text>
            <View style={styles.categoryGrid}>
              {categoriasDisponibles.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryButton,
                    categoria === cat && styles.categoryButtonSelected,
                  ]}
                  onPress={() => handleCategoriaSelect(cat)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.categoryButtonText,
                      categoria === cat && styles.categoryButtonTextSelected,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* RAZA (opcional) */}
        <Text style={styles.sectionLabel}>RAZA (opcional)</Text>
        <RNTextInput
          style={styles.razaInput}
          placeholder="Ej: Angus, Hereford, Brangus"
          placeholderTextColor={colors.textDisabled}
          value={raza}
          onChangeText={setRaza}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
        />

        {/* POTRERO */}
        <Text style={styles.sectionLabel}>POTRERO</Text>
        {potreros.length === 0 ? (
          <Text style={styles.noLotesText}>
            No hay potreros configurados. Creá uno en la pestaña Potreros.
          </Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.loteList}
          >
            {potreros.map((potrero) => (
              <TouchableOpacity
                key={potrero.id}
                style={[
                  styles.loteChip,
                  potreroId === potrero.id && styles.loteChipSelected,
                ]}
                onPress={() => handlePotreroSelect(potrero.id)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.loteChipText,
                    potreroId === potrero.id && styles.loteChipTextSelected,
                  ]}
                >
                  {potrero.nombre}
                </Text>
                {/* Potrero might not have 'ubicacion', but has 'recurso_forrajero' */}
                {potrero.recursoForrajero ? (
                  <Text style={styles.loteChipUbicacion}>{potrero.recursoForrajero}</Text>
                ) : null}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Save */}
        <Button
          label="GUARDAR Y CONTINUAR"
          onPress={handleSave}
          size="lg"
          disabled={!isFormValid}
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
    gap: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.md,
  },
  rfidText: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
    fontVariant: ['tabular-nums'],
  },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  bigButton: {
    flex: 1,
    height: spacing.touchTargetLg,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  bigButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0, 214, 143, 0.12)',
  },
  bigButtonIcon: { fontSize: 28 },
  bigButtonText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  bigButtonTextSelected: { color: colors.primary },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: spacing.touchTarget,
    justifyContent: 'center',
  },
  categoryButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0, 214, 143, 0.12)',
  },
  categoryButtonText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
  },
  categoryButtonTextSelected: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  razaInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    paddingHorizontal: spacing.md,
    height: spacing.touchTarget,
  },
  noLotesText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.md,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  loteList: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  loteChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: spacing.touchTarget,
    justifyContent: 'center',
  },
  loteChipSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0, 214, 143, 0.12)',
  },
  loteChipText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
  },
  loteChipTextSelected: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  loteChipUbicacion: {
    color: colors.textDisabled,
    fontSize: typography.sizes.xs,
  },
  saveButton: { marginTop: spacing.lg },
});
