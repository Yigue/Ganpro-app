import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import withObservables from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { database } from '@data/database/database';
import { SanidadRepository } from '@data/repositories/SanidadRepository';
import { AnimalRepository } from '@data/repositories/AnimalRepository';
import type AnimalModel from '@data/models/AnimalModel';
import type EventoModel from '@data/models/EventoModel';
import type LoteModel from '@data/models/LoteModel';

import { ObservableErrorBoundary } from '@shared/components/ObservableErrorBoundary';
import { EmptyState } from '@shared/components/EmptyState';
import { StatusBadge } from '@shared/components/StatusBadge';
import { Button } from '@shared/components/Button';
import { colors, spacing, typography } from '@theme/index';
import { CATEGORIA, type CategoriaType } from '@core/constants/categories';

// ─── Repositories (singletons) ──────────────────────────────────────────────

const sanidadRepo = new SanidadRepository(database);
const animalRepo = new AnimalRepository(database);

// ─── AnimalDetailModal ───────────────────────────────────────────────────────

interface AnimalDetailModalProps {
  animal: AnimalModel | null;
  loteMap: Map<string, string>;
  loteUbicacionMap: Map<string, string>;
  onClose: () => void;
  onAnimalUpdated: () => void;
}

interface ModalData {
  loteName: string;
  loteUbicacion: string;
  lastPesaje: EventoModel | null;
  pesajes: EventoModel[];
  movimientos: EventoModel[];
  enCarencia: boolean;
}

function AnimalDetailModal({
  animal,
  loteMap,
  loteUbicacionMap,
  onClose,
  onAnimalUpdated,
}: AnimalDetailModalProps) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['80%', '95%'], []);

  const [modalData, setModalData] = useState<ModalData | null>(null);
  const [loadingBaja, setLoadingBaja] = useState(false);

  useEffect(() => {
    if (animal) {
      sheetRef.current?.present();
    } else {
      sheetRef.current?.dismiss();
    }
  }, [animal]);

  useEffect(() => {
    if (!animal) return;
    let cancelled = false;

    async function load() {
      if (!animal) return;

      const loteName = loteMap.get(animal.loteId) ?? 'Sin potrero';
      const loteUbicacion = loteUbicacionMap.get(animal.loteId) ?? '';

      const allEventos = await database
        .get<EventoModel>('eventos')
        .query(
          Q.where('animal_id', animal.id),
          Q.sortBy('timestamp', Q.desc),
        )
        .fetch();

      const pesajes = allEventos
        .filter((e) => e.tipo === 'PESAJE')
        .slice(0, 5);

      const movimientos = allEventos
        .filter((e) => e.tipo === 'CAMBIO_LOTE')
        .slice(0, 10);

      const lastPesaje = pesajes[0] ?? null;

      const enCarencia = await sanidadRepo.isAnimalEnCarencia(animal.id);

      if (!cancelled) {
        setModalData({ loteName, loteUbicacion, lastPesaje, pesajes, movimientos, enCarencia });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [animal, loteMap, loteUbicacionMap]);

  const handleDarDeBaja = useCallback(() => {
    if (!animal) return;
    Alert.alert(
      'Dar de baja',
      `¿Confirmar baja del animal ${animal.idCaravana}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: 'destructive',
          onPress: async () => {
            setLoadingBaja(true);
            try {
              await animalRepo.updateEstado(animal, 'VENDIDO');
              onAnimalUpdated();
              onClose();
            } catch (err) {
              console.error('[AnimalDetailModal] updateEstado error:', err);
              Alert.alert('Error', 'No se pudo dar de baja el animal.');
            } finally {
              setLoadingBaja(false);
            }
          },
        },
      ],
    );
  }, [animal, onAnimalUpdated, onClose]);

  const animalAge = useMemo(() => {
    if (!animal) return null;
    return Math.floor(
      (Date.now() - (animal.fechaNacimiento ?? Date.now())) / (365.25 * 86400000),
    );
  }, [animal]);

  if (!animal) return null;

  return (
    <BottomSheetModal
      ref={sheetRef}
      index={0}
      snapPoints={snapPoints}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.sheetIndicator}
      onDismiss={onClose}
      enablePanDownToClose
    >
      <BottomSheetScrollView contentContainerStyle={styles.modalContent}>
        {/* Header row */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalRfid}>{animal.idCaravana}</Text>
          <View style={styles.modalBadges}>
            <StatusBadge
              label={animal.categoria}
              categoria={animal.categoria as CategoriaType}
            />
            <View style={styles.badgeSpacer} />
            <StatusBadge
              label={animal.estado}
              color={animal.estado === 'ACTIVO' ? colors.primary : colors.error}
            />
          </View>
        </View>

        {/* Carencia banner */}
        {modalData?.enCarencia && (
          <View style={styles.carenciaBanner}>
            <Text style={styles.carenciaText}>
              {'⚠️ EN PERÍODO DE CARENCIA'}
            </Text>
          </View>
        )}

        {/* Info grid */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCell}>
            <Text style={styles.infoCellLabel}>SEXO</Text>
            <Text style={styles.infoCellValue}>
              {animal.sexo === 'M' ? '♂ Macho' : '♀ Hembra'}
            </Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoCellLabel}>EDAD</Text>
            <Text style={styles.infoCellValue}>
              {animalAge !== null && animalAge > 0 ? `${animalAge} años` : '—'}
            </Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoCellLabel}>RAZA</Text>
            <Text style={styles.infoCellValue}>{animal.raza || '—'}</Text>
          </View>
        </View>

        {/* Potrero/Lote card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionCardLabel}>POTRERO / LOTE</Text>
          <Text style={styles.sectionCardValue}>
            {modalData?.loteName ?? '—'}
          </Text>
          {modalData?.loteUbicacion ? (
            <Text style={styles.sectionCardSub}>{modalData.loteUbicacion}</Text>
          ) : null}
        </View>

        {/* Peso actual */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionCardLabel}>PESO ACTUAL</Text>
          {modalData?.lastPesaje ? (
            <>
              <Text style={styles.sectionCardValue}>
                {`${modalData.lastPesaje.valor ?? '—'} kg`}
              </Text>
              <Text style={styles.sectionCardSub}>
                {format(new Date(modalData.lastPesaje.timestamp), 'd MMM yyyy', {
                  locale: es,
                })}
              </Text>
            </>
          ) : (
            <Text style={styles.sectionCardValue}>Sin pesajes</Text>
          )}
        </View>

        {/* Historial de pesajes */}
        {modalData && modalData.pesajes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>HISTORIAL DE PESAJES</Text>
            <FlatList
              data={modalData.pesajes}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <ObservableErrorBoundary key={item.id}>
                  <View style={styles.eventRow}>
                    <Text style={styles.eventDate}>
                      {format(new Date(item.timestamp), 'd MMM yyyy', { locale: es })}
                    </Text>
                    <Text style={styles.eventValue}>{`${item.valor ?? '—'} kg`}</Text>
                  </View>
                </ObservableErrorBoundary>
              )}
              ItemSeparatorComponent={() => <View style={styles.thinSeparator} />}
            />
          </View>
        )}

        {/* Historial de movimientos */}
        {modalData && modalData.movimientos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>HISTORIAL DE MOVIMIENTOS</Text>
            <FlatList
              data={modalData.movimientos}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <ObservableErrorBoundary key={item.id}>
                  <View style={styles.eventRow}>
                    <Text style={styles.eventDate}>
                      {format(new Date(item.timestamp), 'd MMM yyyy', { locale: es })}
                    </Text>
                    <Text style={styles.eventValue}>
                      {item.loteDestinoId
                        ? (loteMap.get(item.loteDestinoId) ?? item.loteDestinoId)
                        : '—'}
                    </Text>
                  </View>
                </ObservableErrorBoundary>
              )}
              ItemSeparatorComponent={() => <View style={styles.thinSeparator} />}
            />
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <Button
            label="Registrar evento 📋"
            onPress={() => {
              // Navigation to event registration — placeholder
            }}
            variant="ghost"
            size="md"
            style={styles.actionButtonGhost}
          />
          <Button
            label="Dar de baja 🔻"
            onPress={handleDarDeBaja}
            variant="danger"
            size="md"
            loading={loadingBaja}
            style={styles.actionButtonDanger}
          />
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

// ─── CategoryAccordionHeader ─────────────────────────────────────────────────

interface CategoryHeaderProps {
  categoria: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
}

function CategoryAccordionHeader({
  categoria,
  count,
  expanded,
  onToggle,
}: CategoryHeaderProps) {
  const catColor =
    colors.category[categoria as CategoriaType] ?? colors.textSecondary;

  return (
    <TouchableOpacity
      style={styles.accordionHeader}
      onPress={onToggle}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${categoria}, ${count} animales, ${expanded ? 'expandido' : 'colapsado'}`}
    >
      <View style={[styles.categoryDot, { backgroundColor: catColor }]} />
      <Text style={styles.accordionCategoryName}>{categoria}</Text>
      <View style={[styles.countBadge, { borderColor: catColor }]}>
        <Text style={[styles.countBadgeText, { color: catColor }]}>{count}</Text>
      </View>
      <Text style={styles.chevron}>{expanded ? '▼' : '▶'}</Text>
    </TouchableOpacity>
  );
}

// ─── AnimalRow ───────────────────────────────────────────────────────────────

interface AnimalRowProps {
  animal: AnimalModel;
  loteMap: Map<string, string>;
  lastWeight: string;
  onPress: (animal: AnimalModel) => void;
}

function AnimalRow({ animal, loteMap, lastWeight, onPress }: AnimalRowProps) {
  const loteName = loteMap.get(animal.loteId) ?? 'Sin potrero';
  const rfidColor = animal.idCaravana ? colors.primary : colors.textPrimary;

  return (
    <TouchableOpacity
      style={styles.animalRow}
      onPress={() => onPress(animal)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Animal ${animal.idCaravana}`}
    >
      {/* Left: RFID */}
      <View style={styles.animalLeft}>
        <Text style={[styles.animalRfid, { color: rfidColor }]}>
          {animal.idCaravana || '—'}
        </Text>
      </View>

      {/* Center: sexo + lote */}
      <View style={styles.animalCenter}>
        <Text style={styles.animalSexo}>
          {animal.sexo === 'M' ? '♂' : '♀'}
        </Text>
        <Text style={styles.animalLote} numberOfLines={1}>
          {loteName}
        </Text>
      </View>

      {/* Right: last weight */}
      <Text style={styles.animalWeight}>{lastWeight}</Text>
    </TouchableOpacity>
  );
}

// ─── AnimalRowWithWeight ──────────────────────────────────────────────────────
// Loads last weight via withObservables for each animal row

interface AnimalRowOuterProps {
  animal: AnimalModel;
  loteMap: Map<string, string>;
  onPress: (animal: AnimalModel) => void;
}

interface AnimalRowInnerProps extends AnimalRowOuterProps {
  lastEvents: EventoModel[];
}

function AnimalRowInner({ animal, loteMap, onPress, lastEvents }: AnimalRowInnerProps) {
  const lastPesaje = useMemo(
    () => lastEvents.find((e) => e.tipo === 'PESAJE'),
    [lastEvents],
  );
  const weightLabel = lastPesaje?.valor != null ? `${lastPesaje.valor} kg` : '—';

  return (
    <AnimalRow
      animal={animal}
      loteMap={loteMap}
      lastWeight={weightLabel}
      onPress={onPress}
    />
  );
}

const AnimalRowWithData = withObservables(['animal'], ({ animal }: AnimalRowOuterProps) => ({
  lastEvents: database
    .get<EventoModel>('eventos')
    .query(
      Q.where('animal_id', animal.id),
      Q.sortBy('timestamp', Q.desc),
      Q.take(10),
    )
    .observe(),
}))(AnimalRowInner);

// ─── InventoryInner ───────────────────────────────────────────────────────────

interface InventoryInnerProps {
  animals: AnimalModel[];
  lotes: LoteModel[];
}

function InventoryInner({ animals, lotes }: InventoryInnerProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(Object.values(CATEGORIA)),
  );
  const [selectedAnimal, setSelectedAnimal] = useState<AnimalModel | null>(null);

  const loteMap = useMemo(() => {
    const map = new Map<string, string>();
    lotes.forEach((l) => map.set(l.id, l.nombre));
    return map;
  }, [lotes]);

  const loteUbicacionMap = useMemo(() => {
    const map = new Map<string, string>();
    lotes.forEach((l) => map.set(l.id, l.ubicacion));
    return map;
  }, [lotes]);

  const grouped = useMemo(() => {
    const map = new Map<string, AnimalModel[]>();
    animals.forEach((a) => {
      const arr = map.get(a.categoria) ?? [];
      arr.push(a);
      map.set(a.categoria, arr);
    });
    return map;
  }, [animals]);

  const categoriesWithAnimals = useMemo(
    () => Array.from(grouped.keys()),
    [grouped],
  );

  const uniqueLoteIds = useMemo(() => {
    const ids = new Set<string>();
    animals.forEach((a) => {
      if (a.loteId) ids.add(a.loteId);
    });
    return ids.size;
  }, [animals]);

  const toggleCategory = useCallback((cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  }, []);

  const handleAnimalPress = useCallback((animal: AnimalModel) => {
    setSelectedAnimal(animal);
  }, []);

  const handleModalClose = useCallback(() => {
    setSelectedAnimal(null);
  }, []);

  const handleAnimalUpdated = useCallback(() => {
    setSelectedAnimal(null);
  }, []);

  return (
    <View style={styles.flex}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Inventario</Text>
        <Text style={styles.subtitle}>
          {`${animals.length} activos · ${uniqueLoteIds} lotes`}
        </Text>
      </View>

      {/* Stats row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statsRow}
      >
        {categoriesWithAnimals.map((cat) => {
          const count = grouped.get(cat)?.length ?? 0;
          const catColor =
            colors.category[cat as CategoriaType] ?? colors.textSecondary;
          return (
            <View key={cat} style={styles.statCard}>
              <View style={[styles.statDot, { backgroundColor: catColor }]} />
              <Text style={[styles.statCount, { color: catColor }]}>{count}</Text>
              <Text style={styles.statLabel}>{cat}</Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Accordion list */}
      {animals.length === 0 ? (
        <EmptyState
          icon="🐄"
          title="Sin animales activos"
          subtitle="Registre el primer animal escaneando una caravana"
        />
      ) : (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {categoriesWithAnimals.map((cat) => {
            const catAnimals = grouped.get(cat) ?? [];
            const isExpanded = expandedCategories.has(cat);
            return (
              <View key={cat} style={styles.accordionGroup}>
                <CategoryAccordionHeader
                  categoria={cat}
                  count={catAnimals.length}
                  expanded={isExpanded}
                  onToggle={() => toggleCategory(cat)}
                />
                {isExpanded &&
                  catAnimals.map((animal) => (
                    <ObservableErrorBoundary key={animal.id}>
                      <AnimalRowWithData
                        animal={animal}
                        loteMap={loteMap}
                        onPress={handleAnimalPress}
                      />
                    </ObservableErrorBoundary>
                  ))}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Detail Modal */}
      <AnimalDetailModal
        animal={selectedAnimal}
        loteMap={loteMap}
        loteUbicacionMap={loteUbicacionMap}
        onClose={handleModalClose}
        onAnimalUpdated={handleAnimalUpdated}
      />
    </View>
  );
}

// ─── withObservables HOC ─────────────────────────────────────────────────────

const InventoryWithData = withObservables([], () => ({
  animals: database
    .get<AnimalModel>('animals')
    .query(Q.where('estado', 'ACTIVO'), Q.sortBy('id_caravana', Q.asc))
    .observe(),
  lotes: database.get<LoteModel>('lotes').query().observe(),
}))(InventoryInner);

// ─── InventoryScreen (root export) ──────────────────────────────────────────

export function InventoryScreen() {
  return (
    <ObservableErrorBoundary fallbackTitle="Error al cargar inventario">
      <SafeAreaView style={styles.container} edges={['top']}>
        <InventoryWithData />
      </SafeAreaView>
    </ObservableErrorBoundary>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    marginTop: 2,
  },

  // Stats row
  statsRow: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    minWidth: 72,
    gap: 4,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statCount: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.heavy,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },

  // Accordion
  listContent: { paddingBottom: spacing.xxl },
  accordionGroup: {
    marginBottom: 2,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    minHeight: spacing.touchTarget,
    gap: spacing.sm,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  accordionCategoryName: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  countBadge: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  countBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    fontVariant: ['tabular-nums'],
  },
  chevron: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    width: 16,
    textAlign: 'center',
  },

  // Animal row
  animalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    minHeight: spacing.touchTarget,
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
  },
  animalLeft: {
    width: 120,
    marginRight: spacing.sm,
  },
  animalRfid: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
  animalCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  animalSexo: {
    color: colors.textSecondary,
    fontSize: typography.sizes.md,
  },
  animalLote: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
  },
  animalWeight: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    fontVariant: ['tabular-nums'],
    minWidth: 56,
    textAlign: 'right',
  },

  // Modal
  sheetBg: { backgroundColor: colors.surfaceElevated },
  sheetIndicator: { backgroundColor: colors.border, width: 40 },
  modalContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  modalRfid: {
    color: colors.primary,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.heavy,
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
  modalBadges: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeSpacer: { width: spacing.sm },
  carenciaBanner: {
    backgroundColor: 'rgba(255, 170, 0, 0.15)',
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: 12,
    padding: spacing.md,
  },
  carenciaText: {
    color: colors.warning,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  infoCell: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.sm,
    gap: 4,
  },
  infoCellLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    letterSpacing: 1,
  },
  infoCellValue: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    gap: 4,
  },
  sectionCardLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    letterSpacing: 1,
  },
  sectionCardValue: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  sectionCardSub: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  eventRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  eventDate: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
  },
  eventValue: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    fontVariant: ['tabular-nums'],
  },
  thinSeparator: { height: 1, backgroundColor: colors.border },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionButtonGhost: { flex: 1 },
  actionButtonDanger: { flex: 1 },
});
