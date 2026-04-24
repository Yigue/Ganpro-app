import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@theme/index';
import type { TaskModel, TaskPriority, TaskStatus } from '@data/models/TaskModel';

interface AddTaskModalProps {
  visible: boolean;
  editTask?: TaskModel | null;
  onClose: () => void;
  onSave: (data: {
    title: string;
    description: string;
    priority: TaskPriority;
    dueDateText: string;
    status: TaskStatus;
  }) => void;
}

const PRIORITIES: { key: TaskPriority; label: string; color: string }[] = [
  { key: 'HIGH', label: 'Alta', color: colors.error },
  { key: 'MEDIUM', label: 'Media', color: colors.warning },
  { key: 'LOW', label: 'Baja', color: colors.info },
];

const STATUSES: { key: TaskStatus; label: string }[] = [
  { key: 'PENDING', label: 'Pendiente' },
  { key: 'IN_PROGRESS', label: 'En progreso' },
  { key: 'COMPLETED', label: 'Completada' },
];

/**
 * AddTaskModal — modal para crear o editar una tarea operativa.
 * Fecha como TextInput libre (DD/MM/AAAA) — ver TECHNICAL_DEBT.md para picker nativo.
 */
export function AddTaskModal({ visible, editTask, onClose, onSave }: AddTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [status, setStatus] = useState<TaskStatus>('PENDING');
  const [dueDateText, setDueDateText] = useState('');

  useEffect(() => {
    if (editTask) {
      setTitle(editTask.title);
      setDescription(editTask.description ?? '');
      setPriority(editTask.priority);
      setStatus(editTask.status);
      if (editTask.dueDate) {
        const d = new Date(editTask.dueDate);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        setDueDateText(`${dd}/${mm}/${yyyy}`);
      } else {
        setDueDateText('');
      }
    } else {
      setTitle('');
      setDescription('');
      setPriority('MEDIUM');
      setStatus('PENDING');
      setDueDateText('');
    }
  }, [editTask, visible]);

  const handleSave = () => {
    if (title.trim().length === 0) {
      Alert.alert('Error', 'El título es obligatorio');
      return;
    }
    onSave({ title: title.trim(), description: description.trim(), priority, dueDateText, status });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {editTask ? 'Editar tarea' : 'Nueva tarea'}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Título */}
            <Text style={styles.fieldLabel}>Título *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Ej: Vacunación lote 3"
              placeholderTextColor={colors.textDisabled}
              maxLength={120}
            />

            {/* Descripción */}
            <Text style={styles.fieldLabel}>Descripción</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={description}
              onChangeText={setDescription}
              placeholder="Detalles opcionales..."
              placeholderTextColor={colors.textDisabled}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {/* Prioridad */}
            <Text style={styles.fieldLabel}>Prioridad</Text>
            <View style={styles.chipRow}>
              {PRIORITIES.map((p) => (
                <TouchableOpacity
                  key={p.key}
                  style={[
                    styles.chip,
                    { borderColor: p.color },
                    priority === p.key && { backgroundColor: `${p.color}20` },
                  ]}
                  onPress={() => setPriority(p.key)}
                >
                  <Text style={[styles.chipText, { color: priority === p.key ? p.color : colors.textSecondary }]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Estado */}
            {editTask != null && (
              <>
                <Text style={styles.fieldLabel}>Estado</Text>
                <View style={styles.chipRow}>
                  {STATUSES.map((s) => (
                    <TouchableOpacity
                      key={s.key}
                      style={[
                        styles.chip,
                        status === s.key && styles.chipActive,
                      ]}
                      onPress={() => setStatus(s.key)}
                    >
                      <Text style={[styles.chipText, status === s.key && styles.chipTextActive]}>
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Fecha límite */}
            <Text style={styles.fieldLabel}>Fecha límite (DD/MM/AAAA)</Text>
            <TextInput
              style={styles.input}
              value={dueDateText}
              onChangeText={setDueDateText}
              placeholder="ej: 30/04/2026"
              placeholderTextColor={colors.textDisabled}
              keyboardType="numeric"
              maxLength={10}
            />
          </ScrollView>

          {/* Acciones */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveText}>{editTask ? 'Guardar' : 'Crear'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
  },
  inputMultiline: {
    height: 80,
    paddingTop: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryAlpha,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
  },
  chipTextActive: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  saveText: {
    color: colors.textOnPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
});
