import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useDatabase } from '@shared/hooks/useDatabase';
import { useHapticFeedback } from '@shared/hooks/useHapticFeedback';
import { useScanStore, type QueueItem } from '@store/scanStore';
import { EVENTO_TIPO } from '@core/constants/eventTypes';
import type EventoModel from '@data/models/EventoModel';
import type AnimalModel from '@data/models/AnimalModel';
import { CATEGORIAS_MACHO, CATEGORIAS_HEMBRA, type CategoriaType } from '@core/constants/categories';
import { colors, spacing, typography } from '@theme/index';
import { AnimalRegistrationModal } from '../AnimalRegistrationModal';

type ActionType = 'PESAJE' | 'VACUNACION' | 'CAMBIO_CATEGORIA';

export interface ItemDetailModalProps {
  item: QueueItem | null;
  bottomSheetRef: React.RefObject<BottomSheetModal | null>;
  onClose: () => void;
  onProcessed: (rfid: string) => void;
}

// ─── Pending Registration ─────────────────────────────────────────────────────

function PendingRegistrationContent({
  rfid,
  onClose,
  onRegistered,
}: {
  rfid: string;
  onClose: () => void;
  onRegistered: (animal: AnimalModel) => void;
}) {
  const [showModal, setShowModal] = useState(false);

  return (
    <View style={styles.sectionContent}>
      <View style={styles.badgeWarning}>
        <Text style={styles.badgeWarningText}>🔍 RFID no registrado</Text>
      </View>
      <Text style={styles.rfidMono}>{rfid}</Text>
      <Text style={styles.unregisteredMessage}>
        Este animal no está en el sistema. Podés registrarlo ahora con sus datos básicos.
      </Text>

      <TouchableOpacity
        style={styles.registerBtn}
        onPress={() => setShowModal(true)}
        activeOpacity={0.8}
        accessibilityRole="button"
      >
        <Text style={styles.registerBtnText}>REGISTRAR ANIMAL</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.closeBtn}
        onPress={onClose}
        activeOpacity={0.8}
        accessibilityRole="button"
      >
        <Text style={styles.closeBtnText}>OMITIR</Text>
      </TouchableOpacity>

      {/* BottomSheetModal — no choca con el padre porque ambos son BottomSheet */}
      <AnimalRegistrationModal
        visible={showModal}
        rfid={rfid}
        onClose={() => setShowModal(false)}
        onSaved={(animal) => {
          setShowModal(false);
          onRegistered(animal);
        }}
      />
    </View>
  );
}

// ─── Processed ────────────────────────────────────────────────────────────────

function ProcessedContent({ item, onClose }: { item: QueueItem; onClose: () => void }) {
  return (
    <View style={styles.sectionContent}>
      <Text style={styles.rfidMono}>{item.rfid}</Text>
      {item.categoria != null && (
        <Text style={styles.animalMeta}>{item.categoria}</Text>
      )}
      {item.estado != null && (
        <Text style={styles.animalMeta}>{item.estado}</Text>
      )}
      <Text style={styles.processedCheck}>✓ Ya procesado</Text>
      <TouchableOpacity
        style={styles.closeBtn}
        onPress={onClose}
        activeOpacity={0.8}
        accessibilityRole="button"
      >
        <Text style={styles.closeBtnText}>CERRAR</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Pending (known animal, apply action) ─────────────────────────────────────

function PendingContent({
  item,
  onClose,
  onProcessed,
}: {
  item: QueueItem;
  onClose: () => void;
  onProcessed: (rfid: string) => void;
}) {
  const database = useDatabase();
  const { triggerSuccess } = useHapticFeedback();
  const hydrateQueueItem = useScanStore(s => s.hydrateQueueItem);

  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);
  const [pesoValue, setPesoValue] = useState('');
  const [vacunaValue, setVacunaValue] = useState('');
  const [notas, setNotas] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<CategoriaType | null>(null);
  const [saving, setSaving] = useState(false);

  const canSave =
    selectedAction !== null &&
    (selectedAction === 'PESAJE'
      ? pesoValue.trim().length > 0
      : selectedAction === 'VACUNACION'
      ? vacunaValue.trim().length > 0
      : categoriaSeleccionada !== null);

  const handleSave = useCallback(async () => {
    if (!selectedAction || !item.animalId) return;

    setSaving(true);
    try {
      await database.write(async () => {
        if (selectedAction === 'CAMBIO_CATEGORIA' && categoriaSeleccionada) {
          const animalRecord = await database.get<AnimalModel>('animals').find(item.animalId!);
          await animalRecord.update((a) => {
            a.categoria = categoriaSeleccionada;
          });
        } else {
          await database.get<EventoModel>('eventos').create((evento) => {
            evento.animalId = item.animalId!;
            evento.tipo =
              selectedAction === 'PESAJE' ? EVENTO_TIPO.PESAJE : EVENTO_TIPO.VACUNACION;
            evento.valor = selectedAction === 'PESAJE' ? parseFloat(pesoValue) : null;
            evento.notas =
              selectedAction === 'PESAJE'
                ? notas.trim()
                : `${vacunaValue.trim()}${notas.trim() ? ` - ${notas.trim()}` : ''}`;
            evento.loteDestinoId = null;
            evento.timestamp = Date.now();
          });
        }
      });

      hydrateQueueItem(item.rfid, { status: 'processed' });
      triggerSuccess();
      onProcessed(item.rfid);
    } catch (error) {
      console.error('[ItemDetailModal] Save error:', error);
      Alert.alert('Error', 'No se pudo guardar el evento. Intente nuevamente.');
    } finally {
      setSaving(false);
    }
  }, [
    selectedAction,
    item,
    pesoValue,
    vacunaValue,
    notas,
    categoriaSeleccionada,
    database,
    hydrateQueueItem,
    triggerSuccess,
    onProcessed,
  ]);

  return (
    <View style={styles.sectionContent}>
      <Text style={styles.rfidMono}>{item.rfid}</Text>
      {item.categoria != null && (
        <Text style={styles.animalMeta}>{item.categoria}</Text>
      )}
      {item.estado != null && (
        <Text style={styles.animalMeta}>{item.estado}</Text>
      )}

      {/* Action selector */}
      <Text style={styles.sectionLabel}>ACCION</Text>
      <View style={styles.actionRow}>
        {(['PESAJE', 'VACUNACION', 'CAMBIO_CATEGORIA'] as ActionType[]).map((action) => {
          const ICONS: Record<ActionType, string> = { PESAJE: '⚖️', VACUNACION: '💉', CAMBIO_CATEGORIA: '🏷️' };
          const LABELS: Record<ActionType, string> = { PESAJE: 'Pesaje', VACUNACION: 'Vacunación', CAMBIO_CATEGORIA: 'Categoría' };
          return (
            <TouchableOpacity
              key={action}
              style={[styles.actionCard, selectedAction === action && styles.actionCardSelected]}
              onPress={() => setSelectedAction(action)}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              <Text style={styles.actionCardIcon}>{ICONS[action]}</Text>
              <Text style={[styles.actionCardLabel, selectedAction === action && styles.actionCardLabelSelected]}>
                {LABELS[action]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {selectedAction === 'PESAJE' && (
        <View style={styles.fieldSection}>
          <Text style={styles.fieldLabel}>PESO (kg)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Ej: 320.5"
            placeholderTextColor={colors.textDisabled}
            keyboardType="decimal-pad"
            value={pesoValue}
            onChangeText={setPesoValue}
            returnKeyType="done"
          />
        </View>
      )}

      {selectedAction === 'VACUNACION' && (
        <View style={styles.fieldSection}>
          <Text style={styles.fieldLabel}>VACUNA</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Ej: Aftosa, Brucelosis..."
            placeholderTextColor={colors.textDisabled}
            value={vacunaValue}
            onChangeText={setVacunaValue}
            returnKeyType="done"
          />
        </View>
      )}

      {selectedAction === 'CAMBIO_CATEGORIA' && (
        <View style={styles.fieldSection}>
          <Text style={styles.fieldLabel}>NUEVA CATEGORÍA</Text>
          <View style={styles.categoriaGrid}>
            {[...CATEGORIAS_MACHO, ...CATEGORIAS_HEMBRA].map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoriaOption, categoriaSeleccionada === cat && styles.categoriaOptionSelected]}
                onPress={() => setCategoriaSeleccionada(cat)}
                activeOpacity={0.8}
              >
                <Text style={[styles.categoriaOptionText, categoriaSeleccionada === cat && styles.categoriaOptionTextSelected]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {selectedAction !== null && selectedAction !== 'CAMBIO_CATEGORIA' && (
        <View style={styles.fieldSection}>
          <Text style={styles.fieldLabel}>NOTAS (opcional)</Text>
          <TextInput
            style={[styles.textInput, styles.textInputMultiline]}
            placeholder="Observaciones..."
            placeholderTextColor={colors.textDisabled}
            multiline
            value={notas}
            onChangeText={setNotas}
          />
        </View>
      )}

      <View style={styles.footerRow}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8} accessibilityRole="button">
          <Text style={styles.cancelBtnText}>CANCELAR</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveBtn, (!canSave || saving) && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!canSave || saving}
          activeOpacity={0.8}
          accessibilityRole="button"
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.textOnPrimary} />
          ) : (
            <Text style={styles.saveBtnText}>GUARDAR</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Modal — now BottomSheetModal to avoid native Modal stacking bug ─────

export function ItemDetailModal({ item, bottomSheetRef, onClose, onProcessed }: ItemDetailModalProps) {
  const snapPoints = React.useMemo(() => ['50%', '85%'], []);
  const hydrateQueueItem = useScanStore(s => s.hydrateQueueItem);

  const title =
    item?.status === 'pending_registration'
      ? 'Animal Desconocido'
      : item?.status === 'processed'
      ? 'Detalle'
      : 'Registrar Evento';

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      backgroundStyle={styles.sheet}
      handleIndicatorStyle={styles.handle}
      onDismiss={onClose}
      enablePanDownToClose
    >
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sheetTitle}>{title}</Text>

        {item?.status === 'pending_registration' && (
          <PendingRegistrationContent
            rfid={item.rfid}
            onClose={onClose}
            onRegistered={(animal) => {
              // Hidratar el store para que el item pase de pending_registration -> pending
              hydrateQueueItem(item.rfid, {
                status: 'pending',
                animalId: animal.id,
                categoria: animal.categoria as any,
                estado: animal.estado as any,
              });
              // No cerramos el modal, el re-render cambiará el contenido a PendingContent
            }}
          />
        )}

        {(item?.status === 'pending' || item?.status === 'processing') && item != null && (
          <PendingContent item={item} onClose={onClose} onProcessed={onProcessed} />
        )}

        {item?.status === 'processed' && item != null && (
          <ProcessedContent item={item} onClose={onClose} />
        )}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: colors.surfaceElevated },
  handle: { backgroundColor: colors.border, width: 40 },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  sheetTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
  },
  sectionContent: { gap: spacing.md },
  rfidMono: {
    color: colors.textPrimary,
    fontSize: typography.sizes.lg,
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    fontWeight: typography.weights.bold,
  },
  animalMeta: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    fontWeight: typography.weights.medium,
  },
  badgeWarning: {
    alignSelf: 'center',
    backgroundColor: colors.warningAlpha,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.warning,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  badgeWarningText: {
    color: colors.warning,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  unregisteredMessage: {
    color: colors.textDisabled,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  processedCheck: {
    color: colors.success,
    fontSize: typography.sizes.md,
    textAlign: 'center',
    fontWeight: typography.weights.semibold,
  },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  actionCard: {
    flex: 1,
    minHeight: spacing.touchTarget,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  actionCardSelected: { borderColor: colors.primary, backgroundColor: colors.primaryAlpha },
  actionCardIcon: { fontSize: 24 },
  actionCardLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
  },
  actionCardLabelSelected: { color: colors.primary },
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
  textInputMultiline: { height: 80, paddingTop: spacing.sm, textAlignVertical: 'top' },
  footerRow: { flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.sm },
  cancelBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  saveBtn: {
    flex: 2,
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: {
    color: colors.textOnPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.heavy,
    letterSpacing: 1.5,
  },
  closeBtn: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    letterSpacing: 1,
  },
  registerBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerBtnText: {
    color: colors.textOnPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.heavy,
    letterSpacing: 1.5,
  },
  categoriaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  categoriaOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  categoriaOptionSelected: { borderColor: colors.primary, backgroundColor: colors.primaryAlpha },
  categoriaOptionText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  categoriaOptionTextSelected: { color: colors.primary, fontWeight: typography.weights.bold },
});
