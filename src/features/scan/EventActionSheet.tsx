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
import { Q } from '@nozbe/watermelondb';
import { useDatabase } from '@shared/hooks/useDatabase';
import { useHapticFeedback } from '@shared/hooks/useHapticFeedback';
import { Button } from '@shared/components/Button';
import { colors, spacing, typography } from '@theme/index';
import { EVENTO_TIPO, type EventoTipoType } from '@core/constants/eventTypes';
import AnimalModel from '@data/models/AnimalModel';
import EventoModel from '@data/models/EventoModel';
import LoteModel from '@data/models/LoteModel';

interface Props {
  visible: boolean;
  rfid: string;
  onClose: () => void;
}

const ACTIONS: { tipo: EventoTipoType; label: string; icon: string; color: string }[] = [
  { tipo: EVENTO_TIPO.PESAJE, label: 'Pesaje', icon: '⚖️', color: colors.info },
  { tipo: EVENTO_TIPO.VACUNACION, label: 'Vacunación', icon: '💉', color: colors.warning },
  { tipo: EVENTO_TIPO.CAMBIO_LOTE, label: 'Cambio de Lote', icon: '🔀', color: colors.primary },
  { tipo: EVENTO_TIPO.TACTO, label: 'Tacto', icon: '🔬', color: '#C35BD0' },
  { tipo: EVENTO_TIPO.OTRO, label: 'Otro', icon: '📋', color: colors.textSecondary },
];

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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
      setSelectedAction(null);
      setPeso('');
      setNotas('');
      setLoteDestinoId(null);

      // Load animal
      database
        .get<AnimalModel>('animals')
        .query(Q.where('id_caravana', rfid))
        .fetch()
        .then((r) => setAnimal(r[0] ?? null))
        .catch(console.error);

      // Load lotes for CAMBIO_LOTE
      database
        .get<LoteModel>('lotes')
        .query()
        .fetch()
        .then(setLotes)
        .catch(console.error);
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible, rfid, database]);

  const handleSave = useCallback(async () => {
    if (!selectedAction || !animal) return;
    setSaving(true);
    try {
      await database.write(async () => {
        // Create event
        await database.get<EventoModel>('eventos').create((evento) => {
          evento.animalId = animal.id;
          evento.tipo = selectedAction;
          evento.valor = selectedAction === EVENTO_TIPO.PESAJE ? parseFloat(peso) || null : null;
          evento.notas = notas;
          evento.loteDestinoId =
            selectedAction === EVENTO_TIPO.CAMBIO_LOTE ? loteDestinoId : null;
          evento.timestamp = Date.now();
        });

        // If CAMBIO_LOTE, update animal's lote_id
        if (selectedAction === EVENTO_TIPO.CAMBIO_LOTE && loteDestinoId) {
          await animal.update((a) => {
            a.loteId = loteDestinoId;
          });
        }
      });

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
    triggerSuccess,
    onClose,
  ]);

  const isSaveEnabled =
    selectedAction !== null &&
    (selectedAction !== EVENTO_TIPO.PESAJE || peso.length > 0) &&
    (selectedAction !== EVENTO_TIPO.CAMBIO_LOTE || loteDestinoId !== null);

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

        {/* Action buttons */}
        <View style={styles.actionsGrid}>
          {ACTIONS.map((action) => (
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

        {/* Conditional fields */}
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
          </View>
        )}

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
  actionIcon: { fontSize: 28 },
  actionLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
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
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
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
  saveButton: { marginTop: spacing.sm },
});
