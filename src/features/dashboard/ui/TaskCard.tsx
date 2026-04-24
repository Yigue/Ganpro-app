import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@theme/index';
import type TaskModel from '@data/models/TaskModel';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TaskCardProps {
  task: TaskModel;
  onToggleStatus: (task: TaskModel) => void;
  onDelete: (task: TaskModel) => void;
}

export function TaskCard({ task, onToggleStatus, onDelete }: TaskCardProps) {
  const isCompleted = task.status === 'COMPLETED';
  const priorityColor = 
    task.priority === 'HIGH' ? colors.error : 
    task.priority === 'MEDIUM' ? colors.warning : 
    colors.primary;

  return (
    <View style={styles.card}>
      <TouchableOpacity 
        style={styles.checkBtn} 
        onPress={() => onToggleStatus(task)}
      >
        <Ionicons 
          name={isCompleted ? "checkbox" : "square-outline"} 
          size={24} 
          color={isCompleted ? colors.primary : colors.textDisabled} 
        />
      </TouchableOpacity>

      <View style={{ flex: 1 }}>
        <Text style={[styles.title, isCompleted && styles.textStrikethrough]}>
          {task.title}
        </Text>
        <View style={styles.metaRow}>
          <View style={[styles.priorityBadge, { backgroundColor: priorityColor + '20' }]}>
            <Text style={[styles.priorityText, { color: priorityColor }]}>{task.priority}</Text>
          </View>
          {task.dueDate && (
            <Text style={styles.dateText}>
              Vence: {format(new Date(task.dueDate), 'dd MMM', { locale: es })}
            </Text>
          )}
        </View>
      </View>

      <TouchableOpacity onPress={() => onDelete(task)}>
        <Ionicons name="trash-outline" size={20} color={colors.textDisabled} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 16,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  checkBtn: { padding: 4 },
  title: { color: colors.textPrimary, fontSize: 14, fontWeight: 'bold' },
  textStrikethrough: { textDecorationLine: 'line-through', color: colors.textDisabled },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  priorityBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  priorityText: { fontSize: 9, fontWeight: 'bold' },
  dateText: { color: colors.textSecondary, fontSize: 10 },
});
