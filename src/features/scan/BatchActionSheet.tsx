import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput as RNTextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useDatabase } from '@shared/hooks/useDatabase';
import { database } from '@data/database/database';
import { useHapticFeedback } from '@shared/hooks/useHapticFeedback';
import { Button } from '@shared/components/Button';
import { colors, spacing, typography } from '@theme/index';
import { EVENTO_TIPO } from '@core/constants/eventTypes';
import { CATEGORIAS_MACHO, CATEGORIAS_HEMBRA, type CategoriaType } from '@core/constants/categories';
import type EventoModel from '@data/models/EventoModel';
import type LoteModel from '@data/models/LoteModel';
import { AnimalRepository } from '@data/repositories/AnimalRepository';
import { useScanStore, type QueueItem } from '@store/scanStore';

import withObservables from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';

// ... (resto de los imports ya existentes)
type BatchAction = 'VACUNACION' | 'PESAJE' | 'CAMBIO_LOTE' | 'CAMBIO_CATEGORIA';

const BATCH_ACTIONS: { tipo: BatchAction; label: string; icon: string; color: string }[] =
  [
    { tipo: 'VACUNACION', label: 'Vacunación', icon: '💉', color: colors.warning },
    { tipo: 'PESAJE', label: 'Pesaje', icon: '⚖️', color: colors.info },
    { tipo: 'CAMBIO_LOTE', label: 'Cambio de Lote', icon: '🔀', color: colors.primary },
    { tipo: 'CAMBIO_CATEGORIA' as BatchAction, label: 'Categoría', icon: '🏷️', color: colors.success },
  ];

interface Props {
  visible: boolean;
  onClose: () => void;
  lotes: LoteModel[];
}

function BatchActionSheetInner({ visible, onClose, lotes }: Props) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['60%', '95%'], []);

  const database = useDatabase();
  const { triggerSuccess, triggerSelection } = useHapticFeedback();
  const queue = useScanStore(s => s.queue);
  const clearQueue = useScanStore(s => s.clearQueue);

  const [selectedAction, setSelectedAction] = useState<BatchAction | null>(null);
  const [vacuna, setVacuna] = useState('');
  const [notas, setNotas] = useState('');
  const [loteDestinoId, setLoteDestinoId] = useState<string | null>(null);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<CategoriaType | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
      setSelectedAction(null);
      setVacuna('');
      setNotas('');
      setLoteDestinoId(null);
      setCategoriaSeleccionada(null);
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible]);

  const handleApply = useCallback(async () => {
    if (!selectedAction || queue.length === 0) return;
    if (selectedAction === 'CAMBIO_LOTE' && !loteDestinoId) return;
    if (selectedAction === 'CAMBIO_CATEGORIA' && !categoriaSeleccionada) return;

    setApplying(true);
    try {
      const animalRepo = new AnimalRepository(database);
      const knownItems: QueueItem[] = queue.filter((item) => item.animalId != null);

      if (selectedAction === 'CAMBIO_CATEGORIA' && categoriaSeleccionada) {
        await database.write(async () => {
          for (const item of knownItems) {
            const animal = await animalRepo.findById(item.animalId!);
            await animal.update((a) => {
              a.categoria = categoriaSeleccionada;
            });
          }
        });
      } else if (selectedAction === 'CAMBIO_LOTE' && loteDestinoId) {
        // Each transferToLote runs its own atomic write internally.
        for (const item of knownItems) {
          const animal = await animalRepo.findById(item.animalId!);
          await animalRepo.transferToLote(animal, loteDestinoId, notas);
        }
      } else {
        // Batch all eventos in a single write for Vacunación / Pesaje.
        const tipo =
          selectedAction === 'VACUNACION' ? EVENTO_TIPO.VACUNACION : EVENTO_TIPO.PESAJE;
        const notasText =
          selectedAction === 'VACUNACION' ? vacuna.trim() || notas.trim() : notas.trim();

        await database.write(async () => {
          for (const item of knownItems) {
            await database.get<EventoModel>('eventos').create((evento) => {
              evento.animalId = item.animalId!;
              evento.tipo = tipo;
              evento.valor = null;
              evento.notas = notasText;
              evento.loteDestinoId = null;
              evento.timestamp = Date.now();
            });
          }
        });
      }

      triggerSuccess();
      clearQueue();
      onClose();
    } catch (error) {
      console.error('[BatchActionSheet] Apply error:', error);
      Alert.alert('Error', 'No se pudo aplicar la acción. Intente nuevamente.');
    } finally {
      setApplying(false);
    }
  }, [
    selectedAction,
    queue,
    loteDestinoId,
    categoriaSeleccionada,
    vacuna,
    notas,
    database,
    triggerSuccess,
    clearQueue,
    onClose,
  ]);

  const knownCount = queue.filter((i) => i.animalId != null).length;
  const unknownCount = queue.length - knownCount;

  const isSaveEnabled =
    selectedAction !== null &&
    knownCount > 0 &&
    (selectedAction !== 'CAMBIO_LOTE' || loteDestinoId !== null) &&
    (selectedAction !== 'CAMBIO_CATEGORIA' || categoriaSeleccionada !== null) &&
    !applying;

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
        <View style={styles.headerRow}>
          <Text style={styles.title}>Aplicar en lote</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{queue.length}</Text>
          </View>
        </View>

        {/* Queue summary */}
        <View style={styles.summary}>
          <Text style={styles.summaryText}>
            {knownCount} encontrados · {unknownCount} no registrados
          </Text>
        </View>

        {/* Scanned tags list */}
        <View style={styles.tagList}>
          {queue.map((item) => (
            <View key={item.rfid} style={styles.tagRow}>
              <View
                style={[
                  styles.tagDot,
                  {
                    backgroundColor: item.animalId
                      ? colors.success
                      : colors.textDisabled,
                  },
                ]}
              />
              <Text style={styles.tagRfid} numberOfLines={1}>
                {item.rfid}
              </Text>
              {!item.animalId && (
                <Text style={styles.tagUnknown}>No reg.</Text>
              )}
            </View>
          ))}
        </View>

        {/* Action selector */}
        <Text style={styles.sectionLabel}>ACCIÓN A APLICAR</Text>
        <View style={styles.actionsGrid}>
          {BATCH_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.tipo}
              style={[
                styles.actionButton,
                selectedAction === action.tipo && {
                  borderColor: action.color,
                  backgroundColor: `${action.color}20`,
                },
              ]}
              onPress={() => {
                triggerSelection();
                setSelectedAction(action.tipo);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.actionIcon}>{action.icon}</Text>
              <Text
                style={[
                  styles.actionLabel,
                  selectedAction === action.tipo && { color: action.color },
                ]}
              >
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Vacunación: vacuna name */}
        {selectedAction === 'VACUNACION' && (
          <View style={styles.fieldSection}>
            <Text style={styles.fieldLabel}>VACUNA</Text>
            <RNTextInput
              style={styles.textInput}
              placeholder="Ej: Aftosa, Brucelosis..."
              placeholderTextColor={colors.textDisabled}
              value={vacuna}
              onChangeText={setVacuna}
              returnKeyType="done"
            />
          </View>
        )}

        {/* Cambio de Lote: lote picker */}
        {selectedAction === 'CAMBIO_LOTE' && (
          <View style={styles.fieldSection}>
            <Text style={styles.fieldLabel}>LOTE DESTINO</Text>
            <View style={styles.loteGrid}>
              {lotes.map((lote) => (
                <TouchableOpacity
                  key={lote.id}
                  style={[
                    styles.loteOption,
                    loteDestinoId === lote.id && styles.loteOptionSelected,
                  ]}
                  onPress={() => {
                    triggerSelection();
                    setLoteDestinoId(lote.id);
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.loteOptionText,
                      loteDestinoId === lote.id && styles.loteOptionTextSelected,
                    ]}
                  >
                    {lote.nombre}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Cambio de Categoría: category picker */}
        {selectedAction === 'CAMBIO_CATEGORIA' && (
          <View style={styles.fieldSection}>
            <Text style={styles.fieldLabel}>NUEVA CATEGORÍA</Text>
            <View style={styles.loteGrid}>
              {[...CATEGORIAS_MACHO, ...CATEGORIAS_HEMBRA].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.loteOption,
                    categoriaSeleccionada === cat && styles.loteOptionSelected,
                  ]}
                  onPress={() => {
                    triggerSelection();
                    setCategoriaSeleccionada(cat);
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.loteOptionText,
                      categoriaSeleccionada === cat && styles.loteOptionTextSelected,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Optional notes for Pesaje / Cambio de Lote */}
        {(selectedAction === 'PESAJE' || selectedAction === 'CAMBIO_LOTE') && (
          <View style={styles.fieldSection}>
            <Text style={styles.fieldLabel}>NOTAS (opcional)</Text>
            <RNTextInput
              style={[styles.textInput, styles.textInputMultiline]}
              placeholder="Observaciones..."
              placeholderTextColor={colors.textDisabled}
              multiline
              value={notas}
              onChangeText={setNotas}
            />
          </View>
        )}

        {unknownCount > 0 && knownCount === 0 && (
          <Text style={styles.warningText}>
            ⚠️ Ningún animal escaneado está registrado. Registrá los animales primero tocando sobre cada uno.
          </Text>
        )}
        {unknownCount > 0 && knownCount > 0 && (
          <Text style={styles.warningText}>
            ⚠️ {unknownCount} animal{unknownCount > 1 ? 'es' : ''} no registrado{unknownCount > 1 ? 's' : ''} serán ignorados
          </Text>
        )}
        <Button
          label={applying ? 'Aplicando...' : `APLICAR A ${knownCount} ANIMAL${knownCount !== 1 ? 'ES' : ''}`}
          onPress={handleApply}
          size="lg"
          disabled={!isSaveEnabled || applying}
          loading={applying}
          style={styles.applyButton}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    flex: 1,
  },
  countBadge: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    minWidth: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  countText: {
    color: colors.textOnPrimary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.heavy,
  },
  summary: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.sm,
  },
  summaryText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
  },
  tagList: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: spacing.xs,
    maxHeight: 160,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    gap: spacing.sm,
  },
  tagDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tagRfid: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontVariant: ['tabular-nums'],
  },
  tagUnknown: {
    color: colors.textDisabled,
    fontSize: typography.sizes.xs,
  },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    minHeight: spacing.touchTargetLg,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  actionIcon: { fontSize: 24 },
  actionLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
  },
  fieldSection: { gap: spacing.sm },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    paddingHorizontal: spacing.md,
    height: spacing.touchTarget,
  },
  textInputMultiline: {
    height: 80,
    paddingTop: spacing.sm,
    textAlignVertical: 'top',
  },
  loteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  loteOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: spacing.touchTarget,
    justifyContent: 'center',
  },
  loteOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0,214,143,0.12)',
  },
  loteOptionText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
  },
  loteOptionTextSelected: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  applyButton: { marginTop: spacing.sm },
  warningText: {
    color: colors.warning,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
});

export const BatchActionSheet = withObservables([], () => ({
  lotes: database.get<LoteModel>('lotes').query().observe(),
}))(BatchActionSheetInner);
