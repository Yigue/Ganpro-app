import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  LayoutAnimation,
  Platform,
  UIManager,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import withObservables from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';
import { StatusBadge } from '@shared/components/StatusBadge';
import { EmptyState } from '@shared/components/EmptyState';
import { ObservableErrorBoundary } from '@shared/components/ObservableErrorBoundary';
import { colors, spacing, typography } from '@theme/index';
import {
  CATEGORIA,
  type CategoriaType,
} from '@core/constants/categories';
import type AnimalModel from '@data/models/AnimalModel';
import type LoteModel from '@data/models/LoteModel';
import { database } from '@data/database/database';
import { AnimalRepository } from '@data/repositories/AnimalRepository';
import { EventoRepository } from '@data/repositories/EventoRepository';

const animalRepo = new AnimalRepository(database);
const eventoRepo = new EventoRepository(database);

// Helper para peso estable
const getStableWeight = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash % 200) + 250;
};

/**
 * Detalle del modal (Fila)
 */
const DetailRow = ({ label, value, icon, color }: { label: string; value: string; icon: string; color?: string }) => (
  <View style={styles.detailRow}>
    <View style={styles.detailLabelContainer}>
      <Ionicons name={icon as any} size={14} color={colors.textSecondary} />
      <Text style={styles.detailLabel}>{label}</Text>
    </View>
    <Text style={[styles.detailValue, color ? { color } : {}]}>{value}</Text>
  </View>
);

import Swipeable from 'react-native-gesture-handler/Swipeable';

/**
 * AnimalListItem con observación de Lote para mostrar el NOMBRE real y Gestos
 */
const AnimalListItemInner = ({ 
  animal, 
  lote,
  onPress,
  isBulkSelect,
  isSelected,
  onToggleSelect,
  onSwipeAction
}: { 
  animal: AnimalModel; 
  lote: LoteModel | null;
  onPress: (a: AnimalModel) => void;
  isBulkSelect: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onSwipeAction: (action: 'BAJA' | 'MOVER', animal: AnimalModel) => void;
}) => {
  const peso = useMemo(() => getStableWeight(animal.id), [animal.id]);
  const hasAlert = animal.idCaravana.endsWith('2');

  const renderRightActions = () => (
    <View style={{ flexDirection: 'row', alignItems: 'center', height: '100%', paddingLeft: 10 }}>
      <TouchableOpacity 
        style={{ width: 64, height: '90%', backgroundColor: colors.info, justifyContent: 'center', alignItems: 'center', borderRadius: 16, marginRight: 8 }}
        onPress={() => onSwipeAction('MOVER', animal)}
      >
        <Ionicons name="swap-horizontal" size={24} color="white" />
      </TouchableOpacity>
      <TouchableOpacity 
        style={{ width: 64, height: '90%', backgroundColor: colors.error, justifyContent: 'center', alignItems: 'center', borderRadius: 16 }}
        onPress={() => onSwipeAction('BAJA', animal)}
      >
        <Ionicons name="trash" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );

  return (
    <Swipeable renderRightActions={!isBulkSelect ? renderRightActions : undefined}>
      <TouchableOpacity
        style={[styles.animalCard, isSelected && { borderColor: colors.primary, backgroundColor: 'rgba(0,214,143,0.05)' }]}
        activeOpacity={0.7}
        onPress={() => isBulkSelect ? onToggleSelect(animal.id) : onPress(animal)}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {isBulkSelect && (
            <View style={{ marginRight: spacing.md }}>
              <Ionicons 
                name={isSelected ? "checkbox" : "square-outline"} 
                size={24} 
                color={isSelected ? colors.primary : colors.textSecondary} 
              />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <View style={styles.cardMain}>
              <View style={styles.cardLeft}>
                <View style={styles.rfidContainer}>
                  <Text style={styles.animalRfid}>{animal.idCaravana}</Text>
                  {hasAlert && <View style={styles.carenciaDot} />}
                </View>
                <Text style={styles.animalMeta}>
                  {animal.raza || 'Sin Raza'} · {animal.sexo === 'M' ? 'Macho' : 'Hembra'} · {peso}kg
                </Text>
              </View>
              <StatusBadge label={animal.categoria} categoria={animal.categoria as CategoriaType} />
            </View>
            <View style={styles.cardFooter}>
              <View style={styles.locationTag}>
                <Ionicons name="location-sharp" size={14} color={colors.textSecondary} />
                <Text style={styles.locationText}>Lote: {lote?.nombre || 'General'}</Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
};

const AnimalListItem = withObservables(['animal'], ({ animal }: { animal: AnimalModel }) => ({
  animal: animal.observe(),
  lote: animal.lote.observe(),
}))(AnimalListItemInner);

/**
 * Secciones de Categoría
 */
function CategorySection({ 
  title, 
  count, 
  animals, 
  onAnimalPress,
  isBulkSelect,
  selectedIds,
  onToggleSelect,
  onSwipeAction
}: { 
  title: string; 
  count: number; 
  animals: AnimalModel[]; 
  onAnimalPress: (a: AnimalModel) => void;
  isBulkSelect: boolean;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onSwipeAction: (action: 'BAJA' | 'MOVER', animal: AnimalModel) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  if (animals.length === 0) return null;

  return (
    <View style={styles.categoryContainer}>
      <TouchableOpacity 
        style={styles.categoryHeader} 
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryTitle}>{title}</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{count}</Text>
          </View>
        </View>
        <Ionicons 
          name={expanded ? "chevron-down" : "chevron-forward"} 
          size={20} 
          color={colors.textSecondary} 
        />
      </TouchableOpacity>
      
      {expanded && (
        <View style={styles.categoryList}>
          {animals.map(animal => (
            <AnimalListItem 
              key={animal.id} 
              animal={animal} 
              onPress={onAnimalPress} 
              isBulkSelect={isBulkSelect}
              isSelected={selectedIds.includes(animal.id)}
              onToggleSelect={onToggleSelect}
              onSwipeAction={onSwipeAction}
            />
          ))}
        </View>
      )}
    </View>
  );
}

/**
 * Contenido Principal del Inventario
 */
function InventoryListInner({
  animals,
  allAnimals,
  filterCategory,
  onFilterChange,
  searchQuery,
  onSearchChange,
}: {
  animals: AnimalModel[];
  allAnimals: AnimalModel[];
  filterCategory: CategoriaType | null;
  onFilterChange: (cat: CategoriaType | null) => void;
  searchQuery: string;
  onSearchChange: (text: string) => void;
}) {
  const [selectedAnimal, setSelectedAnimal] = useState<AnimalModel | null>(null);
  const [selectedAnimalLote, setSelectedAnimalLote] = useState<string>('Cargando...');
  
  // Bulk Selection State
  const [isBulkSelect, setIsBulkSelect] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Efecto para cargar el nombre del lote cuando se selecciona un animal
  useEffect(() => {
    if (selectedAnimal) {
      selectedAnimal.lote.fetch().then(l => {
        setSelectedAnimalLote(l?.nombre || 'General');
      }).catch(() => {
        setSelectedAnimalLote('General');
      });
    }
  }, [selectedAnimal]);

  const groupedAnimals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = q 
      ? allAnimals.filter(a => 
          a.idCaravana.toLowerCase().includes(q) || 
          a.categoria.toLowerCase().includes(q) ||
          a.raza.toLowerCase().includes(q)
        )
      : (filterCategory ? animals : allAnimals);

    const groups: Record<string, AnimalModel[]> = {};
    filtered.forEach(a => {
      if (!groups[a.categoria]) groups[a.categoria] = [];
      groups[a.categoria].push(a);
    });
    return groups;
  }, [animals, allAnimals, filterCategory, searchQuery]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleBulkMode = () => {
    setIsBulkSelect(!isBulkSelect);
    setSelectedIds([]);
  };

  const handleAction = useCallback((action: string) => {
    if (!selectedAnimal) return;
    
    switch(action) {
      case 'EDITAR':
        Alert.alert('Editar', `Editar animal ${selectedAnimal.idCaravana}`);
        break;
      case 'MOVER':
        Alert.alert('Mover', `Mover animal ${selectedAnimal.idCaravana}`);
        break;
      case 'PESAR':
        Alert.alert('Pesar', `Registrar peso para ${selectedAnimal.idCaravana}`);
        break;
      case 'BAJA':
        handleSwipeAction('BAJA', selectedAnimal);
        break;
    }
    setSelectedAnimal(null);
  }, [selectedAnimal]);

  const handleSwipeAction = async (action: 'BAJA' | 'MOVER', animal: AnimalModel) => {
    if (action === 'BAJA') {
      Alert.alert('Baja Rápida', `¿Dar de baja a ${animal.idCaravana}?`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', style: 'destructive', onPress: async () => {
          await animalRepo.updateEstado(animal, 'MUERTO', 'Baja rápida por Swipe');
        }}
      ]);
    } else {
      Alert.alert('Mover Rápido', `Próximamente: Mover a ${animal.idCaravana}`);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.stickyHeader}>
        <View style={styles.kpiRow}>
          <View style={styles.kpiItem}>
            <Ionicons name="stats-chart" size={16} color={colors.primary} />
            <Text style={styles.kpiValue}>{allAnimals.length}</Text>
            <Text style={styles.kpiLabel}>Activos</Text>
          </View>
          <View style={styles.kpiDivider} />
          <View style={styles.kpiItem}>
            <Ionicons name="leaf" size={16} color={colors.primary} />
            <Text style={styles.kpiValue}>0.8</Text>
            <Text style={styles.kpiLabel}>EV/ha</Text>
          </View>
          <TouchableOpacity style={styles.alertBadge}>
            <Ionicons name="notifications" size={20} color={colors.error} />
            <View style={styles.alertDot}>
              <Text style={styles.alertDotText}>3</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.toolBar}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar arete, raza o categoría..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={onSearchChange}
              clearButtonMode="while-editing"
            />
          </View>
          <TouchableOpacity 
            style={[styles.toolButton, isBulkSelect && styles.toolButtonActive]}
            onPress={toggleBulkMode}
          >
            <Ionicons name="list-outline" size={24} color={isBulkSelect ? 'white' : colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {Object.entries(groupedAnimals).length === 0 ? (
          <EmptyState icon="🐄" title="Sin animales" subtitle="No se encontraron resultados" />
        ) : (
          Object.entries(groupedAnimals).map(([cat, list]) => (
            <CategorySection 
              key={cat} 
              title={cat} 
              count={list.length} 
              animals={list} 
              onAnimalPress={setSelectedAnimal}
              isBulkSelect={isBulkSelect}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onSwipeAction={handleSwipeAction}
            />
          ))
        )}
      </ScrollView>

      {/* Bulk Action Bottom Bar */}
      {isBulkSelect && (
        <View style={styles.bulkActionBar}>
          <Text style={styles.bulkCount}>{selectedIds.length} seleccionados</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={[styles.bulkBtn, { backgroundColor: colors.info }]} onPress={() => Alert.alert('Mover Lote', `Moveriendo ${selectedIds.length} animales`)}>
              <Ionicons name="swap-horizontal" size={20} color="white" />
              <Text style={styles.bulkBtnText}>Mover</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.bulkBtn, { backgroundColor: colors.warning }]} onPress={() => Alert.alert('Sanidad', `Registrando evento a ${selectedIds.length} animales`)}>
              <Ionicons name="medkit" size={20} color="white" />
              <Text style={styles.bulkBtnText}>Sanidad</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Modal de Acciones (Bottom Sheet) */}
      <Modal
        visible={!!selectedAnimal}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedAnimal(null)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setSelectedAnimal(null)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalRfid}>{selectedAnimal?.idCaravana}</Text>
                <Text style={styles.modalSubHeader}>{selectedAnimal?.raza || 'Sin Raza'}</Text>
              </View>
              <StatusBadge label={selectedAnimal?.categoria || ''} categoria={selectedAnimal?.categoria as CategoriaType} />
            </View>

            <View style={styles.animalSheetInfo}>
              <DetailRow label="Sexo" value={selectedAnimal?.sexo === 'M' ? 'Macho' : 'Hembra'} icon="male-female-outline" />
              <DetailRow label="Peso Est." value={`${selectedAnimal ? getStableWeight(selectedAnimal.id) : '-'} kg`} icon="speedometer-outline" />
              <DetailRow label="Lote Actual" value={selectedAnimalLote} icon="layers-outline" />
              <DetailRow label="Estado" value={selectedAnimal?.estado || '-'} icon="pulse-outline" color={colors.primary} />
            </View>
            
            <View style={styles.actionGrid}>
              <TouchableOpacity style={styles.actionButton} onPress={() => handleAction('EDITAR')}>
                <Ionicons name="pencil" size={28} color={colors.primary} />
                <Text style={styles.actionLabel}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={() => handleAction('MOVER')}>
                <Ionicons name="swap-horizontal" size={28} color={colors.info} />
                <Text style={styles.actionLabel}>Mover</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={() => handleAction('PESAR')}>
                <Ionicons name="scale" size={28} color={colors.warning} />
                <Text style={styles.actionLabel}>Pesar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, { borderColor: colors.errorAlpha }]} onPress={() => handleAction('BAJA')}>
                <Ionicons name="close-circle" size={28} color={colors.error} />
                <Text style={[styles.actionLabel, { color: colors.error }]}>Baja</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const InventoryListWithData = withObservables(
  ['filterCategory'],
  ({ filterCategory }: { filterCategory: CategoriaType | null }) => ({
    animals: (filterCategory
      ? database.get<AnimalModel>('animals').query(Q.where('estado', 'ACTIVO'), Q.where('categoria', filterCategory))
      : database.get<AnimalModel>('animals').query(Q.where('estado', 'ACTIVO'))
    ).observe(),
    allAnimals: database.get<AnimalModel>('animals').query(Q.where('estado', 'ACTIVO')).observe(),
  })
)(InventoryListInner);

export function InventoryScreen() {
  const [filterCategory, setFilterCategory] = useState<CategoriaType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <ObservableErrorBoundary fallbackTitle="Error al cargar inventario">
      <SafeAreaView style={styles.container} edges={['top']}>
        <InventoryListWithData
          filterCategory={filterCategory}
          onFilterChange={setFilterCategory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </SafeAreaView>
    </ObservableErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  stickyHeader: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingTop: spacing.xs,
  },
  kpiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  kpiItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  kpiValue: { color: colors.textPrimary, fontSize: 16, fontWeight: 'bold' },
  kpiLabel: { color: colors.textSecondary, fontSize: 10, textTransform: 'uppercase' },
  kpiDivider: { width: 1, height: 14, backgroundColor: colors.border },
  alertBadge: { marginLeft: 'auto', position: 'relative' },
  alertDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.error,
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  alertDotText: { color: 'white', fontSize: 9, fontWeight: 'bold' },
  toolBar: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: spacing.sm,
    height: 54,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: 16 },
  toolButton: {
    width: 54,
    height: 54,
    backgroundColor: colors.surface,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  toolButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  scrollContent: { padding: spacing.md, paddingBottom: 100 },
  categoryContainer: { marginBottom: spacing.lg },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  categoryInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  categoryTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: 'bold' },
  categoryBadge: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryBadgeText: { color: colors.textSecondary, fontSize: 12, fontWeight: 'bold' },
  categoryList: { gap: spacing.md },
  animalCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLeft: { flex: 1 },
  rfidContainer: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  carenciaBadge: {
    backgroundColor: colors.error,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: spacing.xs,
  },
  carenciaText: {
    color: 'white',
    fontSize: 9,
    fontWeight: 'bold',
  },
  animalRfid: { color: colors.textPrimary, fontSize: 20, fontWeight: 'bold', fontVariant: ['tabular-nums'] },
  animalMeta: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },
  cardFooter: { marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  locationTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { color: colors.textSecondary, fontSize: 11 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  modalHandle: { width: 40, height: 5, backgroundColor: colors.border, borderRadius: 3, alignSelf: 'center', marginBottom: spacing.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  modalRfid: { color: colors.textPrimary, fontSize: 24, fontWeight: 'bold' },
  modalSubHeader: { color: colors.textSecondary, fontSize: 16, marginTop: 2 },
  animalSheetInfo: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.md,
    marginBottom: spacing.xl,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabelContainer: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  detailLabel: { color: colors.textSecondary, fontSize: 13 },
  detailValue: { color: colors.textPrimary, fontSize: 14, fontWeight: 'bold' },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'space-between' },
  actionButton: {
    width: '47%',
    height: 100,
    backgroundColor: colors.surface,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionLabel: { color: colors.textPrimary, fontSize: 14, fontWeight: 'bold' },

  bulkActionBar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 20,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bulkCount: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  bulkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  bulkBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  carenciaDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
    marginLeft: 4,
  },
});
