import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { colors, spacing, typography } from '@theme/index';
import type { TaskModel, TaskPriority, TaskStatus } from '@data/models/TaskModel';

interface TaskCardProps {
  task: TaskModel;
  onComplete: (task: TaskModel) => void;
  onEdit: (task: TaskModel) => void;
  onDelete: (task: TaskModel) => void;
}

const PRIORITY_META: Record<TaskPriority, { label: string; color: string }> = {
  HIGH: { label: 'Alta', color: colors.error },
  MEDIUM: { label: 'Media', color: colors.warning },
  LOW: { label: 'Baja', color: colors.info },
};

const STATUS_META: Record<TaskStatus, { icon: React.ComponentProps<typeof Ionicons>['name']; color: string }> = {
  PENDING: { icon: 'ellipse-outline', color: colors.textSecondary },
  IN_PROGRESS: { icon: 'time-outline', color: colors.warning },
  COMPLETED: { icon: 'checkmark-circle', color: colors.primary },
};

/**
 * TaskCard — ítem de tarea con acciones rápidas (completar, editar, eliminar).
 */
export function TaskCard({ task, onComplete, onEdit, onDelete }: TaskCardProps) {
  const priority = PRIORITY_META[task.priority] ?? PRIORITY_META.MEDIUM;
  const statusMeta = STATUS_META[task.status] ?? STATUS_META.PENDING;
  const isCompleted = task.status === 'COMPLETED';

  return (
    <View style={[styles.card, isCompleted && styles.cardCompleted]}>
      {/* Botón de check */}
      <TouchableOpacity
        style={styles.statusBtn}
        onPress={() => onComplete(task)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name={statusMeta.icon} size={22} color={statusMeta.color} />
      </TouchableOpacity>

      {/* Contenido */}
      <View style={styles.content}>
        <Text style={[styles.title, isCompleted && styles.titleCompleted]}>
          {task.title}
        </Text>
        {task.description != null && task.description.length > 0 && (
          <Text style={styles.description} numberOfLines={2}>
            {task.description}
          </Text>
        )}
        <View style={styles.meta}>
          {/* Badge de prioridad */}
          <View style={[styles.priorityBadge, { borderColor: priority.color }]}>
            <Text style={[styles.priorityText, { color: priority.color }]}>
              {priority.label}
            </Text>
          </View>
          {/* Fecha límite */}
          {task.dueDate != null && (
            <View style={styles.dueDateRow}>
              <Ionicons name="calendar-outline" size={11} color={colors.textDisabled} />
              <Text style={styles.dueDate}>
                {format(new Date(task.dueDate), "d MMM", { locale: es })}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Acciones */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => onEdit(task)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => onDelete(task)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={16} color={colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: spacing.sm,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  cardCompleted: {
    opacity: 0.6,
  },
  statusBtn: {
    marginTop: 2,
    padding: 2,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  description: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 3,
  },
  priorityBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  dueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  dueDate: {
    color: colors.textDisabled,
    fontSize: typography.sizes.xs,
    fontVariant: ['tabular-nums'],
  },
  actions: {
    flexDirection: 'column',
    gap: spacing.xs,
    alignItems: 'center',
  },
  actionBtn: {
    padding: 4,
  },
});
