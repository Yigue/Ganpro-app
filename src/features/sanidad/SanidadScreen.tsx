import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import withObservables from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';
import { EmptyState } from '@shared/components/EmptyState';
import { ObservableErrorBoundary } from '@shared/components/ObservableErrorBoundary';
import { colors, spacing, typography } from '@theme/index';
import { database } from '@data/database/database';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ScheduledOperationModel from '@data/models/ScheduledOperationModel';
import OperationCatalogModel from '@data/models/OperationCatalogModel';
import LoteModel from '@data/models/LoteModel';

type TabType = 'calendario' | 'vademecum';

// ── Componentes UI ────────────────────────────────────────────────────────────

const SegmentedControl = ({ active, onChange }: { active: TabType, onChange: (v: TabType) => void }) => (
  <View style={styles.segmentContainer}>
    <TouchableOpacity 
      style={[styles.segmentBtn, active === 'calendario' && styles.segmentBtnActive]}
      onPress={() => onChange('calendario')}
      activeOpacity={0.8}
    >
      <Ionicons name="calendar-outline" size={18} color={active === 'calendario' ? colors.background : colors.textSecondary} />
      <Text style={[styles.segmentText, active === 'calendario' && styles.segmentTextActive]}>Calendario</Text>
    </TouchableOpacity>
    <TouchableOpacity 
      style={[styles.segmentBtn, active === 'vademecum' && styles.segmentBtnActive]}
      onPress={() => onChange('vademecum')}
      activeOpacity={0.8}
    >
      <Ionicons name="flask-outline" size={18} color={active === 'vademecum' ? colors.background : colors.textSecondary} />
      <Text style={[styles.segmentText, active === 'vademecum' && styles.segmentTextActive]}>Vademécum</Text>
    </TouchableOpacity>
  </View>
);

// ── Calendario (Eventos Sanitarios) ──────────────────────────────────────────

const ScheduledItemInner = ({ scheduled, operation, lote, onPress }: any) => {
  const isPending = scheduled.estado === 'PENDIENTE';
  const dateStr = format(new Date(scheduled.fechaProgramada), "EEEE d 'de' MMMM", { locale: es });
  
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(scheduled, operation, lote)} activeOpacity={0.7}>
      <View style={styles.cardMain}>
        <Text style={styles.dateText}>{dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}</Text>
        <Text style={styles.cardTitle}>{operation?.nombre || 'Cargando Operación...'}</Text>
        
        <View style={styles.badgeRow}>
          <View style={styles.loteBadge}>
            <Ionicons name="layers-outline" size={12} color={colors.textSecondary} />
            <Text style={styles.loteText}>{lote?.nombre || 'Cargando Lote...'}</Text>
          </View>
          <View style={[styles.statusBadge, !isPending && styles.statusBadgeSafe]}>
            <Text style={[styles.statusText, !isPending && styles.statusTextSafe]}>{scheduled.estado}</Text>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textDisabled} />
    </TouchableOpacity>
  );
};

const ScheduledItem = withObservables(['scheduled'], ({ scheduled }: { scheduled: ScheduledOperationModel }) => ({
  scheduled: scheduled.observe(),
  operation: scheduled.operation.observe(),
  lote: scheduled.lote.observe(),
}))(ScheduledItemInner);

const CalendarioListInner = ({ schedules, onAdd, onSelect }: any) => (
  <View style={styles.flex}>
    {schedules.length === 0 ? (
      <EmptyState icon="📅" title="Sin programación" subtitle="No hay eventos sanitarios agendados" />
    ) : (
      <FlatList
        data={schedules}
        keyExtractor={s => s.id}
        renderItem={({ item }) => <ScheduledItem scheduled={item} onPress={onSelect} />}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      />
    )}
    <TouchableOpacity style={styles.fab} onPress={onAdd}>
      <Ionicons name="add" size={28} color="white" />
    </TouchableOpacity>
  </View>
);

const CalendarioList = withObservables([], () => ({
  schedules: database.get<ScheduledOperationModel>('scheduled_operations').query(Q.sortBy('fecha_programada', Q.asc)).observe(),
}))(CalendarioListInner);

// ── Vademécum (Gestión de Tratamientos) ──────────────────────────────────────

const VademecumItem = ({ item, onPress }: { item: OperationCatalogModel, onPress: (o: OperationCatalogModel) => void }) => {
  const isVacuna = item.tipo === 'VACUNA';
  
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(item)} activeOpacity={0.7}>
      <View style={styles.cardIcon}>
        <Ionicons name={isVacuna ? "medical" : "flask"} size={22} color={colors.primary} />
      </View>
      <View style={styles.cardMain}>
        <Text style={styles.cardTitle}>{item.nombre}</Text>
        <Text style={styles.cardSubtitle}>
          {item.tipo} · {item.diasCarencia > 0 ? `${item.diasCarencia} días de carencia` : 'Sin carencia'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textDisabled} />
    </TouchableOpacity>
  );
};

const VademecumListInner = ({ operations, onAdd, onSelect }: any) => (
  <View style={styles.flex}>
    {operations.length === 0 ? (
      <EmptyState icon="💊" title="Catálogo vacío" subtitle="Agregá tratamientos o protocolos" />
    ) : (
      <FlatList
        data={operations}
        keyExtractor={o => o.id}
        renderItem={({ item }) => <VademecumItem item={item} onPress={onSelect} />}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      />
    )}
    <TouchableOpacity style={styles.fab} onPress={onAdd}>
      <Ionicons name="add" size={28} color="white" />
    </TouchableOpacity>
  </View>
);

const VademecumList = withObservables([], () => ({
  operations: database.get<OperationCatalogModel>('operations_catalog').query(Q.sortBy('nombre', Q.asc)).observe(),
}))(VademecumListInner);

// ── Pantalla Principal ───────────────────────────────────────────────────────

export function SanidadScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('calendario');

  const handleAddCalendario = () => {
    Alert.alert('Nuevo Evento', 'Acá se abrirá el modal para programar un tratamiento a un lote.');
  };

  const handleAddVademecum = () => {
    Alert.alert('Nuevo Tratamiento', 'Acá se abrirá el formulario para crear un medicamento o protocolo.');
  };

  const handleSelectSchedule = (scheduled: any, op: any, lote: any) => {
    Alert.alert(
      'Detalle Programación',
      `Operación: ${op?.nombre}\nLote: ${lote?.nombre}\nEstado: ${scheduled.estado}\n\n[Próximamente CRUD contextual]`
    );
  };

  const handleSelectOperation = (op: any) => {
    Alert.alert(
      'Detalle Tratamiento',
      `Nombre: ${op.nombre}\nTipo: ${op.tipo}\nCarencia: ${op.diasCarencia} días\n\n[Próximamente edición e historial]`
    );
  };

  return (
    <ObservableErrorBoundary fallbackTitle="Error al cargar sanidad">
      <SafeAreaView style={styles.container} edges={['top']}>
        
        {/* Header Fijo */}
        <View style={styles.header}>
          <Text style={styles.title}>Sanidad</Text>
        </View>

        {/* Navegación (Tabs) */}
        <SegmentedControl active={activeTab} onChange={setActiveTab} />

        {/* Contenido (MVP) */}
        <View style={styles.flex}>
          {activeTab === 'calendario' ? (
            <CalendarioList onAdd={handleAddCalendario} onSelect={handleSelectSchedule} />
          ) : (
            <VademecumList onAdd={handleAddVademecum} onSelect={handleSelectOperation} />
          )}
        </View>

      </SafeAreaView>
    </ObservableErrorBoundary>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.background },
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
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: 8,
    gap: spacing.xs,
  },
  segmentBtnActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  segmentTextActive: {
    color: colors.background,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: 100,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,214,143,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  cardMain: {
    flex: 1,
  },
  dateText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: typography.weights.bold,
  },
  cardSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: spacing.sm,
  },
  loteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  loteText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: typography.weights.medium,
  },
  statusBadge: {
    backgroundColor: 'rgba(255,170,0,0.15)', // Pending/Warning style
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeSafe: {
    backgroundColor: 'rgba(0,214,143,0.15)', // Completed/Success style
  },
  statusText: {
    color: colors.warning,
    fontSize: 11,
    fontWeight: typography.weights.bold,
  },
  statusTextSafe: {
    color: colors.primary,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
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
