import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import withObservables from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ObservableErrorBoundary } from '@shared/components/ObservableErrorBoundary';
import { EmptyState } from '@shared/components/EmptyState';
import { colors, spacing, typography } from '@theme/index';
import { database } from '@data/database/database';
import { calcularGDP } from '@core/utils/nutricionEngine';
import { EVENTO_TIPO, type EventoTipoType } from '@core/constants/eventTypes';
import { KPICard } from './KPICard';
import { SimplePieChart } from './SimplePieChart';
import { SimpleLineChart } from './SimpleLineChart';
import { SemaforoCard } from './SemaforoCard';
import { TaskCard } from './TaskCard';
import { AddTaskModal } from './AddTaskModal';
import type AnimalModel from '@data/models/AnimalModel';
import type EventoModel from '@data/models/EventoModel';
import TaskModel, { type TaskPriority, type TaskStatus } from '@data/models/TaskModel';

// ─── Types ───────────────────────────────────────────────────────────────────

interface OperativoTabOuterProps {
  loteId: string | null;
}

interface OperativoTabProps extends OperativoTabOuterProps {
  animalesActivos: AnimalModel[];
  animalesMuertos: AnimalModel[];
  todosAnimales: AnimalModel[];
  pesajes: EventoModel[];
  eventosRecientes: EventoModel[];
  tasks: TaskModel[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TIPO_META: Record<EventoTipoType, { icon: string; color: string }> = {
  PESAJE: { icon: '⚖️', color: colors.info },
  VACUNACION: { icon: '💉', color: colors.warning },
  CAMBIO_LOTE: { icon: '🔀', color: colors.primary },
  TACTO: { icon: '🔬', color: colors.purple },
  OTRO: { icon: '📋', color: colors.textSecondary },
};

function groupEventosByDate(eventos: EventoModel[]): { label: string; data: EventoModel[] }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups = new Map<string, EventoModel[]>();
  for (const evento of eventos) {
    const d = new Date(evento.timestamp);
    d.setHours(0, 0, 0, 0);
    let label: string;
    if (d.getTime() === today.getTime()) label = 'Hoy';
    else if (d.getTime() === yesterday.getTime()) label = 'Ayer';
    else label = format(d, "d 'de' MMMM", { locale: es });
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(evento);
  }
  return Array.from(groups.entries()).map(([label, data]) => ({ label, data }));
}

function parseDueDateText(text: string): number | null {
  const parts = text.split('/');
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts.map(Number);
  if (isNaN(dd) || isNaN(mm) || isNaN(yyyy)) return null;
  const d = new Date(yyyy, mm - 1, dd);
  return isNaN(d.getTime()) ? null : d.getTime();
}

// ─── Task Group Section ───────────────────────────────────────────────────────

interface TaskGroupProps {
  title: string;
  tasks: TaskModel[];
  onComplete: (task: TaskModel) => void;
  onEdit: (task: TaskModel) => void;
  onDelete: (task: TaskModel) => void;
}

function TaskGroup({ title, tasks, onComplete, onEdit, onDelete }: TaskGroupProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (tasks.length === 0) return null;

  return (
    <View style={taskGroupStyles.container}>
      <TouchableOpacity
        style={taskGroupStyles.header}
        onPress={() => setCollapsed(!collapsed)}
        activeOpacity={0.7}
      >
        <Text style={taskGroupStyles.title}>{title}</Text>
        <View style={taskGroupStyles.headerRight}>
          <View style={taskGroupStyles.countBadge}>
            <Text style={taskGroupStyles.countText}>{tasks.length}</Text>
          </View>
          <Ionicons
            name={collapsed ? 'chevron-down-outline' : 'chevron-up-outline'}
            size={16}
            color={colors.textSecondary}
          />
        </View>
      </TouchableOpacity>
      {!collapsed && (
        <View style={taskGroupStyles.list}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onComplete={onComplete}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const taskGroupStyles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  countBadge: {
    backgroundColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  countText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  list: {
    gap: spacing.xs,
  },
});

// ─── Inner View ───────────────────────────────────────────────────────────────

function OperativoTabView({
  animalesActivos,
  animalesMuertos,
  todosAnimales,
  pesajes,
  eventosRecientes,
  tasks,
}: OperativoTabProps) {
  const [addTaskVisible, setAddTaskVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskModel | null>(null);

  // KPI: GDP
  const { chartData, gdp } = useMemo(() => {
    const sorted = [...pesajes]
      .sort((a, b) => a.timestamp - b.timestamp)
      .filter((p) => p.valor != null);
    const data = sorted.map((p) => ({ x: p.timestamp, y: p.valor! }));
    const gdpVal = sorted.length >= 2
      ? calcularGDP(sorted.map((p) => ({ timestamp: p.timestamp, valor: p.valor! })))
      : null;
    return { chartData: data, gdp: gdpVal };
  }, [pesajes]);

  // KPI: mortalidad %
  const mortalidadPct = todosAnimales.length > 0
    ? ((animalesMuertos.length / todosAnimales.length) * 100).toFixed(1)
    : '0.0';
  const mortalidadStatus: 'green' | 'yellow' | 'red' = parseFloat(mortalidadPct) < 1
    ? 'green'
    : parseFloat(mortalidadPct) < 3
    ? 'yellow'
    : 'red';

  // Distribución por categoría
  const distribucion = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of animalesActivos) {
      counts.set(a.categoria, (counts.get(a.categoria) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({
        label,
        value,
        color: colors.category[label as keyof typeof colors.category] ?? colors.textSecondary,
      }));
  }, [animalesActivos]);

  // Tareas agrupadas
  const pendientes = tasks.filter((t) => t.status === 'PENDING');
  const enProgreso = tasks.filter((t) => t.status === 'IN_PROGRESS');
  const completadas = tasks.filter((t) => t.status === 'COMPLETED');

  // ─── Task handlers ────────────────────────────────────────────────────────

  const handleComplete = async (task: TaskModel) => {
    const nextStatus: TaskStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    await database.write(async () => {
      await task.update((t) => {
        t.status = nextStatus;
      });
    });
  };

  const handleEdit = (task: TaskModel) => {
    setEditingTask(task);
    setAddTaskVisible(true);
  };

  const handleDelete = (task: TaskModel) => {
    Alert.alert(
      'Eliminar tarea',
      `¿Eliminar "${task.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await database.write(async () => {
              await task.destroyPermanently();
            });
          },
        },
      ]
    );
  };

  const handleSaveTask = async (data: {
    title: string;
    priority: string;
    dueDate?: number;
  }) => {
    if (editingTask) {
      await database.write(async () => {
        await editingTask.update((t) => {
          t.title = data.title;
          t.priority = data.priority as any;
          (t as any).dueDate = data.dueDate ?? null;
        });
      });
    } else {
      await database.write(async () => {
        await database.get<TaskModel>('tasks').create((t) => {
          t.title = data.title;
          t.priority = data.priority as any;
          t.status = 'PENDING';
          (t as any).dueDate = data.dueDate ?? null;
        });
      });
    }

    setAddTaskVisible(false);
    setEditingTask(null);
  };

  const handleCloseModal = () => {
    setAddTaskVisible(false);
    setEditingTask(null);
  };

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Sección 1: KPIs ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen del rodeo</Text>
          <View style={styles.kpiRow}>
            <KPICard
              title="Cabezas"
              value={String(animalesActivos.length)}
              iconName="logo-buffer"
              color={colors.primary}
            />
            <KPICard
              title="Mortalidad"
              value={`${mortalidadPct}%`}
              iconName="warning-outline"
              color={mortalidadStatus === 'green' ? colors.primary : mortalidadStatus === 'yellow' ? colors.warning : colors.error}
            />
            <KPICard
              title="GDP"
              value={gdp != null ? `${gdp.toFixed(1)}` : 'N/D'}
              subtitle={gdp != null ? 'kg/día' : undefined}
              iconName="trending-up-outline"
              color={gdp != null ? (gdp >= 0.8 ? colors.primary : gdp >= 0.5 ? colors.warning : colors.error) : colors.textDisabled}
              trend={gdp != null ? (gdp >= 0.8 ? 'up' : gdp >= 0.5 ? 'flat' : 'down') : undefined}
            />
          </View>
        </View>

        {/* ── Sección 2: Distribución por categoría ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Distribución por categoría</Text>
          <View style={styles.card}>
            <SimplePieChart data={distribucion} />
          </View>
        </View>

        {/* ── Sección 3: Curva GDP ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Curva de peso</Text>
            {gdp != null && (
              <Text style={styles.gdpBadge}>{gdp.toFixed(2)} kg/día</Text>
            )}
          </View>
          <SimpleLineChart data={chartData} />
        </View>

        {/* ── Sección 4: Indicadores semáforo ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Indicadores</Text>
          <View style={styles.semaforoRow}>
            <SemaforoCard
              title="GDP"
              value={gdp != null ? `${gdp.toFixed(1)}kg/d` : 'N/D'}
              status={gdp != null ? (gdp >= 0.8 ? 'green' : gdp >= 0.5 ? 'yellow' : 'red') : 'gray'}
            />
            <SemaforoCard
              title="Mortalidad"
              value={`${mortalidadPct}%`}
              status={mortalidadStatus}
            />
            <SemaforoCard
              title="Activos"
              value={String(animalesActivos.length)}
              status={animalesActivos.length > 0 ? 'green' : 'gray'}
            />
          </View>
        </View>

        {/* ── Sección 5: Historial reciente ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Historial reciente</Text>
          {eventosRecientes.length === 0 ? (
            <EmptyState icon="📋" title="Sin eventos" subtitle="Los eventos aparecerán aquí" />
          ) : (
            groupEventosByDate(eventosRecientes).map((group) => (
              <View key={group.label}>
                <View style={styles.dateGroupHeader}>
                  <Text style={styles.dateGroupLabel}>{group.label}</Text>
                  <View style={styles.dateGroupLine} />
                </View>
                {group.data.map((e) => (
                  <EventoRow key={e.id} evento={e} />
                ))}
              </View>
            ))
          )}
        </View>

        {/* ── Sección 6: Tareas ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Tareas operativas</Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => {
                setEditingTask(null);
                setAddTaskVisible(true);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {tasks.length === 0 ? (
            <EmptyState
              icon="✅"
              title="Sin tareas"
              subtitle="Agregá tareas con el botón +"
            />
          ) : (
            <>
              <TaskGroup
                title="Pendientes"
                tasks={pendientes}
                onComplete={handleComplete}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
              <TaskGroup
                title="En progreso"
                tasks={enProgreso}
                onComplete={handleComplete}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
              <TaskGroup
                title="Completadas"
                tasks={completadas}
                onComplete={handleComplete}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </>
          )}
        </View>
      </ScrollView>

      <AddTaskModal
        visible={addTaskVisible}
        editTask={editingTask}
        onClose={handleCloseModal}
        onSave={handleSaveTask}
      />
    </>
  );
}

function EventoRow({ evento }: { evento: EventoModel }) {
  const meta = TIPO_META[evento.tipo as EventoTipoType] ?? TIPO_META.OTRO;
  return (
    <View style={styles.eventoRow}>
      <Text style={styles.eventoIcon}>{meta.icon}</Text>
      <View style={styles.eventoInfo}>
        <Text style={[styles.eventoTipo, { color: meta.color }]}>{evento.tipo}</Text>
        <Text style={styles.eventoAnimal}>Animal: {evento.animalId.slice(0, 8)}…</Text>
      </View>
      <Text style={styles.eventoTime}>
        {format(new Date(evento.timestamp), 'dd/MM HH:mm', { locale: es })}
      </Text>
    </View>
  );
}

// ─── withObservables connector ────────────────────────────────────────────────

const THIRTY_DAYS_AGO = Date.now() - 30 * 24 * 60 * 60 * 1000;

const OperativoTabConnected = withObservables(
  ['loteId'],
  ({ loteId }: OperativoTabOuterProps) => {
    const loteFilter = loteId ? [Q.where('lote_id', loteId)] : [];
    return {
      animalesActivos: database
        .get<AnimalModel>('animals')
        .query(Q.where('estado', 'ACTIVO'), ...loteFilter)
        .observe(),
      animalesMuertos: database
        .get<AnimalModel>('animals')
        .query(
          Q.where('estado', 'MUERTO'),
          Q.where('updated_at', Q.gte(THIRTY_DAYS_AGO)),
          ...loteFilter
        )
        .observe(),
      todosAnimales: database
        .get<AnimalModel>('animals')
        .query(...loteFilter)
        .observe(),
      pesajes: database
        .get<EventoModel>('eventos')
        .query(
          Q.where('tipo', EVENTO_TIPO.PESAJE),
          ...loteFilter,
          Q.sortBy('timestamp', Q.asc),
          Q.take(30)
        )
        .observe(),
      eventosRecientes: database
        .get<EventoModel>('eventos')
        .query(
          ...loteFilter,
          Q.sortBy('timestamp', Q.desc),
          Q.take(20)
        )
        .observe(),
      tasks: database
        .get<TaskModel>('tasks')
        .query(Q.sortBy('created_at', Q.desc))
        .observe(),
    };
  }
)(OperativoTabView);

// ─── Export ───────────────────────────────────────────────────────────────────

export function OperativoTab({ loteId }: OperativoTabOuterProps) {
  return (
    <ObservableErrorBoundary fallbackTitle="Error al cargar tab operativo">
      <OperativoTabConnected loteId={loteId} />
    </ObservableErrorBoundary>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xxl },
  section: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gdpBadge: {
    color: colors.primary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    fontVariant: ['tabular-nums'],
  },
  semaforoRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  addBtn: {
    padding: 4,
  },
  eventoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  eventoIcon: { fontSize: 20 },
  eventoInfo: { flex: 1 },
  eventoTipo: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },
  eventoAnimal: { color: colors.textSecondary, fontSize: typography.sizes.xs, marginTop: 2 },
  eventoTime: { color: colors.textDisabled, fontSize: typography.sizes.xs, fontVariant: ['tabular-nums'] },
  dateGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  dateGroupLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  dateGroupLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
});
