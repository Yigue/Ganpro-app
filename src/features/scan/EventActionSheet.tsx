import React, { useCallback, useEffect, useRef, useMemo, useState } from 'react';
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
import { useHapticFeedback } from '@shared/hooks/useHapticFeedback';
import { Button } from '@shared/components/Button';
import { colors, spacing, typography } from '@theme/index';
import { EVENTO_TIPO, type EventoTipoType } from '@core/constants/eventTypes';
import { calcularDensidadCarga } from '@core/utils/gisEngine';
import type AnimalModel from '@data/models/AnimalModel';
import type LoteModel from '@data/models/LoteModel';
import { OperationLogModel } from '@data/models/OperationLogModel';
import { AnimalRepository } from '@data/repositories/AnimalRepository';
import { EventoRepository } from '@data/repositories/EventoRepository';
import { SanidadRepository } from '@data/repositories/SanidadRepository';
import { CATEGORIA, type CategoriaType } from '@core/constants/categories';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Q } from '@nozbe/watermelondb';

interface Props {
  visible: boolean;
  rfid: string;
  onClose: () => void;
}

const ACTIONS: { tipo: EventoTipoType; label: string; icon: string; color: string }[] = [
  { tipo: EVENTO_TIPO.PESAJE, label: 'Pesaje', icon: '⚖️', color: colors.info },
  { tipo: EVENTO_TIPO.VACUNACION, label: 'Vacunación', icon: '💉', color: colors.warning },
  { tipo: EVENTO_TIPO.CAMBIO_LOTE, label: 'Cambio de Lote', icon: '🔀', color: colors.primary },
  { tipo: EVENTO_TIPO.TACTO, label: 'Tacto', icon: '🔬', color: colors.purple },
  { tipo: EVENTO_TIPO.OTRO, label: 'Otro', icon: '📋', color: colors.textSecondary },
];

type TactoResultado = 'prenada' | 'vacia' | null;

export function EventActionSheet({ visible, rfid, onClose }: Props) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['55%', '90%'], []);

  const database = useDatabase();
  const { triggerSelection, triggerSuccess } = useHapticFeedback();

  const [animal, setAnimal] = useState<AnimalModel | null>(null);
  const [selectedAction, setSelectedAction] = useState<EventoTipoType | null>(null);
  const [peso, setPeso] = useState('');
  const [notas, setNotas] = useState('');
  const [lotes, setLotes] = useState<LoteModel[]>([]);
  const [loteDestinoId, setLoteDestinoId] = useState<string | null>(null);
  const [nuevaCategoria, setNuevaCategoria] = useState<CategoriaType | null>(null);
  const [tactoResultado, setTactoResultado] = useState<TactoResultado>(null);
  const [dteNumero, setDteNumero] = useState('');
  const [saving, setSaving] = useState(false);

  // Carencia state
  const [carenciaDetalle, setCarenciaDetalle] = useState<OperationLogModel | null>(null);
  const enCarencia = carenciaDetalle != null;

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
      setSelectedAction(null);
      setPeso('');
      setNotas('');
      setLoteDestinoId(null);
      setNuevaCategoria(null);
      setTactoResultado(null);
      setDteNumero('');
      setCarenciaDetalle(null);

      void (async () => {
        try {
          const animalRepo = new AnimalRepository(database);
          const sanidadRepo = new SanidadRepository(database);

          const [foundAnimal, loadedLotes] = await Promise.all([
            animalRepo.findByRfid(rfid),
            database.get<LoteModel>('lotes').query().fetch(),
          ]);

          setAnimal(foundAnimal);
          setLotes(loadedLotes);

          if (foundAnimal) {
            const carencia = await sanidadRepo.getCarenciaActivaDetalle(foundAnimal.id);
            setCarenciaDetalle(carencia);
          }
        } catch (e) {
          console.error('[EventActionSheet] load error:', e);
        }
      })();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible, rfid, database]);

  const handleSave = useCallback(async () => {
    if (!selectedAction || !animal) return;
    setSaving(true);
    try {
      const animalRepo = new AnimalRepository(database);
      const eventoRepo = new EventoRepository(database);

      if (selectedAction === EVENTO_TIPO.CAMBIO_LOTE && loteDestinoId) {
        const loteOrigenId = animal.loteId;

        await animalRepo.transferToLote(animal, loteDestinoId, notas);

        // Recalculate densidad for both lotes after transfer
        const [countOrigen, countDestino, loteOrigen, loteDest] = await Promise.all([
          database.get<AnimalModel>('animals')
            .query(Q.where('lote_id', loteOrigenId), Q.where('estado', 'ACTIVO'))
            .fetchCount(),
          database.get<AnimalModel>('animals')
            .query(Q.where('lote_id', loteDestinoId), Q.where('estado', 'ACTIVO'))
            .fetchCount(),
          database.get<LoteModel>('lotes').find(loteOrigenId),
          database.get<LoteModel>('lotes').find(loteDestinoId),
        ]);

        await database.write(async () => {
          await loteOrigen.update((l) => {
            l.densidadCarga = calcularDensidadCarga(countOrigen, l.hectareas ?? 0);
          });
          await loteDest.update((l) => {
            l.densidadCarga = calcularDensidadCarga(countDestino, l.hectareas ?? 0);
          });
        });
      } else if (selectedAction === EVENTO_TIPO.TACTO) {
        const notasTacto = tactoResultado != null
          ? `tacto:${tactoResultado}${notas.trim() ? ' ' + notas.trim() : ''}`
          : notas;

        await eventoRepo.create({
          animalId: animal.id,
          tipo: selectedAction,
          notas: notasTacto,
        });

        const categoriaFinal = tactoResultado === 'vacia'
          ? ('Vaca Descarte' as CategoriaType)
          : nuevaCategoria;

        if (categoriaFinal && categoriaFinal !== animal.categoria) {
          await animalRepo.updateCategoria(animal, categoriaFinal);
        }
      } else {
        await eventoRepo.create({
          animalId: animal.id,
          tipo: selectedAction,
          valor: selectedAction === EVENTO_TIPO.PESAJE ? parseFloat(peso) || undefined : undefined,
          notas,
        });
      }

      triggerSuccess();
      onClose();
    } catch (error) {
      console.error('[EventActionSheet] Save error:', error);
      Alert.alert('Error', 'No se pudo guardar el evento. Intente nuevamente.');
    } finally {
      setSaving(false);
    }
  }, [
    selectedAction,
    animal,
    database,
    peso,
    notas,
    loteDestinoId,
    nuevaCategoria,
    tactoResultado,
    dteNumero,
    triggerSuccess,
    onClose,
  ]);

  const isSaveEnabled =
    selectedAction !== null &&
    (selectedAction !== EVENTO_TIPO.PESAJE || peso.length > 0) &&
    (selectedAction !== EVENTO_TIPO.CAMBIO_LOTE || loteDestinoId !== null) &&
    (selectedAction !== EVENTO_TIPO.VACUNACION || !enCarencia) &&
    !saving;

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
        <Text style={styles.title}>Acciones de Lote</Text>
        <Text style={styles.rfidText}>{rfid}</Text>

        {/* Carencia banner */}
        {enCarencia && carenciaDetalle != null && (
          <View style={styles.carenciaBanner}>
            <Text style={styles.carenciaBannerTitle}>
              ⚠️ EN CARENCIA
            </Text>
            <Text style={styles.carenciaBannerBody}>
              Libre el{' '}
              {format(new Date(carenciaDetalle.fechaFinCarencia), 'dd/MM/yyyy', { locale: es })}
              {' · '}
              {Math.ceil((carenciaDetalle.fechaFinCarencia - Date.now()) / 86_400_000)} días restantes
            </Text>
            <Text style={styles.carenciaBannerSub}>
              Vacunación deshabilitada hasta que expire la carencia
            </Text>
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actionsGrid}>
          {ACTIONS.map((action) => {
            const isDisabled = action.tipo === EVENTO_TIPO.VACUNACION && enCarencia;
            return (
              <TouchableOpacity
                key={action.tipo}
                style={[
                  styles.actionButton,
                  selectedAction === action.tipo && {
                    borderColor: action.color,
                    backgroundColor: `${action.color}20`,
                  },
                  isDisabled && styles.actionButtonDisabled,
                ]}
                onPress={() => {
                  if (isDisabled) return;
                  triggerSelection();
                  setSelectedAction(action.tipo);
                }}
                activeOpacity={isDisabled ? 1 : 0.8}
                accessibilityState={{ disabled: isDisabled }}
              >
                <Text style={[styles.actionIcon, isDisabled && styles.actionIconDisabled]}>
                  {action.icon}
                </Text>
                <Text
                  style={[
                    styles.actionLabel,
                    selectedAction === action.tipo && { color: action.color },
                    isDisabled && styles.actionLabelDisabled,
                  ]}
                >
                  {action.label}
                </Text>
                {isDisabled && (
                  <Text style={styles.actionDisabledTag}>carencia</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* PESAJE */}
        {selectedAction === EVENTO_TIPO.PESAJE && (
          <View style={styles.fieldSection}>
            <Text style={styles.fieldLabel}>PESO (kg)</Text>
            <RNTextInput
              style={styles.textInput}
              placeholder="Ej: 320"
              placeholderTextColor={colors.textDisabled}
              keyboardType="numeric"
              value={peso}
              onChangeText={setPeso}
              returnKeyType="done"
            />
          </View>
        )}

        {/* CAMBIO_LOTE */}
        {selectedAction === EVENTO_TIPO.CAMBIO_LOTE && (
          <View style={styles.fieldSection}>
            <Text style={styles.fieldLabel}>LOTE DESTINO</Text>
            <View style={styles.loteGrid}>
              {lotes
                .filter((l) => l.id !== animal?.loteId)
                .map((lote) => (
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
            <Text style={styles.fieldLabel}>N° DTe / DTA (opcional)</Text>
            <RNTextInput
              style={styles.textInput}
              placeholder="Ej: DTA-2025-001"
              placeholderTextColor={colors.textDisabled}
              value={dteNumero}
              onChangeText={setDteNumero}
            />
          </View>
        )}

        {/* TACTO — resultado rápido */}
        {selectedAction === EVENTO_TIPO.TACTO && (
          <View style={styles.fieldSection}>
            <Text style={styles.fieldLabel}>RESULTADO DEL TACTO</Text>
            <View style={styles.tactoRow}>
              <TouchableOpacity
                style={[
                  styles.tactoBtn,
                  tactoResultado === 'prenada' && styles.tactoBtnPrenada,
                ]}
                onPress={() => {
                  triggerSelection();
                  setTactoResultado(tactoResultado === 'prenada' ? null : 'prenada');
                  if (tactoResultado !== 'prenada') setNuevaCategoria(null);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.tactoBtnIcon}>✓</Text>
                <Text style={[
                  styles.tactoBtnText,
                  tactoResultado === 'prenada' && styles.tactoBtnTextPrenada,
                ]}>
                  Preñada
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tactoBtn,
                  tactoResultado === 'vacia' && styles.tactoBtnVacia,
                ]}
                onPress={() => {
                  triggerSelection();
                  setTactoResultado(tactoResultado === 'vacia' ? null : 'vacia');
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.tactoBtnIcon}>🗑️</Text>
                <Text style={[
                  styles.tactoBtnText,
                  tactoResultado === 'vacia' && styles.tactoBtnTextVacia,
                ]}>
                  Vacía — Descarte
                </Text>
              </TouchableOpacity>
            </View>
            {tactoResultado === 'vacia' && (
              <Text style={styles.tactoDescarteNote}>
                Categoría cambiará a Vaca Descarte
              </Text>
            )}
          </View>
        )}

        {/* NOTAS — para todos excepto PESAJE */}
        {selectedAction && selectedAction !== EVENTO_TIPO.PESAJE && (
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

        <Button
          label="REGISTRAR EVENTO"
          onPress={handleSave}
          size="lg"
          disabled={!isSaveEnabled}
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
  rfidText: {
    color: colors.primary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    fontVariant: ['tabular-nums'],
  },
  // Carencia banner
  carenciaBanner: {
    backgroundColor: colors.errorAlpha,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 12,
    padding: spacing.md,
    gap: 4,
  },
  carenciaBannerTitle: {
    color: colors.error,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  carenciaBannerBody: {
    color: colors.error,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  carenciaBannerSub: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
  },
  // Actions grid
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionButton: {
    width: '30%',
    flexGrow: 1,
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
  actionButtonDisabled: {
    opacity: 0.35,
  },
  actionIcon: { fontSize: 28 },
  actionIconDisabled: { opacity: 0.5 },
  actionLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
  },
  actionLabelDisabled: { color: colors.textDisabled },
  actionDisabledTag: {
    color: colors.error,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  // Fields
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
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    paddingHorizontal: spacing.md,
    height: spacing.touchTarget,
  },
  textInputMultiline: {
    height: 80,
    paddingTop: spacing.sm,
    textAlignVertical: 'top',
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.regular,
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
    backgroundColor: colors.primaryAlpha,
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
  // Tacto
  tactoRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tactoBtn: {
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
  tactoBtnPrenada: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryAlpha,
  },
  tactoBtnVacia: {
    borderColor: colors.error,
    backgroundColor: colors.errorAlpha,
  },
  tactoBtnIcon: { fontSize: 24 },
  tactoBtnText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
  },
  tactoBtnTextPrenada: { color: colors.primary },
  tactoBtnTextVacia: { color: colors.error },
  tactoDescarteNote: {
    color: colors.error,
    fontSize: typography.sizes.xs,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  saveButton: { marginTop: spacing.sm },
});
