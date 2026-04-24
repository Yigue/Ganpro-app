import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert, FlatList, Dimensions, TextInput
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
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  isToday,
  addYears,
  subYears,
  eachMonthOfInterval,
  startOfYear,
  endOfYear
} from 'date-fns';
import { es } from 'date-fns/locale';
import ScheduledOperationModel from '@data/models/ScheduledOperationModel';
import OperationCatalogModel from '@data/models/OperationCatalogModel';
import OperationLogModel from '@data/models/OperationLogModel';
import LoteModel from '@data/models/LoteModel';
import { SanidadRepository } from '@data/repositories/SanidadRepository';

const { width } = Dimensions.get('window');
const DAY_SIZE = (width - spacing.md * 2 - 20) / 7;

const sanidadRepo = new SanidadRepository(database);

type TabType = 'calendario' | 'vademecum' | 'historial';
type CalendarView = 'MONTH' | 'YEAR';

// ── Componentes de UI ────────────────────────────────────────────────────────

const SegmentedControl = ({ active, onChange }: { active: TabType, onChange: (v: TabType) => void }) => (
  <View style={styles.segmentContainer}>
    {['calendario', 'vademecum', 'historial'].map((t) => (
      <TouchableOpacity 
        key={t}
        style={[styles.segmentBtn, active === t && styles.segmentBtnActive]}
        onPress={() => onChange(t as TabType)}
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
  const months = eachMonthOfInterval({
    start: startOfYear(currentYear),
    end: endOfYear(currentYear)
  });

  return (
    <ScrollView contentContainerStyle={styles.yearlyGrid}>
      {months.map((month, index) => {
        const hasEvents = schedules.some((e: any) => isSameMonth(new Date(e.fechaProgramada), month));
        return (
          <TouchableOpacity 
            key={`month-${index}`} 
            style={styles.monthCard} 
            onPress={() => onMonthSelect(month)}
          >
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

// ── Modals: Formularios Reales ───────────────────────────────────────────────

function VademecumFormModal({ visible, onClose }: any) {
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('VACUNA');
  const [carencia, setCarencia] = useState('0');

  const handleSave = async () => {
    if (!nombre) return Alert.alert('Error', 'El nombre es obligatorio');
    try {
      await sanidadRepo.createOperation({
        nombre,
        tipo,
        diasCarencia: parseInt(carencia) || 0
      });
      Alert.alert('Éxito', 'Medicamento agregado al vademécum');
      onClose();
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContentSmall}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Nuevo Medicamento</Text>
          
          <TextInput 
            style={styles.input} 
            placeholder="Nombre del medicamento" 
            placeholderTextColor={colors.textSecondary}
            value={nombre}
            onChangeText={setNombre}
          />
          
          <View style={styles.chipRow}>
            {['VACUNA', 'ANTIBIOTICO', 'ANTIPARASITARIO'].map(t => (
              <TouchableOpacity 
                key={t} 
                style={[styles.chip, tipo === t && styles.chipActive]} 
                onPress={() => setTipo(t)}
              >
                <Text style={[styles.chipText, tipo === t && styles.chipTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput 
            style={styles.input} 
            placeholder="Días de carencia" 
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
            value={carencia}
            onChangeText={setCarencia}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleSave}>
              <Text style={{ color: colors.background, fontWeight: 'bold' }}>Guardar en Vademécum</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ProgramacionFormModal({ visible, onClose, initialDate, lotes, operations }: any) {
  const [selectedLote, setSelectedLote] = useState('');
  const [selectedOp, setSelectedOp] = useState('');

  const handleSave = async () => {
    if (!selectedLote || !selectedOp) return Alert.alert('Error', 'Faltan datos');
    try {
      await sanidadRepo.scheduleOperation({
        operationId: selectedOp,
        loteId: selectedLote,
        fechaProgramada: initialDate.getTime(),
      });
      Alert.alert('Éxito', 'Programación guardada');
      onClose();
    } catch (err) {
      Alert.alert('Error', 'No se pudo guardar');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContentLarge}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Programar Acción</Text>
          <Text style={styles.modalSubtitle}>{format(initialDate, "EEEE d 'de' MMMM", { locale: es })}</Text>
          
          <Text style={styles.inputLabel}>SELECCIONAR LOTE</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={lotes}
            keyExtractor={l => l.id}
            style={styles.chipRow}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[styles.chip, selectedLote === item.id && styles.chipActive]} 
                onPress={() => setSelectedLote(item.id)}
              >
                <Text style={[styles.chipText, selectedLote === item.id && styles.chipTextActive]}>{item.nombre}</Text>
              </TouchableOpacity>
            )}
          />

          <Text style={styles.inputLabel}>SELECCIONAR TRATAMIENTO</Text>
          <FlatList
            data={operations}
            keyExtractor={o => o.id}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[styles.vadeItemSmall, selectedOp === item.id && styles.vadeItemSmallActive]} 
                onPress={() => setSelectedOp(item.id)}
              >
                <Text style={[styles.vadeNameSmall, selectedOp === item.id && styles.vadeNameSmallActive]}>{item.nombre}</Text>
                <Text style={styles.vadeSubSmall}>{item.tipo}</Text>
              </TouchableOpacity>
            )}
            style={{ maxHeight: 200, marginTop: 10 }}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleSave}>
              <Text style={{ color: colors.background, fontWeight: 'bold' }}>Confirmar Programación</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Componentes de Lista (Historial y Calendario) ───────────────────────────

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
    <Ionicons name="chevron-forward" size={20} color={colors.textDisabled} />
  </TouchableOpacity>
);

const ScheduledItem = withObservables(['scheduled'], ({ scheduled }: { scheduled: ScheduledOperationModel }) => ({
  scheduled: scheduled.observe(),
  operation: scheduled.operation.observe(),
  lote: scheduled.lote.observe(),
}))(ScheduledItemInner);

// ── Pantalla Principal ───────────────────────────────────────────────────────

function SanidadInner({ schedules, operations, logs, lotes }: any) {
  const [activeTab, setActiveTab] = useState<TabType>('calendario');
  const [calendarMode, setCalendarView] = useState<CalendarView>('MONTH');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const [isProgModalVisible, setIsProgModalVisible] = useState(false);
  const [isVadeFormVisible, setIsVadeFormVisible] = useState(false);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const dayEvents = useMemo(() => {
    return schedules.filter((e: any) => isSameDay(new Date(e.fechaProgramada), selectedDate));
  }, [schedules, selectedDate]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Sanidad</Text>
          <Text style={styles.subtitle}>{calendarMode === 'MONTH' ? 'Vista Mensual' : 'Vista Anual'}</Text>
        </View>
        <TouchableOpacity 
          style={styles.viewToggleBtn} 
          onPress={() => setCalendarView(calendarMode === 'MONTH' ? 'YEAR' : 'MONTH')}
        >
          <Ionicons name={calendarMode === 'MONTH' ? "grid" : "calendar"} size={20} color={colors.primary} />
          <Text style={styles.viewToggleText}>{calendarMode === 'MONTH' ? 'AÑO' : 'MES'}</Text>
        </TouchableOpacity>
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
                  {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, index) => (
                    <Text key={`weekday-${index}`} style={styles.weekDayLabel}>{d}</Text>
                  ))}
                </View>
                <View style={styles.daysGrid}>
                  {days.map((day, i) => {
                    const isSelected = isSameDay(day, selectedDate);
                    const isCurrMonth = isSameMonth(day, currentMonth);
                    const hasEvent = schedules.some((e: any) => isSameDay(new Date(e.fechaProgramada), day));
                    return (
                      <TouchableOpacity 
                        key={`day-${i}`} 
                        style={[styles.dayCell, isSelected && styles.daySelected, !isCurrMonth && styles.dayDisabled]}
                        onPress={() => setSelectedDate(day)}
                      >
                        <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>{format(day, 'd')}</Text>
                        {hasEvent && <View style={[styles.eventDot, isSelected && { backgroundColor: 'white' }]} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.agendaHeader}>
                <Text style={styles.agendaTitle}>Eventos {format(selectedDate, "d MMM")}</Text>
                <TouchableOpacity onPress={() => setIsProgModalVisible(true)}><Ionicons name="add-circle" size={28} color={colors.primary} /></TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.scrollList}>
                {dayEvents.map((e: any) => (
                  <ScheduledItem key={e.id} scheduled={e} onAction={() => {}} />
                ))}
                {dayEvents.length === 0 && (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="sunny-outline" size={40} color={colors.textDisabled} />
                    <Text style={styles.emptyText}>No hay tareas para hoy.</Text>
                  </View>
                )}
              </ScrollView>
            </>
          ) : (
            <YearlyView currentYear={currentMonth} schedules={schedules} onMonthSelect={(m: Date) => {
              setCurrentMonth(m);
              setCalendarView('MONTH');
            }} />
          )}
        </View>
      )}

      {activeTab === 'vademecum' && (
        <View style={styles.flex}>
          <FlatList
            data={operations}
            keyExtractor={o => o.id}
            renderItem={({ item }) => (
              <View style={styles.vadeCard}>
                <View style={styles.vadeIconCircle}><Ionicons name="flask" size={24} color={colors.primary} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.vadeName}>{item.nombre}</Text>
                  <Text style={styles.vadeType}>{item.tipo} · {item.diasCarencia}d carencia</Text>
                </View>
                <TouchableOpacity onPress={() => Alert.alert('Borrar', '¿Eliminar del vademécum?')}>
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
            )}
            contentContainerStyle={styles.scrollList}
          />
          <TouchableOpacity style={styles.fab} onPress={() => setIsVadeFormVisible(true)}>
            <Ionicons name="add" size={32} color="white" />
          </TouchableOpacity>
        </View>
      )}

      {activeTab === 'historial' && (
        <View style={styles.flex}>
          <FlatList
            data={logs}
            keyExtractor={l => l.id}
            renderItem={({ item }) => <LogItem log={item} />}
            contentContainerStyle={styles.scrollList}
            ListEmptyComponent={<EmptyState icon="list" title="Historial vacío" subtitle="No hay registros de aplicaciones previas" />}
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

      <VademecumFormModal 
        visible={isVadeFormVisible} 
        onClose={() => setIsVadeFormVisible(false)} 
      />

    </SafeAreaView>
  );
}

const SanidadWithData = withObservables([], () => ({
  schedules: database.get<ScheduledOperationModel>('scheduled_operations').query().observe(),
  operations: database.get<OperationCatalogModel>('operations_catalog').query().observe(),
  logs: database.get<OperationLogModel>('operation_logs').query().observe(),
  lotes: database.get<LoteModel>('lotes').query().observe(),
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
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: 'bold' },
  subtitle: { color: colors.textSecondary, fontSize: 12 },
  
  viewToggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  viewToggleText: { color: colors.primary, fontSize: 10, fontWeight: 'bold' },

  segmentContainer: { flexDirection: 'row', backgroundColor: colors.surface, marginHorizontal: spacing.md, marginBottom: spacing.md, borderRadius: 16, padding: 4, borderWidth: 1, borderColor: colors.border },
  segmentBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  segmentBtnActive: { backgroundColor: colors.primary },
  segmentText: { color: colors.textSecondary, fontSize: 12, fontWeight: 'bold' },
  segmentTextActive: { color: colors.background },

  calendarCard: { backgroundColor: colors.surface, marginHorizontal: spacing.md, borderRadius: 24, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  monthSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  monthTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: 'bold' },
  weekDaysRow: { flexDirection: 'row', marginBottom: 8 },
  weekDayLabel: { flex: 1, textAlign: 'center', color: colors.textSecondary, fontSize: 10, fontWeight: 'bold' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: DAY_SIZE, height: DAY_SIZE, alignItems: 'center', justifyContent: 'center', borderRadius: 14, marginVertical: 2 },
  daySelected: { backgroundColor: colors.primary },
  dayDisabled: { opacity: 0.1 },
  dayText: { color: colors.textPrimary, fontSize: 14 },
  dayTextSelected: { color: colors.background, fontWeight: 'bold' },
  eventDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary, marginTop: 4 },

  yearlyGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: spacing.md, gap: spacing.md },
  monthCard: { width: '47%', aspectRatio: 1, backgroundColor: colors.surface, borderRadius: 20, padding: 15, borderWidth: 1, borderColor: colors.border, justifyContent: 'space-between' },
  monthCardTitle: { color: colors.textPrimary, fontSize: 12, fontWeight: 'bold' },
  miniGrid: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  eventDotYear: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },

  agendaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, marginTop: spacing.lg, marginBottom: spacing.sm },
  agendaTitle: { color: colors.textSecondary, fontSize: 12, fontWeight: 'bold' },
  scrollList: { paddingHorizontal: spacing.md, paddingBottom: 180 },
  
  eventCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 20, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  eventStatusLine: { width: 4, height: 40, borderRadius: 2, marginRight: 15 },
  eventCardContent: { flex: 1 },
  eventTime: { color: colors.primary, fontSize: 10, fontWeight: 'bold' },
  eventTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: 'bold' },
  eventLote: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 30 },
  emptyText: { color: colors.textSecondary, textAlign: 'center', marginTop: 10, fontSize: 13 },

  vadeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 20, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  vadeIconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,214,143,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  vadeName: { color: colors.textPrimary, fontWeight: 'bold', fontSize: 15 },
  vadeType: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContentLarge: { backgroundColor: colors.surfaceElevated, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: spacing.xl, paddingBottom: spacing.xxl, height: '80%' },
  modalContentSmall: { backgroundColor: colors.surfaceElevated, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: spacing.xl, paddingBottom: spacing.xxl },
  modalHandle: { width: 40, height: 5, backgroundColor: colors.border, borderRadius: 3, alignSelf: 'center', marginBottom: spacing.lg },
  modalTitle: { color: colors.textPrimary, fontSize: 22, fontWeight: 'bold', textAlign: 'center' },
  modalSubtitle: { color: colors.primary, fontSize: 14, textAlign: 'center', marginTop: 4, marginBottom: 20 },
  inputLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 10, marginTop: 15 },
  input: { backgroundColor: colors.surface, borderRadius: 12, padding: 15, color: colors.textPrimary, marginBottom: 15, borderWidth: 1, borderColor: colors.border },
  chipRow: { marginBottom: 10 },
  chip: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginRight: 8, height: 40 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textSecondary, fontSize: 12, fontWeight: 'bold' },
  chipTextActive: { color: colors.background },
  vadeItemSmall: { padding: 15, backgroundColor: colors.surface, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  vadeItemSmallActive: { borderColor: colors.primary },
  vadeNameSmall: { color: colors.textPrimary, fontSize: 14, fontWeight: 'bold' },
  vadeNameSmallActive: { color: colors.primary },
  vadeSubSmall: { color: colors.textSecondary, fontSize: 11 },
  modalActions: { marginTop: 20 },
  actionBtn: { height: 56, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  fab: { position: 'absolute', bottom: 120, right: 24, width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 },
});
