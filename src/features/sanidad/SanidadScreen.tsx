import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert, FlatList, Dimensions, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import withObservables from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';
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
  subYears
} from 'date-fns';
import { es } from 'date-fns/locale';
import ScheduledOperationModel from '@data/models/ScheduledOperationModel';
import OperationCatalogModel from '@data/models/OperationCatalogModel';
import OperationLogModel from '@data/models/OperationLogModel';
import LoteModel from '@data/models/LoteModel';
import { SanidadRepository } from '@data/repositories/SanidadRepository';
import { LoteRepository } from '@data/repositories/LoteRepository';

const { width } = Dimensions.get('window');
const DAY_SIZE = (width - spacing.md * 2 - 20) / 7;

const sanidadRepo = new SanidadRepository(database);
const loteRepo = new LoteRepository(database);

type TabType = 'calendario' | 'vademecum' | 'historial';

// ── Componentes de UI ────────────────────────────────────────────────────────

const SegmentedControl = ({ active, onChange }: { active: TabType, onChange: (v: TabType) => void }) => (
  <View style={styles.segmentContainer}>
    <TouchableOpacity 
      style={[styles.segmentBtn, active === 'calendario' && styles.segmentBtnActive]}
      onPress={() => onChange('calendario')}
    >
      <Ionicons name="calendar" size={16} color={active === 'calendario' ? colors.background : colors.textSecondary} />
      <Text style={[styles.segmentText, active === 'calendario' && styles.segmentTextActive]}>Calendario</Text>
    </TouchableOpacity>
    <TouchableOpacity 
      style={[styles.segmentBtn, active === 'vademecum' && styles.segmentBtnActive]}
      onPress={() => onChange('vademecum')}
    >
      <Ionicons name="flask" size={16} color={active === 'vademecum' ? colors.background : colors.textSecondary} />
      <Text style={[styles.segmentText, active === 'vademecum' && styles.segmentTextActive]}>Vademécum</Text>
    </TouchableOpacity>
    <TouchableOpacity 
      style={[styles.segmentBtn, active === 'historial' && styles.segmentBtnActive]}
      onPress={() => onChange('historial')}
    >
      <Ionicons name="list" size={16} color={active === 'historial' ? colors.background : colors.textSecondary} />
      <Text style={[styles.segmentText, active === 'historial' && styles.segmentTextActive]}>Historial</Text>
    </TouchableOpacity>
  </View>
);

// ── Modals: Formularios Reales ───────────────────────────────────────────────

function ProgramacionFormModal({ visible, onClose, initialDate, lotes, operations }: any) {
  const [selectedLote, setSelectedLote] = useState('');
  const [selectedOp, setSelectedOp] = useState('');

  const handleSave = async () => {
    if (!selectedLote || !selectedOp) {
      Alert.alert('Error', 'Por favor seleccione lote y tratamiento.');
      return;
    }
    try {
      await sanidadRepo.scheduleOperation({
        operationId: selectedOp,
        loteId: selectedLote,
        fechaProgramada: initialDate.getTime(),
      });
      Alert.alert('Éxito', 'Programación registrada correctamente.');
      onClose();
    } catch (err) {
      Alert.alert('Error', 'No se pudo guardar la programación.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContentLarge}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Programar Tratamiento</Text>
          <Text style={styles.modalSubtitle}>{format(initialDate, "EEEE d 'de' MMMM", { locale: es })}</Text>
          
          <Text style={styles.inputLabel}>SELECCIONAR LOTE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {lotes.map((l: any) => (
              <TouchableOpacity 
                key={l.id} 
                style={[styles.chip, selectedLote === l.id && styles.chipActive]}
                onPress={() => setSelectedLote(l.id)}
              >
                <Text style={[styles.chipText, selectedLote === l.id && styles.chipTextActive]}>{l.nombre}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.inputLabel}>SELECCIONAR MEDICAMENTO/PROTOCOLOS</Text>
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
            style={{ maxHeight: 200 }}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surface }]} onPress={onClose}>
              <Text style={{ color: colors.textPrimary }}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={handleSave}>
              <Text style={{ color: colors.background, fontWeight: 'bold' }}>Guardar Programación</Text>
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
    <View style={styles.eventStatusLine} />
    <View style={styles.eventCardContent}>
      <Text style={styles.eventTime}>{format(new Date(log.fechaAplicacion), 'dd MMM yyyy')}</Text>
      <Text style={styles.eventTitle}>{operation?.nombre || 'Operación'}</Text>
      <Text style={styles.eventLote}>Lote: {lote?.nombre || 'General'} · {log.responsable || 'Sin responsable'}</Text>
    </View>
    <StatusBadge label="REALIZADO" categoria="Vaca" />
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
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const [isProgModalVisible, setIsProgModalVisible] = useState(false);

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
          <Text style={styles.subtitle}>Gestión operativa del campo</Text>
        </View>
        <View style={styles.yearNav}>
          <TouchableOpacity onPress={() => setCurrentMonth(subYears(currentMonth, 1))}><Ionicons name="chevron-back" size={16} color={colors.primary} /></TouchableOpacity>
          <Text style={styles.yearText}>{format(currentMonth, 'yyyy')}</Text>
          <TouchableOpacity onPress={() => setCurrentMonth(addYears(currentMonth, 1))}><Ionicons name="chevron-forward" size={16} color={colors.primary} /></TouchableOpacity>
        </View>
      </View>

      <SegmentedControl active={activeTab} onChange={setActiveTab} />

      {activeTab === 'calendario' && (
        <View style={styles.flex}>
          {/* Calendario Mensual */}
          <View style={styles.calendarCard}>
            <View style={styles.monthSelector}>
              <TouchableOpacity onPress={() => setCurrentMonth(subMonths(currentMonth, 1))}><Ionicons name="arrow-back" size={20} color={colors.primary} /></TouchableOpacity>
              <Text style={styles.monthTitle}>{format(currentMonth, 'MMMM', { locale: es }).toUpperCase()}</Text>
              <TouchableOpacity onPress={() => setCurrentMonth(addMonths(currentMonth, 1))}><Ionicons name="arrow-forward" size={20} color={colors.primary} /></TouchableOpacity>
            </View>
            <View style={styles.weekDaysRow}>
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => <Text key={d} style={styles.weekDayLabel}>{d}</Text>)}
            </View>
            <View style={styles.daysGrid}>
              {days.map((day, i) => {
                const isSelected = isSameDay(day, selectedDate);
                const isCurrMonth = isSameMonth(day, currentMonth);
                const hasEvent = schedules.some((e: any) => isSameDay(new Date(e.fechaProgramada), day));
                return (
                  <TouchableOpacity 
                    key={i} 
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
            <Text style={styles.agendaTitle}>Eventos: {format(selectedDate, "d MMM", { locale: es })}</Text>
            <TouchableOpacity style={styles.addDayBtn} onPress={() => setIsProgModalVisible(true)}>
              <Ionicons name="add-circle" size={24} color={colors.primary} />
              <Text style={styles.addDayText}>Programar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollList}>
            {dayEvents.length === 0 ? (
              <View style={styles.emptyStateCenter}>
                <Ionicons name="sunny" size={48} color={colors.textDisabled} />
                <Text style={styles.emptyTitle}>Día sin tareas</Text>
                <Text style={styles.emptySub}>Tocá el botón para agendar un tratamiento</Text>
              </View>
            ) : (
              dayEvents.map((e: any) => <ScheduledItem key={e.id} scheduled={e} onAction={() => {}} />)
            )}
          </ScrollView>
        </View>
      )}

      {activeTab === 'historial' && (
        <FlatList
          data={logs}
          keyExtractor={l => l.id}
          renderItem={({ item }) => <LogItem log={item} />}
          contentContainerStyle={styles.scrollList}
          ListEmptyComponent={<EmptyState icon="list" title="Historial vacío" subtitle="No hay registros de aplicaciones previas" />}
        />
      )}

      {activeTab === 'vademecum' && (
        <ScrollView contentContainerStyle={styles.scrollList}>
          {operations.map((op: any) => (
            <TouchableOpacity key={op.id} style={styles.vadeCard} onPress={() => Alert.alert('Detalle', op.nombre)}>
              <View style={styles.vadeIconCircle}><Ionicons name="flask" size={24} color={colors.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.vadeName}>{op.nombre}</Text>
                <Text style={styles.vadeType}>{op.tipo} · {op.diasCarencia}d carencia</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textDisabled} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* FAB Subido para evitar Navbar */}
      <TouchableOpacity style={styles.fab} onPress={() => setIsProgModalVisible(true)}>
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity>

      <ProgramacionFormModal 
        visible={isProgModalVisible} 
        onClose={() => setIsProgModalVisible(false)} 
        initialDate={selectedDate}
        lotes={lotes}
        operations={operations}
      />

    </SafeAreaView>
  );
}

const SanidadWithData = withObservables([], () => ({
  schedules: database.get<ScheduledOperationModel>('scheduled_operations').query(Q.sortBy('fecha_programada', Q.asc)).observe(),
  operations: database.get<OperationCatalogModel>('operations_catalog').query(Q.sortBy('nombre', Q.asc)).observe(),
  logs: database.get<OperationLogModel>('operation_logs').query(Q.sortBy('fecha_aplicacion', Q.desc)).observe(),
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
  yearNav: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, padding: 8, borderRadius: 12 },
  yearText: { color: colors.primary, fontWeight: 'bold' },

  segmentContainer: { flexDirection: 'row', backgroundColor: colors.surface, marginHorizontal: spacing.md, marginBottom: spacing.md, borderRadius: 16, padding: 4, borderWidth: 1, borderColor: colors.border },
  segmentBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, gap: 6 },
  segmentBtnActive: { backgroundColor: colors.primary },
  segmentText: { color: colors.textSecondary, fontSize: 13, fontWeight: 'bold' },
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

  agendaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, marginTop: spacing.lg, marginBottom: spacing.sm },
  agendaTitle: { color: colors.textSecondary, fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
  addDayBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addDayText: { color: colors.primary, fontSize: 12, fontWeight: 'bold' },

  scrollList: { paddingHorizontal: spacing.md, paddingBottom: 180 },
  eventCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 20, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  eventStatusLine: { width: 4, height: 40, backgroundColor: colors.primary, borderRadius: 2, marginRight: spacing.md },
  eventCardContent: { flex: 1 },
  eventTime: { color: colors.primary, fontSize: 10, fontWeight: 'bold' },
  eventTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: 'bold' },
  eventLote: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },

  vadeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 20, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  vadeIconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,214,143,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  vadeName: { color: colors.textPrimary, fontSize: 16, fontWeight: 'bold' },
  vadeType: { color: colors.textSecondary, fontSize: 12 },

  emptyStateCenter: { alignItems: 'center', justifyContent: 'center', marginTop: 40 },
  emptyTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: 'bold', marginTop: 16 },
  emptySub: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContentLarge: { backgroundColor: colors.surfaceElevated, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: spacing.xl, paddingBottom: spacing.xxl, height: '85%' },
  modalHandle: { width: 40, height: 5, backgroundColor: colors.border, borderRadius: 3, alignSelf: 'center', marginBottom: spacing.lg },
  modalTitle: { color: colors.textPrimary, fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  modalSubtitle: { color: colors.primary, fontSize: 14, textAlign: 'center', marginTop: 4, marginBottom: spacing.xl },
  inputLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 12, marginTop: spacing.lg },
  chipRow: { marginBottom: spacing.md },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginRight: 8 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textSecondary, fontSize: 14, fontWeight: 'bold' },
  chipTextActive: { color: colors.background },
  vadeItemSmall: { padding: 16, backgroundColor: colors.surface, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  vadeItemSmallActive: { borderColor: colors.primary },
  vadeNameSmall: { color: colors.textPrimary, fontWeight: 'bold' },
  vadeNameSmallActive: { color: colors.primary },
  vadeSubSmall: { color: colors.textSecondary, fontSize: 12 },
  modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  actionBtn: { flex: 1, height: 56, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },

  fab: { position: 'absolute', bottom: 120, right: 24, width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 },
});
