import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert, FlatList, Dimensions
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
  isToday
} from 'date-fns';
import { es } from 'date-fns/locale';
import ScheduledOperationModel from '@data/models/ScheduledOperationModel';
import OperationCatalogModel from '@data/models/OperationCatalogModel';

const { width } = Dimensions.get('window');
const DAY_SIZE = (width - spacing.md * 2 - 20) / 7;

type TabType = 'calendario' | 'vademecum';

// ── Componentes de Navegación ──────────────────────────────────────────────

const SegmentedControl = ({ active, onChange }: { active: TabType, onChange: (v: TabType) => void }) => (
  <View style={styles.segmentContainer}>
    <TouchableOpacity 
      style={[styles.segmentBtn, active === 'calendario' && styles.segmentBtnActive]}
      onPress={() => onChange('calendario')}
    >
      <Ionicons name="calendar" size={18} color={active === 'calendario' ? colors.background : colors.textSecondary} />
      <Text style={[styles.segmentText, active === 'calendario' && styles.segmentTextActive]}>Calendario</Text>
    </TouchableOpacity>
    <TouchableOpacity 
      style={[styles.segmentBtn, active === 'vademecum' && styles.segmentBtnActive]}
      onPress={() => onChange('vademecum')}
    >
      <Ionicons name="flask" size={18} color={active === 'vademecum' ? colors.background : colors.textSecondary} />
      <Text style={[styles.segmentText, active === 'vademecum' && styles.segmentTextActive]}>Vademécum</Text>
    </TouchableOpacity>
  </View>
);

// ── Módulo Calendario ────────────────────────────────────────────────────────

function VisualCalendar({ selectedDate, onDateSelect, events }: { selectedDate: Date, onDateSelect: (d: Date) => void, events: ScheduledOperationModel[] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  return (
    <View style={styles.calendarContainer}>
      {/* Calendar Header */}
      <View style={styles.calendarHeader}>
        <Text style={styles.monthTitle}>{format(currentMonth, 'MMMM yyyy', { locale: es }).toUpperCase()}</Text>
        <View style={styles.calendarNav}>
          <TouchableOpacity onPress={prevMonth} style={styles.navBtn}><Ionicons name="chevron-back" size={20} color={colors.primary} /></TouchableOpacity>
          <TouchableOpacity onPress={nextMonth} style={styles.navBtn}><Ionicons name="chevron-forward" size={20} color={colors.primary} /></TouchableOpacity>
        </View>
      </View>

      {/* Week Days */}
      <View style={styles.weekDaysRow}>
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => <Text key={d} style={styles.weekDayLabel}>{d}</Text>)}
      </View>

      {/* Days Grid */}
      <View style={styles.daysGrid}>
        {days.map((day, i) => {
          const isSelected = isSameDay(day, selectedDate);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const hasEvent = events.some(e => isSameDay(new Date(e.fechaProgramada), day));
          const today = isToday(day);

          return (
            <TouchableOpacity 
              key={i} 
              style={[styles.dayCell, isSelected && styles.daySelected, !isCurrentMonth && styles.dayDisabled]}
              onPress={() => onDateSelect(day)}
            >
              <Text style={[styles.dayText, isSelected && styles.dayTextSelected, today && styles.todayText]}>
                {format(day, 'd')}
              </Text>
              {hasEvent && <View style={[styles.eventDot, isSelected && { backgroundColor: 'white' }]} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── Listado de Eventos (Drill-down) ──────────────────────────────────────────

const EventCard = ({ event }: { event: any }) => {
  const [op, setOp] = useState<any>(null);
  const [lote, setLote] = useState<any>(null);

  useMemo(() => {
    event.operation.fetch().then(setOp);
    event.lote.fetch().then(setLote);
  }, [event]);

  return (
    <View style={styles.eventCard}>
      <View style={styles.eventCardLine} />
      <View style={styles.eventCardContent}>
        <Text style={styles.eventTime}>{format(new Date(event.fechaProgramada), 'HH:mm')} hs</Text>
        <Text style={styles.eventTitle}>{op?.nombre || 'Cargando...'}</Text>
        <View style={styles.eventMeta}>
          <Ionicons name="layers-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.eventLote}>{lote?.nombre || '...'}</Text>
          <View style={[styles.statusTag, event.estado === 'COMPLETADO' && styles.statusTagOk]}>
            <Text style={styles.statusTagText}>{event.estado}</Text>
          </View>
        </View>
      </View>
      <TouchableOpacity onPress={() => Alert.alert('Acción', 'Editar o eliminar evento')}>
        <Ionicons name="ellipsis-vertical" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
};

// ── Módulo Vademécum ─────────────────────────────────────────────────────────

const VademecumCategory = ({ title, items }: { title: string, items: OperationCatalogModel[] }) => {
  const [expanded, setExpanded] = useState(true);
  if (items.length === 0) return null;

  return (
    <View style={styles.vadeCategory}>
      <TouchableOpacity style={styles.categoryHeader} onPress={() => setExpanded(!expanded)}>
        <Text style={styles.categoryTitle}>{title} ({items.length})</Text>
        <Ionicons name={expanded ? "chevron-down" : "chevron-forward"} size={18} color={colors.textSecondary} />
      </TouchableOpacity>
      {expanded && items.map(item => (
        <TouchableOpacity key={item.id} style={styles.vadeItem} onPress={() => Alert.alert('Tratamiento', item.nombre)}>
          <View style={styles.vadeIcon}><Ionicons name="flask-outline" size={20} color={colors.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.vadeName}>{item.nombre}</Text>
            <Text style={styles.vadeSub}>{item.diasCarencia > 0 ? `${item.diasCarencia} días carencia` : 'Sin carencia'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textDisabled} />
        </TouchableOpacity>
      ))}
    </View>
  );
};

// ── Pantalla Principal ───────────────────────────────────────────────────────

function SanidadInner({ schedules, operations }: { schedules: ScheduledOperationModel[], operations: OperationCatalogModel[] }) {
  const [activeTab, setActiveTab] = useState<TabType>('calendario');
  const [selectedDate, setSelectedDate] = useState(new Date());

  const dayEvents = useMemo(() => {
    return schedules.filter(e => isSameDay(new Date(e.fechaProgramada), selectedDate));
  }, [schedules, selectedDate]);

  const groupedVade = useMemo(() => {
    const groups: Record<string, OperationCatalogModel[]> = {};
    operations.forEach(o => {
      const cat = o.tipo || 'OTROS';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(o);
    });
    return groups;
  }, [operations]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Sanidad</Text>
      </View>

      <SegmentedControl active={activeTab} onChange={setActiveTab} />

      {activeTab === 'calendario' ? (
        <View style={styles.flex}>
          <VisualCalendar 
            selectedDate={selectedDate} 
            onDateSelect={setSelectedDate} 
            events={schedules} 
          />
          
          <View style={styles.agendaHeader}>
            <Text style={styles.agendaTitle}>Eventos para el {format(selectedDate, "d 'de' MMMM", { locale: es })}</Text>
          </View>

          <ScrollView contentContainerStyle={styles.agendaList}>
            {dayEvents.length === 0 ? (
              <EmptyState icon="sunny-outline" title="Día libre" subtitle="No hay tareas programadas" />
            ) : (
              dayEvents.map(e => <EventCard key={e.id} event={e} />)
            )}
          </ScrollView>

          <TouchableOpacity style={styles.fab} onPress={() => Alert.alert('Programar', 'Crear nuevo evento para este día')}>
            <Ionicons name="add" size={30} color="white" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.flex}>
          <ScrollView contentContainerStyle={styles.vadeScroll}>
            {Object.entries(groupedVade).length === 0 ? (
              <EmptyState icon="file-tray-outline" title="Vademécum Vacío" subtitle="Cargá tus tratamientos aquí" />
            ) : (
              Object.entries(groupedVade).map(([cat, items]) => (
                <VademecumCategory key={cat} title={cat} items={items} />
              ))
            )}
          </ScrollView>
          
          <TouchableOpacity style={styles.fab} onPress={() => Alert.alert('Nuevo', 'Cargar nuevo medicamento o protocolo')}>
            <Ionicons name="add" size={30} color="white" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const SanidadWithData = withObservables([], () => ({
  schedules: database.get<ScheduledOperationModel>('scheduled_operations').query(Q.sortBy('fecha_programada', Q.asc)).observe(),
  operations: database.get<OperationCatalogModel>('operations_catalog').query(Q.sortBy('nombre', Q.asc)).observe(),
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
  header: { padding: spacing.md },
  title: { color: colors.textPrimary, fontSize: typography.sizes.xl, fontWeight: typography.weights.bold },
  
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  segmentBtnActive: { backgroundColor: colors.primary },
  segmentText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  segmentTextActive: { color: colors.background },

  // Calendar
  calendarContainer: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    borderRadius: 20,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  monthTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: 'bold' },
  calendarNav: { flexDirection: 'row', gap: spacing.sm },
  navBtn: { padding: 4 },
  weekDaysRow: { flexDirection: 'row', marginBottom: spacing.sm },
  weekDayLabel: { flex: 1, textAlign: 'center', color: colors.textSecondary, fontSize: 10, fontWeight: 'bold' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: DAY_SIZE,
    height: DAY_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    marginVertical: 2,
  },
  daySelected: { backgroundColor: colors.primary },
  dayDisabled: { opacity: 0.2 },
  dayText: { color: colors.textPrimary, fontSize: 14 },
  dayTextSelected: { color: colors.background, fontWeight: 'bold' },
  todayText: { color: colors.primary, fontWeight: 'bold', textDecorationLine: 'underline' },
  eventDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary, marginTop: 2 },

  // Agenda
  agendaHeader: { paddingHorizontal: spacing.md, marginTop: spacing.lg, marginBottom: spacing.sm },
  agendaTitle: { color: colors.textSecondary, fontSize: 12, textTransform: 'uppercase', fontWeight: 'bold' },
  agendaList: { paddingHorizontal: spacing.md, paddingBottom: 150 },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  eventCardLine: { width: 4, height: '100%', backgroundColor: colors.primary, borderRadius: 2, marginRight: spacing.md },
  eventCardContent: { flex: 1 },
  eventTime: { color: colors.primary, fontSize: 10, fontWeight: 'bold' },
  eventTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: 'bold' },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  eventLote: { color: colors.textSecondary, fontSize: 12 },
  statusTag: { backgroundColor: 'rgba(255,170,0,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  statusTagOk: { backgroundColor: 'rgba(0,214,143,0.1)' },
  statusTagText: { color: colors.textSecondary, fontSize: 9, fontWeight: 'bold' },

  // Vademecum
  vadeScroll: { paddingHorizontal: spacing.md, paddingBottom: 150 },
  vadeCategory: { marginBottom: spacing.lg },
  vadeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 16,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  vadeIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,214,143,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  vadeName: { color: colors.textPrimary, fontSize: 16, fontWeight: 'bold' },
  vadeSub: { color: colors.textSecondary, fontSize: 12 },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  categoryTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: 'bold' },

  fab: {
    position: 'absolute',
    bottom: 110, // Subido para que el navbar no lo tape
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
});
