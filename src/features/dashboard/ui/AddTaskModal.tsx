import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@theme/index';

interface AddTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: { title: string; priority: string; dueDate?: number }) => void;
}

export function AddTaskModal({ visible, onClose, onSave }: AddTaskModalProps) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('MEDIUM');

  const handleSave = () => {
    if (!title.trim()) return Alert.alert('Error', 'El título es obligatorio');
    onSave({ title: title.trim(), priority, dueDate: Date.now() });
    setTitle('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Nueva Tarea</Text>
          
          <Text style={styles.label}>TÍTULO DE LA TAREA</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Ej: Arreglar alambrado potrero 4" 
            placeholderTextColor={colors.textDisabled}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>PRIORIDAD</Text>
          <View style={styles.priorityRow}>
            {['LOW', 'MEDIUM', 'HIGH'].map(p => (
              <TouchableOpacity 
                key={p} 
                style={[styles.priorityBtn, priority === p && styles.priorityBtnActive]} 
                onPress={() => setPriority(p)}
              >
                <Text style={[styles.priorityText, priority === p && styles.priorityTextActive]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={{ color: colors.textPrimary }}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={{ color: colors.background, fontWeight: 'bold' }}>Crear Tarea</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surfaceElevated, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: spacing.xl, paddingBottom: 40 },
  modalHandle: { width: 40, height: 5, backgroundColor: colors.border, borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  label: { color: colors.textSecondary, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 10, marginTop: 10 },
  input: { backgroundColor: colors.surface, borderRadius: 12, padding: 15, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border },
  priorityRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  priorityBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  priorityBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  priorityText: { color: colors.textSecondary, fontSize: 12, fontWeight: 'bold' },
  priorityTextActive: { color: colors.background },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 0.5, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  saveBtn: { flex: 1, height: 56, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
