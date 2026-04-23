import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { BottomSheetModal, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { useDatabase } from '@shared/hooks/useDatabase';
import { useHapticFeedback } from '@shared/hooks/useHapticFeedback';
import { colors, spacing, typography } from '@theme/index';
import { CATEGORIAS_MACHO, CATEGORIAS_HEMBRA, type CategoriaType } from '@core/constants/categories';
import { ESTADO } from '@core/constants/categories';
import type LoteModel from '@data/models/LoteModel';
import { useScanStore, type QueueItem } from '@store/scanStore';

interface Props {
  visible: boolean;
  unknownItems: QueueItem[];
  onClose: () => void;
}

type RegistrationStep = 'select-rfids' | 'fill-data';

// ─── Single RFID row with checkbox ───────────────────────────────────────────

function RfidRow({
  item,
  selected,
  onToggle,
}: {
  item: QueueItem;
  selected: boolean;
  onToggle: (rfid: string) => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.rfidRow, selected && styles.rfidRowSelected]}
      onPress={() => onToggle(item.rfid)}
      activeOpacity={0.8}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
    >
      <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
        {selected && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <Text style={styles.rfidText} numberOfLines={1}>{item.rfid}</Text>
      <View style={styles.newBadge}>
        <Text style={styles.newBadgeText}>NUEVO</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main sheet ───────────────────────────────────────────────────────────────

export function BulkRegistrationSheet({ visible, unknownItems, onClose }: Props) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['60%', '95%'], []);

  const database = useDatabase();
  const { triggerSuccess, triggerSelection } = useHapticFeedback();
  const hydrateQueueItem = useScanStore(s => s.hydrateQueueItem);
  const closeBulkRegistration = useScanStore(s => s.closeBulkRegistration);

  const [step, setStep] = useState<RegistrationStep>('select-rfids');
  const [selectedRfids, setSelectedRfids] = useState<Set<string>>(new Set());
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<CategoriaType | null>(null);
  const [lotes, setLotes] = useState<LoteModel[]>([]);
  const [loteId, setLoteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
      setStep('select-rfids');
      setSelectedRfids(new Set());
      setCategoriaSeleccionada(null);
      setLoteId(null);

      void (async () => {
        try {
          setLotes(await database.get<LoteModel>('lotes').query().fetch());
        } catch (e) {
          console.error('[BulkReg] load lotes error:', e);
        }
      })();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible, database]);

  const handleToggleRfid = useCallback((rfid: string) => {
    triggerSelection();
    setSelectedRfids(prev => {
      const next = new Set(prev);
      if (next.has(rfid)) {
        next.delete(rfid);
      } else {
        next.add(rfid);
      }
      return next;
    });
  }, [triggerSelection]);

  const handleSelectAll = useCallback(() => {
    triggerSelection();
    setSelectedRfids(new Set(unknownItems.map(i => i.rfid)));
  }, [unknownItems, triggerSelection]);

  const handleContinue = useCallback(() => {
    if (selectedRfids.size === 0) return;
    setStep('fill-data');
  }, [selectedRfids]);

  const handleRegister = useCallback(async () => {
    if (!categoriaSeleccionada || !loteId || selectedRfids.size === 0) return;

    setSaving(true);
    try {
      const rfidsArray = Array.from(selectedRfids);
      const sexo: 'M' | 'H' = (CATEGORIAS_MACHO as readonly string[]).includes(categoriaSeleccionada)
        ? 'M'
        : 'H';

      // ── Una sola transacción: sin writes anidadas ──────────────────────────
      // AnimalRepository.create() tiene su propio database.write() interno.
      // Llamarlo dentro de otro write() provoca deadlock en WatermelonDB.
      // Escribimos directo y capturamos los records creados en memoria.
      const created = await database.write(async () => {
        const animalsCollection = database.get<import('@data/models/AnimalModel').default>('animals');
        return Promise.all(
          rfidsArray.map(rfid =>
            animalsCollection.create(animal => {
              animal.idCaravana = rfid;
              animal.sexo = sexo;
              animal.categoria = categoriaSeleccionada;
              animal.raza = '';
              animal.estado = ESTADO.ACTIVO;
              animal.loteId = loteId;
            })
          )
        );
      });

      // Hidratar el store desde los records ya creados — sin re-query ─────────
      created.forEach((animal, idx) => {
        hydrateQueueItem(rfidsArray[idx], {
          status: 'pending',
          animalId: animal.id,
          categoria: categoriaSeleccionada,
          estado: ESTADO.ACTIVO,
        });
      });

      triggerSuccess();
      closeBulkRegistration();
      onClose();
    } catch (error) {
      console.error('[BulkReg] Register error:', error);
      Alert.alert('Error', 'No se pudo registrar los animales. Intente nuevamente.');
    } finally {
      setSaving(false);
    }
  }, [
    categoriaSeleccionada,
    loteId,
    selectedRfids,
    database,
    hydrateQueueItem,
    triggerSuccess,
    closeBulkRegistration,
    onClose,
  ]);

  const isRegisterEnabled =
    categoriaSeleccionada !== null && loteId !== null && selectedRfids.size > 0 && !saving;

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
      {/* ── STEP 1: Selección de RFIDs ── */}
      {step === 'select-rfids' && (
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Animales Nuevos</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{unknownItems.length}</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>
            Seleccioná los RFIDs que quierés registrar juntos con la misma categoría.
          </Text>

          <View style={styles.selectionRow}>
            <TouchableOpacity onPress={handleSelectAll} activeOpacity={0.8}>
              <Text style={styles.selectAllText}>
                {selectedRfids.size === unknownItems.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.selectionCount}>
              {selectedRfids.size} de {unknownItems.length}
            </Text>
          </View>

          <BottomSheetFlatList
            data={unknownItems}
            keyExtractor={item => item.rfid}
            renderItem={({ item }) => (
              <RfidRow
                item={item}
                selected={selectedRfids.has(item.rfid)}
                onToggle={handleToggleRfid}
              />
            )}
            contentContainerStyle={styles.listContent}
            style={styles.list}
          />

          <TouchableOpacity
            style={[styles.continueBtn, selectedRfids.size === 0 && styles.btnDisabled]}
            onPress={handleContinue}
            disabled={selectedRfids.size === 0}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            <Text style={styles.continueBtnText}>
              CONTINUAR CON {selectedRfids.size} SELECCIONADOS →
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── STEP 2: Categoría + Lote ── */}
      {step === 'fill-data' && (
        <BottomSheetFlatList
          data={[]}
          keyExtractor={() => ''}
          renderItem={() => null}
          ListHeaderComponent={
            <View style={styles.content}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => setStep('select-rfids')}
                activeOpacity={0.8}
              >
                <Text style={styles.backBtnText}>← Volver</Text>
              </TouchableOpacity>

              <View style={styles.headerRow}>
                <Text style={styles.title}>Datos del Lote</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{selectedRfids.size}</Text>
                </View>
              </View>
              <Text style={styles.subtitle}>
                Estos datos se aplicarán a los {selectedRfids.size} RFIDs seleccionados.
              </Text>

              {/* Categoría */}
              <Text style={styles.sectionLabel}>CATEGORÍA</Text>
              <View style={styles.grid}>
                {[...CATEGORIAS_MACHO, ...CATEGORIAS_HEMBRA].map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.chipOption, categoriaSeleccionada === cat && styles.chipSelected]}
                    onPress={() => { triggerSelection(); setCategoriaSeleccionada(cat); }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, categoriaSeleccionada === cat && styles.chipTextSelected]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Lote */}
              <Text style={styles.sectionLabel}>LOTE / POTRERO</Text>
              {lotes.length === 0 ? (
                <Text style={styles.noLotesText}>No hay lotes. Creá uno primero.</Text>
              ) : (
                <View style={styles.grid}>
                  {lotes.map(lote => (
                    <TouchableOpacity
                      key={lote.id}
                      style={[styles.chipOption, loteId === lote.id && styles.chipSelected]}
                      onPress={() => { triggerSelection(); setLoteId(lote.id); }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.chipText, loteId === lote.id && styles.chipTextSelected]}>
                        {lote.nombre}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={[styles.registerBtn, !isRegisterEnabled && styles.btnDisabled]}
                onPress={handleRegister}
                disabled={!isRegisterEnabled}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                {saving ? (
                  <ActivityIndicator color={colors.textOnPrimary} />
                ) : (
                  <Text style={styles.registerBtnText}>
                    REGISTRAR {selectedRfids.size} ANIMAL{selectedRfids.size !== 1 ? 'ES' : ''}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          }
        />
      )}
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
    flex: 1,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    flex: 1,
  },
  countBadge: {
    backgroundColor: colors.warning,
    borderRadius: 12,
    minWidth: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  countText: {
    color: colors.background,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.heavy,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
  },
  selectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectAllText: {
    color: colors.primary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  selectionCount: {
    color: colors.textDisabled,
    fontSize: typography.sizes.xs,
  },
  list: { flex: 1, maxHeight: 300 },
  listContent: { gap: spacing.xs },
  rfidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    gap: spacing.sm,
    minHeight: 44,
  },
  rfidRowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryAlpha,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.textOnPrimary,
    fontSize: 12,
    fontWeight: typography.weights.heavy,
  },
  rfidText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
  newBadge: {
    backgroundColor: colors.warningAlpha,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.warning,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  newBadgeText: {
    color: colors.warning,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  continueBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    height: spacing.touchTargetLg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  continueBtnText: {
    color: colors.textOnPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.heavy,
    letterSpacing: 1,
  },
  backBtn: { alignSelf: 'flex-start' },
  backBtnText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: spacing.xs,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chipOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: spacing.touchTarget,
    justifyContent: 'center',
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.primaryAlpha },
  chipText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
  },
  chipTextSelected: { color: colors.primary, fontWeight: typography.weights.bold },
  noLotesText: {
    color: colors.textDisabled,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
  },
  registerBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    height: spacing.touchTargetLg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  registerBtnText: {
    color: colors.textOnPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.heavy,
    letterSpacing: 1.5,
  },
  btnDisabled: { opacity: 0.4 },
});
