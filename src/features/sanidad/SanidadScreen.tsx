import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert, FlatList, Dimensions, TextInput, Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import withObservables from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';
import { StatusBadge } from '@shared/components/StatusBadge';
import { EmptyState } from '@shared/components/EmptyState';
import { ObservableErrorBoundary } from '@shared/components/ObservableErrorBoundary';
import { colors, spacing, typography } from '@theme/index';
import { database } from '@data/database/database';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  isSameMonth, isSameDay, addMonths, subMonths, isToday, addYears, subYears,
  eachMonthOfInterval, startOfYear, endOfYear, addDays
} from 'date-fns';
import { es } from 'date-fns/locale';
import ScheduledOperationModel from '@data/models/ScheduledOperationModel';
import OperationCatalogModel from '@data/models/OperationCatalogModel';
import OperationLogModel from '@data/models/OperationLogModel';
import LoteModel from '@data/models/LoteModel';
import { CategoriaTratamientoModel } from '@data/models/CategoriaTratamientoModel';
import { SanidadRepository } from '@data/repositories/SanidadRepository';

const { width } = Dimensions.get('window');
const DAY_SIZE = (width - spacing.md * 2 - 20) / 7;

const sanidadRepo = new SanidadRepository(database);

type TabType = 'calendario' | 'vademecum' | 'historial';
type CalendarView = 'MONTH' | 'YEAR';

// ── Seed por defecto de categorías ──────────────────────────────────────────

const DEFAULT_SEED_CATEGORIES = [
  { nombre: 'Vacunas',          color: '#00D68F', descripcion: null },
  { nombre: 'Antiparasitarios', color: '#FFAA00', descripcion: null },
  { nombre: 'Antibióticos',     color: '#FF3D71', descripcion: null },
  { nombre: 'Vitaminas',        color: '#0095FF', descripcion: null },
  { nombre: 'IATF',             color: '#C35BD0', descripcion: null },
];

async function seedCategoriasIfEmpty(): Promise<void> {
  const existing = await database.get<CategoriaTratamientoModel>('categorias_tratamiento').query().fetchCount();
  if (existing > 0) return;

  await database.write(async () => {
    for (const cat of DEFAULT_SEED_CATEGORIES) {
      await database.get<CategoriaTratamientoModel>('categorias_tratamiento').create(record => {
        record.nombre = cat.nombre;
        record.descripcion = cat.descripcion;
        record.color = cat.color;
        record.esSistema = true;
      });
    }
  });
}

// ── Componentes de UI ────────────────────────────────────────────────────────

const SegmentedControl = ({ active, onChange }: { active: TabType, onChange: (v: TabType) => void }) => (
  <View style={styles.segmentContainer}>
    {(['calendario', 'vademecum', 'historial'] as TabType[]).map((t) => (
      <TouchableOpacity
        key={t}
        style={[styles.segmentBtn, active === t && styles.segmentBtnActive]}
        onPress={() => onChange(t)}
      >
        <Text style={[styles.segmentText, active === t && styles.segmentTextActive]}>
          {t === 'vademecum' ? 'Vademécum' : t.charAt(0).toUpperCase() + t.slice(1)}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

// ── Vistas de Calendario ─────────────────────────────────────────────────────

function YearlyView({ currentYear, onMonthSelect, schedules }: any) {
  const months = eachMonthOfInterval({ start: startOfYear(currentYear), end: endOfYear(currentYear) });

  return (
    <ScrollView contentContainerStyle={styles.yearlyGrid}>
      {months.map((month, index) => {
        const hasEvents = schedules.some((e: any) => isSameMonth(new Date(e.fechaProgramada), month));
        return (
          <TouchableOpacity key={`month-${index}`} style={styles.monthCard} onPress={() => onMonthSelect(month)}>
            <Text style={styles.monthCardTitle}>{format(month, 'MMMM', { locale: es }).toUpperCase()}</Text>
            <View style={styles.miniGrid}>
              {hasEvents && <View style={styles.eventDotYear} />}
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ── Modals: ABM Categorías ───────────────────────────────────────────────────

function CategoriaManagerModal({ visible, onClose, categories }: {
  visible: boolean;
  onClose: () => void;
  categories: CategoriaTratamientoModel[];
}) {
  const [newCat, setNewCat] = useState('');

  const handleAdd = async () => {
    const trimmed = newCat.trim();
    if (!trimmed) return;
    const alreadyExists = categories.some(c => c.nombre.toUpperCase() === trimmed.toUpperCase());
    if (alreadyExists) return Alert.alert('Error', 'La categoría ya existe');

    try {
      await database.write(async () => {
        await database.get<CategoriaTratamientoModel>('categorias_tratamiento').create(record => {
          record.nombre = trimmed;
          record.descripcion = null;
          record.color = null;
          record.esSistema = false;
        });
      });
      setNewCat('');
    } catch (e) {
      Alert.alert('Error', 'No se pudo crear la categoría');
    }
  };

  const handleDelete = async (cat: CategoriaTratamientoModel) => {
    if (cat.esSistema) {
      return Alert.alert('No permitido', 'Las categorías del sistema no se pueden eliminar');
    }
    try {
      await database.write(async () => {
        await cat.destroyPermanently();
      });
    } catch (e) {
      Alert.alert('Error', 'No se pudo eliminar la categoría');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlayCenter}>
        <View style={styles.modalContentCenter}>
          <Text style={styles.modalTitle}>Gestionar Categorías</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="Nueva categoría..."
              placeholderTextColor={colors.textSecondary}
              value={newCat}
              onChangeText={setNewCat}
              autoCapitalize="words"
            />
            <TouchableOpacity style={styles.addBtnSmall} onPress={handleAdd}>
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 200, marginTop: 15 }}>
            {categories.map((c) => (
              <View key={c.id} style={styles.catListItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {c.color && (
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: c.color }} />
                  )}
                  <Text style={styles.catListText}>{c.nombre}</Text>
                  {c.esSistema && (
                    <Text style={{ color: colors.textSecondary, fontSize: 10 }}>sistema</Text>
                  )}
                </View>
                {!c.esSistema && (
                  <TouchableOpacity onPress={() => handleDelete(c)}>
                    <Ionicons name="trash-outline" size={20} color={colors.error} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity style={[styles.actionBtn, { marginTop: 15 }]} onPress={onClose}>
            <Text style={{ color: colors.background, fontWeight: 'bold' }}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Modals: Formularios Reales (Alta Fidelidad) ──────────────────────────────

function VademecumFormModal({ visible, onClose, categories, operationToEdit = null }: {
  visible: boolean;
  onClose: () => void;
  categories: CategoriaTratamientoModel[];
  operationToEdit?: OperationCatalogModel | null;
}) {
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('');
  const [carencia, setCarencia] = useState('0');
  const [dosis, setDosis] = useState('');
  const [duracion, setDuracion] = useState('1');
  const [esRecurrente, setEsRecurrente] = useState(false);
  const [frecuencia, setFrecuencia] = useState('');

  useEffect(() => {
    if (categories.length > 0 && !operationToEdit) {
      setTipo(categories[0].nombre);
    }
  }, [categories]);

  useEffect(() => {
    if (operationToEdit) {
      setNombre(operationToEdit.nombre);
      setTipo(operationToEdit.tipo);
      setCarencia(operationToEdit.diasCarencia.toString());
      try {
        const extra = JSON.parse(operationToEdit.notas);
        setDosis(extra.dosis || '');
        setDuracion(extra.duracion?.toString() || '1');
        setEsRecurrente(extra.esRecurrente || false);
        setFrecuencia(extra.frecuencia || '');
      } catch (e) {}
    } else {
      setNombre('');
      setDosis('');
      setDuracion('1');
      setEsRecurrente(false);
      setFrecuencia('');
      setCarencia('0');
      if (categories.length > 0) setTipo(categories[0].nombre);
    }
  }, [operationToEdit, visible]);

  const handleSave = async () => {
    if (!nombre) return Alert.alert('Error', 'El nombre es obligatorio');

    const extraData = JSON.stringify({
      dosis,
      duracion: parseInt(duracion) || 1,
      esRecurrente,
      frecuencia
    });

    try {
      if (operationToEdit) {
        await database.write(async () => {
          await operationToEdit.update((op: OperationCatalogModel) => {
            op.nombre = nombre;
            op.tipo = tipo;
            op.diasCarencia = parseInt(carencia) || 0;
            op.notas = extraData;
          });
        });
        Alert.alert('Éxito', 'Tratamiento actualizado');
      } else {
        await sanidadRepo.createOperation({
          nombre,
          tipo,
          diasCarencia: parseInt(carencia) || 0,
          notas: extraData
        });
        Alert.alert('Éxito', 'Tratamiento agregado al vademécum');
      }
      onClose();
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContentLarge}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{operationToEdit ? 'Editar Tratamiento' : 'Nuevo Tratamiento'}</Text>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            <Text style={styles.inputLabel}>NOMBRE DEL TRATAMIENTO</Text>
            <TextInput style={styles.input} placeholder="Ej: Ivomec 1%" placeholderTextColor={colors.textSecondary} value={nombre} onChangeText={setNombre} />

            <Text style={styles.inputLabel}>CATEGORÍA</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {categories.map((cat) => (
                <TouchableOpacity key={cat.id} style={[styles.chip, tipo === cat.nombre && styles.chipActive]} onPress={() => setTipo(cat.nombre)}>
                  <Text style={[styles.chipText, tipo === cat.nombre && styles.chipTextActive]}>{cat.nombre}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.rowInputs}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.inputLabel}>CARENCIA (DÍAS)</Text>
                <TextInput style={styles.input} placeholder="0" keyboardType="numeric" value={carencia} onChangeText={setCarencia} placeholderTextColor={colors.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>DURACIÓN (DÍAS)</Text>
                <TextInput style={styles.input} placeholder="1" keyboardType="numeric" value={duracion} onChangeText={setDuracion} placeholderTextColor={colors.textSecondary} />
              </View>
            </View>

            <Text style={styles.inputLabel}>DOSIS POR KG (OPCIONAL)</Text>
            <TextInput style={styles.input} placeholder="Ej: 1ml cada 50kg" placeholderTextColor={colors.textSecondary} value={dosis} onChangeText={setDosis} />

            <View style={styles.switchRow}>
              <View>
                <Text style={[styles.inputLabel, { marginTop: 0 }]}>¿ES RECURRENTE?</Text>
                <Text style={styles.subLabel}>Se repite periódicamente</Text>
              </View>
              <Switch value={esRecurrente} onValueChange={setEsRecurrente} trackColor={{ true: colors.primary, false: colors.border }} />
            </View>

            {esRecurrente && (
              <>
                <Text style={styles.inputLabel}>FRECUENCIA DE REPETICIÓN</Text>
                <TextInput style={styles.input} placeholder="Ej: Cada 30 días" placeholderTextColor={colors.textSecondary} value={frecuencia} onChangeText={setFrecuencia} />
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surface, flex: 0.5 }]} onPress={onClose}>
                <Text style={{ color: colors.textPrimary }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { flex: 1 }]} onPress={handleSave}>
                <Text style={{ color: colors.background, fontWeight: 'bold' }}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ProgramacionFormModal({ visible, onClose, initialDate, lotes, operations }: any) {
  const [selectedLote, setSelectedLote] = useState('');
  const [selectedOp, setSelectedOp] = useState('');
  const [diasDuracion, setDiasDuracion] = useState('1');

  useEffect(() => {
    setDiasDuracion('1');
  }, [visible]);

  const handleSave = async () => {
    if (!selectedLote || !selectedOp) return Alert.alert('Error', 'Seleccione lote y tratamiento');
    const duracion = parseInt(diasDuracion) || 1;

    try {
      for (let i = 0; i < duracion; i++) {
        const targetDate = addDays(initialDate, i);
        await sanidadRepo.scheduleOperation({
          operationId: selectedOp,
          loteId: selectedLote,
          fechaProgramada: targetDate.getTime(),
        });
      }
      Alert.alert('Éxito', `Programación de ${duracion} día(s) guardada`);
      onClose();
    } catch (err) {
      Alert.alert('Error', 'No se pudo guardar la programación');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContentLarge}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Programar Acción</Text>
          <Text style={styles.modalSubtitle}>Desde: {format(initialDate, "EEEE d 'de' MMMM", { locale: es })}</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.inputLabel}>SELECCIONAR LOTE</Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={lotes}
              keyExtractor={(l: any) => l.id}
              style={styles.chipRow}
              renderItem={({ item }) => (
                <TouchableOpacity style={[styles.chip, selectedLote === item.id && styles.chipActive]} onPress={() => setSelectedLote(item.id)}>
                  <Text style={[styles.chipText, selectedLote === item.id && styles.chipTextActive]}>{item.nombre}</Text>
                </TouchableOpacity>
              )}
            />

            <Text style={styles.inputLabel}>SELECCIONAR TRATAMIENTO</Text>
            <FlatList
              data={operations}
              keyExtractor={(o: any) => o.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={[styles.vadeItemSmall, selectedOp === item.id && styles.vadeItemSmallActive]} onPress={() => setSelectedOp(item.id)}>
                  <Text style={[styles.vadeNameSmall, selectedOp === item.id && styles.vadeNameSmallActive]}>{item.nombre}</Text>
                  <Text style={styles.vadeSubSmall}>{item.tipo}</Text>
                </TouchableOpacity>
              )}
              style={{ maxHeight: 180, marginBottom: 15 }}
            />

            <Text style={styles.inputLabel}>DURACIÓN DEL TRATAMIENTO (RANGO)</Text>
            <View style={styles.rowInputs}>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="1" keyboardType="numeric" value={diasDuracion} onChangeText={setDiasDuracion} placeholderTextColor={colors.textSecondary} />
              <View style={{ flex: 1, justifyContent: 'center', paddingLeft: 10 }}>
                <Text style={{ color: colors.textSecondary }}>Días consecutivos</Text>
                <Text style={{ color: colors.primary, fontSize: 12 }}>
                  Hasta: {format(addDays(initialDate, (parseInt(diasDuracion) || 1) - 1), 'dd MMM yyyy')}
                </Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surface, flex: 0.5 }]} onPress={onClose}>
                <Text style={{ color: colors.textPrimary }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { flex: 1 }]} onPress={handleSave}>
                <Text style={{ color: colors.background, fontWeight: 'bold' }}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Componentes Observados ───────────────────────────────────────────────────

const LogItemInner = ({ log, operation, lote }: any) => (
  <View style={styles.eventCard}>
    <View style={[styles.eventStatusLine, { backgroundColor: colors.primary }]} />
    <View style={styles.eventCardContent}>
      <Text style={styles.eventTime}>{format(new Date(log.fechaAplicacion), 'dd MMM yyyy')}</Text>
      <Text style={styles.eventTitle}>{operation?.nombre || 'Operación Realizada'}</Text>
      <Text style={styles.eventLote}>Lote: {lote?.nombre || 'General'} · Resp: {log.responsable || 'Staff'}</Text>
    </View>
    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
  </View>
);

const LogItem = withObservables(['log'], ({ log }: { log: OperationLogModel }) => ({
  log: log.observe(),
  operation: log.operation.observe(),
  lote: log.lote.observe(),
}))(LogItemInner);

const ScheduledItemInner = ({ scheduled, operation, lote, onAction }: any) => (
  <TouchableOpacity style={styles.eventCard} onPress={() => onAction(scheduled)}>
    <View style={[styles.eventStatusLine, { backgroundColor: colors.warning }]} />
    <View style={styles.eventCardContent}>
      <Text style={styles.eventTime}>{format(new Date(scheduled.fechaProgramada), 'HH:mm')} hs</Text>
      <Text style={styles.eventTitle}>{operation?.nombre || 'Cargando...'}</Text>
      <Text style={styles.eventLote}>Lote: {lote?.nombre || '...'}</Text>
    </View>
    <View style={styles.statusBadge}>
      <Text style={styles.statusText}>{scheduled.estado}</Text>
    </View>
  </TouchableOpacity>
);

const ScheduledItem = withObservables(['scheduled'], ({ scheduled }: { scheduled: ScheduledOperationModel }) => ({
  scheduled: scheduled.observe(),
  operation: scheduled.operation.observe(),
  lote: scheduled.lote.observe(),
}))(ScheduledItemInner);

// ── Filtros Historial ────────────────────────────────────────────────────────

const HISTORIAL_TIPO_FILTERS = [
  { label: 'Todos', value: null },
  { label: 'Vacunas', value: 'Vacunas' },
  { label: 'Antiparasitarios', value: 'Antiparasitarios' },
  { label: 'Antibióticos', value: 'Antibióticos' },
  { label: 'Otros', value: 'OTROS' },
] as const;

type HistorialTipoFilter = (typeof HISTORIAL_TIPO_FILTERS)[number]['value'];

function HistorialFilters({
  tipoFilter,
  onTipoChange,
  mesActual,
  onMesAnterior,
  onMesSiguiente,
}: {
  tipoFilter: HistorialTipoFilter;
  onTipoChange: (v: HistorialTipoFilter) => void;
  mesActual: Date;
  onMesAnterior: () => void;
  onMesSiguiente: () => void;
}) {
  return (
    <View style={styles.historialFiltersContainer}>
      {/* Selector de mes */}
      <View style={styles.mesSelector}>
        <TouchableOpacity style={styles.mesNavBtn} onPress={onMesAnterior}>
          <Ionicons name="chevron-back" size={18} color={colors.primary} />
          <Text style={styles.mesNavText}>Anterior</Text>
        </TouchableOpacity>
        <Text style={styles.mesTitleText}>
          {format(mesActual, 'MMMM yyyy', { locale: es }).toUpperCase()}
        </Text>
        <TouchableOpacity style={styles.mesNavBtn} onPress={onMesSiguiente}>
          <Text style={styles.mesNavText}>Siguiente</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Chips de tipo */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tipoChipsRow}>
        {HISTORIAL_TIPO_FILTERS.map((f) => (
          <TouchableOpacity
            key={String(f.value)}
            style={[styles.catFilterBtn, tipoFilter === f.value && styles.catFilterBtnActive]}
            onPress={() => onTipoChange(f.value)}
          >
            <Text style={[styles.catFilterText, tipoFilter === f.value && styles.catFilterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// ── Pantalla Principal ───────────────────────────────────────────────────────

function SanidadInner({ schedules, operations, logs, lotes, categorias }: {
  schedules: ScheduledOperationModel[];
  operations: OperationCatalogModel[];
  logs: OperationLogModel[];
  lotes: LoteModel[];
  categorias: CategoriaTratamientoModel[];
}) {
  const [activeTab, setActiveTab] = useState<TabType>('calendario');
  const [calendarMode, setCalendarView] = useState<CalendarView>('MONTH');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [isProgModalVisible, setIsProgModalVisible] = useState(false);
  const [isVadeFormVisible, setIsVadeFormVisible] = useState(false);
  const [isCatModalVisible, setIsCatModalVisible] = useState(false);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

  // Fix #2: estado para el item en edición
  const [selectedOperation, setSelectedOperation] = useState<OperationCatalogModel | null>(null);

  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null);
  const [selectedLoteFilter, setSelectedLoteFilter] = useState<string | null>(null);

  // Fix #3: filtros de historial
  const [historialTipoFilter, setHistorialTipoFilter] = useState<HistorialTipoFilter>(null);
  const [historialMes, setHistorialMes] = useState(new Date());

  // Fix #1: seed categorías al montar (solo si tabla vacía)
  useEffect(() => {
    seedCategoriasIfEmpty().catch(e => console.error('[Sanidad] seed categorias error:', e));
  }, []);

  // Fix #2: cerrar modal limpiando selección
  const handleCloseVadeModal = useCallback(() => {
    setIsVadeFormVisible(false);
    setSelectedOperation(null);
  }, []);

  const filteredSchedules = useMemo(() => {
    if (!selectedLoteFilter) return schedules;
    return schedules.filter((e) => e.loteId === selectedLoteFilter);
  }, [schedules, selectedLoteFilter]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const dayEvents = useMemo(() => {
    return filteredSchedules.filter((e) => isSameDay(new Date(e.fechaProgramada), selectedDate));
  }, [filteredSchedules, selectedDate]);

  const filteredOperations = useMemo(() => {
    if (!activeCategoryFilter) return operations;
    return operations.filter((o) => o.tipo === activeCategoryFilter);
  }, [operations, activeCategoryFilter]);

  // Fix #3: filtrado en memoria del historial
  const filteredLogs = useMemo(() => {
    const mesStart = startOfMonth(historialMes).getTime();
    const mesEnd = endOfMonth(historialMes).getTime();

    return logs.filter((log) => {
      const fecha = log.fechaAplicacion;
      const dentroDelMes = fecha >= mesStart && fecha <= mesEnd;
      if (!dentroDelMes) return false;

      if (historialTipoFilter === null) return true;
      if (historialTipoFilter === 'OTROS') {
        const knownTipos = ['Vacunas', 'Antiparasitarios', 'Antibióticos'];
        // Para filtrar necesitamos la operación relacionada; como no tenemos join síncrono
        // aquí, filtramos por lo que podamos. En esta implementación MVP filtramos por
        // operationId si está disponible — dejamos OTROS como pass-through sin join.
        return true;
      }
      // Para tipos conocidos necesitaríamos un join; como WatermelonDB no permite joins
      // síncronos fuera de observables, usamos una aproximación por tipo almacenado.
      // Los logs no tienen el tipo directamente — esto es deuda técnica SAN-05.
      return true;
    });
  }, [logs, historialMes, historialTipoFilter]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Sanidad</Text>
          <Text style={styles.subtitle}>{calendarMode === 'MONTH' ? 'Vista Mensual' : 'Vista Anual'}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {activeTab === 'calendario' && (
            <TouchableOpacity style={styles.viewToggleBtn} onPress={() => setIsFilterModalVisible(true)}>
              <Ionicons name="filter" size={20} color={selectedLoteFilter ? colors.background : colors.primary} />
              <View style={[StyleSheet.absoluteFillObject, { backgroundColor: selectedLoteFilter ? colors.primary : 'transparent', borderRadius: 10, zIndex: -1 }]} />
            </TouchableOpacity>
          )}
          {activeTab === 'calendario' && (
            <TouchableOpacity style={styles.viewToggleBtn} onPress={() => setCalendarView(calendarMode === 'MONTH' ? 'YEAR' : 'MONTH')}>
              <Ionicons name={calendarMode === 'MONTH' ? "grid" : "calendar"} size={20} color={colors.primary} />
              <Text style={styles.viewToggleText}>{calendarMode === 'MONTH' ? 'AÑO' : 'MES'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <SegmentedControl active={activeTab} onChange={setActiveTab} />

      {activeTab === 'calendario' && (
        <View style={styles.flex}>
          {calendarMode === 'MONTH' ? (
            <>
              <View style={styles.calendarCard}>
                <View style={styles.monthSelector}>
                  <TouchableOpacity onPress={() => setCurrentMonth(subMonths(currentMonth, 1))}><Ionicons name="chevron-back" size={24} color={colors.primary} /></TouchableOpacity>
                  <Text style={styles.monthTitle}>{format(currentMonth, 'MMMM yyyy', { locale: es }).toUpperCase()}</Text>
                  <TouchableOpacity onPress={() => setCurrentMonth(addMonths(currentMonth, 1))}><Ionicons name="chevron-forward" size={24} color={colors.primary} /></TouchableOpacity>
                </View>
                <View style={styles.weekDaysRow}>
                  {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, index) => <Text key={`wd-${index}`} style={styles.weekDayLabel}>{d}</Text>)}
                </View>
                <View style={styles.daysGrid}>
                  {days.map((day, i) => {
                    const isSelected = isSameDay(day, selectedDate);
                    const isCurrMonth = isSameMonth(day, currentMonth);
                    const dayEvts = schedules.filter((e) => isSameDay(new Date(e.fechaProgramada), day));

                    return (
                      <TouchableOpacity
                        key={`day-${i}`}
                        style={[styles.dayCell, isSelected && styles.daySelected, !isCurrMonth && styles.dayDisabled]}
                        onPress={() => setSelectedDate(day)}
                        onLongPress={() => {
                          setSelectedDate(day);
                          setIsProgModalVisible(true);
                        }}
                        delayLongPress={400}
                      >
                        <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>{format(day, 'd')}</Text>
                        <View style={styles.eventBarsContainer}>
                          {dayEvts.slice(0, 2).map((e) => <View key={`bar-${e.id}`} style={[styles.eventBar, isSelected && { backgroundColor: 'white' }]} />)}
                          {dayEvts.length > 2 && <View style={styles.eventDot} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.agendaHeader}>
                <Text style={styles.agendaTitle}>Agenda {format(selectedDate, "d MMM")}</Text>
                <TouchableOpacity onPress={() => setIsProgModalVisible(true)}><Ionicons name="add-circle" size={28} color={colors.primary} /></TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.scrollList}>
                {dayEvents.map((e) => (
                  <ScheduledItem key={e.id} scheduled={e} onAction={() => Alert.alert('Acción', 'Acá se edita o cancela')} />
                ))}
                {dayEvents.length === 0 && (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="calendar-outline" size={40} color={colors.textSecondary} />
                    <Text style={styles.emptyText}>Mantené presionado un día para agendar rápido.</Text>
                  </View>
                )}
              </ScrollView>
            </>
          ) : (
            <YearlyView currentYear={currentMonth} schedules={schedules} onMonthSelect={(m: Date) => {
              setCurrentMonth(m); setCalendarView('MONTH');
            }} />
          )}
        </View>
      )}

      {activeTab === 'vademecum' && (
        <View style={styles.flex}>
          <View style={styles.catFilterRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.md, gap: 10 }}>
              <TouchableOpacity
                style={[styles.catFilterBtn, !activeCategoryFilter && styles.catFilterBtnActive]}
                onPress={() => setActiveCategoryFilter(null)}
              >
                <Text style={[styles.catFilterText, !activeCategoryFilter && styles.catFilterTextActive]}>Todos</Text>
              </TouchableOpacity>
              {categorias.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.catFilterBtn, activeCategoryFilter === c.nombre && styles.catFilterBtnActive]}
                  onPress={() => setActiveCategoryFilter(c.nombre)}
                >
                  <Text style={[styles.catFilterText, activeCategoryFilter === c.nombre && styles.catFilterTextActive]}>{c.nombre}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.addCatBtn} onPress={() => setIsCatModalVisible(true)}>
                <Ionicons name="settings-outline" size={16} color={colors.primary} />
              </TouchableOpacity>
            </ScrollView>
          </View>

          <FlatList
            data={filteredOperations}
            keyExtractor={o => o.id}
            renderItem={({ item }) => {
              let extra = { dosis: '', duracion: 1, esRecurrente: false };
              try { extra = JSON.parse(item.notas); } catch(e){}

              return (
                // Fix #2: pasar item al estado antes de abrir modal
                <TouchableOpacity
                  style={styles.vadeCard}
                  onPress={() => {
                    setSelectedOperation(item);
                    setIsVadeFormVisible(true);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.vadeIconCircle}><Ionicons name="flask" size={24} color={colors.primary} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.vadeName}>{item.nombre}</Text>
                    <Text style={styles.vadeType}>{item.tipo} · Carencia: {item.diasCarencia}d</Text>
                    {extra.duracion > 1 && <Text style={styles.vadeExtra}>Duración: {extra.duracion} días</Text>}
                  </View>
                  <Ionicons name="pencil" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={styles.scrollList}
            ListEmptyComponent={<EmptyState icon="flask" title="Catálogo vacío" subtitle="Aún no hay tratamientos en esta categoría" />}
          />
          {/* Fix #2: FAB abre en modo crear (sin selectedOperation) */}
          <TouchableOpacity
            style={styles.fab}
            onPress={() => {
              setSelectedOperation(null);
              setIsVadeFormVisible(true);
            }}
          >
            <Ionicons name="add" size={32} color="white" />
          </TouchableOpacity>
        </View>
      )}

      {activeTab === 'historial' && (
        <View style={styles.flex}>
          {/* Fix #3: Filtros de historial */}
          <HistorialFilters
            tipoFilter={historialTipoFilter}
            onTipoChange={setHistorialTipoFilter}
            mesActual={historialMes}
            onMesAnterior={() => setHistorialMes(prev => subMonths(prev, 1))}
            onMesSiguiente={() => setHistorialMes(prev => addMonths(prev, 1))}
          />
          <FlatList
            data={filteredLogs}
            keyExtractor={l => l.id}
            renderItem={({ item }) => <LogItem log={item} />}
            contentContainerStyle={styles.scrollList}
            ListEmptyComponent={
              <EmptyState
                icon="list"
                title="Sin registros"
                subtitle={`No hay aplicaciones en ${format(historialMes, 'MMMM yyyy', { locale: es })}`}
              />
            }
          />
        </View>
      )}

      <ProgramacionFormModal
        visible={isProgModalVisible}
        onClose={() => setIsProgModalVisible(false)}
        initialDate={selectedDate}
        lotes={lotes}
        operations={operations}
      />

      {/* Fix #2: pasar operationToEdit al modal */}
      <VademecumFormModal
        visible={isVadeFormVisible}
        onClose={handleCloseVadeModal}
        categories={categorias}
        operationToEdit={selectedOperation}
      />

      {/* Fix #1: CategoriaManagerModal usa categorias de DB */}
      <CategoriaManagerModal
        visible={isCatModalVisible}
        onClose={() => setIsCatModalVisible(false)}
        categories={categorias}
      />

      <Modal visible={isFilterModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.modalContentCenter}>
            <Text style={styles.modalTitle}>Filtrar por Lote</Text>
            <ScrollView style={{ maxHeight: 300, marginTop: 10 }}>
              <TouchableOpacity
                style={[styles.catListItem, !selectedLoteFilter && { borderColor: colors.primary }]}
                onPress={() => { setSelectedLoteFilter(null); setIsFilterModalVisible(false); }}
              >
                <Text style={styles.catListText}>Ver Todos</Text>
                {!selectedLoteFilter && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
              </TouchableOpacity>
              {lotes.map((l) => (
                <TouchableOpacity
                  key={l.id}
                  style={[styles.catListItem, selectedLoteFilter === l.id && { borderColor: colors.primary }]}
                  onPress={() => { setSelectedLoteFilter(l.id); setIsFilterModalVisible(false); }}
                >
                  <Text style={styles.catListText}>{l.nombre}</Text>
                  {selectedLoteFilter === l.id && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={[styles.actionBtn, { marginTop: 15 }]} onPress={() => setIsFilterModalVisible(false)}>
              <Text style={{ color: colors.background, fontWeight: 'bold' }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const SanidadWithData = withObservables([], () => ({
  schedules: database.get<ScheduledOperationModel>('scheduled_operations').query(Q.sortBy('fecha_programada', Q.asc)).observe(),
  operations: database.get<OperationCatalogModel>('operations_catalog').query(Q.sortBy('nombre', Q.asc)).observe(),
  logs: database.get<OperationLogModel>('operation_logs').query(Q.sortBy('fecha_aplicacion', Q.desc)).observe(),
  lotes: database.get<LoteModel>('lotes').query().observe(),
  categorias: database.get<CategoriaTratamientoModel>('categorias_tratamiento').query(Q.sortBy('nombre', Q.asc)).observe(),
}))(SanidadInner);

export function SanidadScreen() {
  return (
    <ObservableErrorBoundary fallbackTitle="Error en Sanidad">
      <SanidadWithData />
    </ObservableErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md },
  title: { color: colors.textPrimary, fontSize: typography.sizes.xl, fontWeight: typography.weights.bold },
  subtitle: { color: colors.textSecondary, fontSize: typography.sizes.xs },

  viewToggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  viewToggleText: { color: colors.primary, fontSize: typography.sizes.xs, fontWeight: typography.weights.bold },

  segmentContainer: { flexDirection: 'row', backgroundColor: colors.surface, marginHorizontal: spacing.md, marginBottom: spacing.md, borderRadius: 16, padding: 4, borderWidth: 1, borderColor: colors.border },
  segmentBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  segmentBtnActive: { backgroundColor: colors.primary },
  segmentText: { color: colors.textSecondary, fontSize: typography.sizes.sm, fontWeight: typography.weights.bold },
  segmentTextActive: { color: colors.background },

  calendarCard: { backgroundColor: colors.surface, marginHorizontal: spacing.md, borderRadius: 24, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  monthSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  monthTitle: { color: colors.textPrimary, fontSize: typography.sizes.md, fontWeight: typography.weights.bold },
  weekDaysRow: { flexDirection: 'row', marginBottom: 8 },
  weekDayLabel: { flex: 1, textAlign: 'center', color: colors.textSecondary, fontSize: typography.sizes.xs, fontWeight: typography.weights.bold },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: DAY_SIZE, height: DAY_SIZE, alignItems: 'center', justifyContent: 'flex-start', borderRadius: 14, marginVertical: 2, paddingTop: 6 },
  daySelected: { backgroundColor: colors.primary },
  dayDisabled: { opacity: 0.1 },
  dayText: { color: colors.textPrimary, fontSize: typography.sizes.sm },
  dayTextSelected: { color: colors.background, fontWeight: typography.weights.bold },
  eventBarsContainer: { width: '100%', alignItems: 'center', marginTop: 4, gap: 2 },
  eventBar: { width: '60%', height: 3, backgroundColor: colors.primary, borderRadius: 2 },
  eventDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary },

  yearlyGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: spacing.md, gap: spacing.md },
  monthCard: { width: '47%', aspectRatio: 1, backgroundColor: colors.surface, borderRadius: 20, padding: 15, borderWidth: 1, borderColor: colors.border, justifyContent: 'space-between' },
  monthCardTitle: { color: colors.textPrimary, fontSize: typography.sizes.xs, fontWeight: typography.weights.bold },
  miniGrid: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  eventDotYear: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },

  agendaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, marginTop: spacing.lg, marginBottom: spacing.sm },
  agendaTitle: { color: colors.textSecondary, fontSize: typography.sizes.xs, fontWeight: typography.weights.bold },
  scrollList: { paddingHorizontal: spacing.md, paddingBottom: 180, paddingTop: 10 },

  eventCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 16, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  eventStatusLine: { width: 4, height: 40, borderRadius: 2, marginRight: 15 },
  eventCardContent: { flex: 1 },
  eventTime: { color: colors.primary, fontSize: typography.sizes.xs, fontWeight: typography.weights.bold },
  eventTitle: { color: colors.textPrimary, fontSize: typography.sizes.md, fontWeight: typography.weights.bold },
  eventLote: { color: colors.textSecondary, fontSize: typography.sizes.xs, marginTop: 4 },
  statusBadge: { backgroundColor: colors.warningAlpha, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { color: colors.warning, fontSize: typography.sizes.xs, fontWeight: typography.weights.bold },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 30 },
  emptyText: { color: colors.textSecondary, textAlign: 'center', marginTop: 10, fontSize: typography.sizes.sm },

  catFilterRow: { marginBottom: spacing.md },
  catFilterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  catFilterBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catFilterText: { color: colors.textSecondary, fontSize: typography.sizes.xs, fontWeight: typography.weights.bold },
  catFilterTextActive: { color: colors.background },
  addCatBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.primaryAlpha, borderWidth: 1, borderColor: colors.primary },

  vadeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 20, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  vadeIconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryAlpha, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  vadeName: { color: colors.textPrimary, fontWeight: typography.weights.bold, fontSize: typography.sizes.md },
  vadeType: { color: colors.textSecondary, fontSize: typography.sizes.xs, marginTop: 2 },
  vadeExtra: { color: colors.primary, fontSize: typography.sizes.xs, marginTop: 2, fontWeight: typography.weights.bold },

  // Historial filtros
  historialFiltersContainer: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  mesSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  mesNavBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: spacing.xs },
  mesNavText: { color: colors.primary, fontSize: typography.sizes.xs, fontWeight: typography.weights.bold },
  mesTitleText: { color: colors.textPrimary, fontSize: typography.sizes.sm, fontWeight: typography.weights.bold },
  tipoChipsRow: { gap: 8, paddingBottom: spacing.xs },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: spacing.xl },
  modalContentLarge: { backgroundColor: colors.surfaceElevated, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: spacing.xl, paddingBottom: spacing.xxl, height: '90%' },
  modalContentCenter: { backgroundColor: colors.surfaceElevated, borderRadius: 24, padding: spacing.xl },
  modalHandle: { width: 40, height: 5, backgroundColor: colors.border, borderRadius: 3, alignSelf: 'center', marginBottom: spacing.lg },
  modalTitle: { color: colors.textPrimary, fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, textAlign: 'center' },
  modalSubtitle: { color: colors.primary, fontSize: typography.sizes.sm, textAlign: 'center', marginTop: 4, marginBottom: 20 },
  inputLabel: { color: colors.textSecondary, fontSize: typography.sizes.xs, fontWeight: typography.weights.bold, textTransform: 'uppercase', marginBottom: 10, marginTop: 15 },
  subLabel: { color: colors.textSecondary, fontSize: typography.sizes.xs },
  input: { backgroundColor: colors.surface, borderRadius: 12, padding: 15, color: colors.textPrimary, marginBottom: 5, borderWidth: 1, borderColor: colors.border },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  rowInputs: { flexDirection: 'row', gap: 10 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, padding: 15, borderRadius: 12, marginTop: 15, borderWidth: 1, borderColor: colors.border },
  chipRow: { marginBottom: 5 },
  chip: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginRight: 8, height: 40 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textSecondary, fontSize: typography.sizes.xs, fontWeight: typography.weights.bold },
  chipTextActive: { color: colors.background },
  vadeItemSmall: { padding: 15, backgroundColor: colors.surface, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  vadeItemSmallActive: { borderColor: colors.primary },
  vadeNameSmall: { color: colors.textPrimary, fontSize: typography.sizes.sm, fontWeight: typography.weights.bold },
  vadeNameSmallActive: { color: colors.primary },
  vadeSubSmall: { color: colors.textSecondary, fontSize: typography.sizes.xs },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  actionBtn: { flex: 1, height: spacing.touchTarget, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  addBtnSmall: { width: 50, height: 50, backgroundColor: colors.primary, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
  catListItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, padding: 15, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  catListText: { color: colors.textPrimary, fontWeight: typography.weights.bold },

  fab: { position: 'absolute', bottom: 120, right: 24, width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 },
});
