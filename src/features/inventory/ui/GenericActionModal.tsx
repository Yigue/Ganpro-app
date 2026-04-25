import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@theme/index';

interface Props {
  visible: boolean;
  onClose: () => void;
  count: number;
  categoria: string;
  potreroNombre: string;
}

export function GenericActionModal({ visible, onClose, count, categoria, potreroNombre }: Props) {
  const [action, setAction] = useState<'MOVER' | 'SANIDAD' | null>(null);
  const [cantidadInput, setCantidadInput] = useState(count.toString());

  const handleConfirm = () => {
    const qty = parseInt(cantidadInput, 10);
    if (isNaN(qty) || qty <= 0 || qty > count) {
      Alert.alert('Error', `La cantidad debe ser entre 1 y ${count}`);
      return;
    }

    // Aquí en un futuro se conecta con los servicios reales (AnimalMovementService, etc.)
    Alert.alert(
      'Acción en Desarrollo',
      `Se aplicará ${action} a ${qty} ${categoria}(s) del potrero ${potreroNombre}.`
    );
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Tropa Genérica</Text>
              <Text style={styles.subtitle}>{count} {categoria}s en {potreroNombre}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>¿QUÉ ACCIÓN DESEAS REALIZAR?</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity 
              style={[styles.actionCard, action === 'MOVER' && styles.actionCardActive]}
              onPress={() => setAction('MOVER')}
            >
              <Ionicons name="swap-horizontal" size={28} color={action === 'MOVER' ? colors.primary : colors.textSecondary} />
              <Text style={[styles.actionText, action === 'MOVER' && styles.actionTextActive]}>Mover</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionCard, action === 'SANIDAD' && styles.actionCardActive]}
              onPress={() => setAction('SANIDAD')}
            >
              <Ionicons name="medkit" size={28} color={action === 'SANIDAD' ? colors.warning : colors.textSecondary} />
              <Text style={[styles.actionText, action === 'SANIDAD' && { color: colors.warning }]}>Sanidad</Text>
            </TouchableOpacity>
          </View>

          {action && (
            <View style={styles.qtySection}>
              <Text style={styles.label}>¿A CUÁNTOS ANIMALES?</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={cantidadInput}
                onChangeText={setCantidadInput}
                selectTextOnFocus
              />
              <Text style={styles.hint}>Máximo disponible: {count}</Text>

              <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
                <Text style={styles.confirmText}>Continuar</Text>
                <Ionicons name="arrow-forward" size={20} color="white" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: spacing.lg },
  content: { backgroundColor: colors.surfaceElevated, borderRadius: 24, padding: spacing.xl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg },
  title: { color: colors.textPrimary, fontSize: 20, fontWeight: 'bold' },
  subtitle: { color: colors.primary, fontSize: 14, fontWeight: 'bold', marginTop: 4 },
  closeBtn: { padding: 4, backgroundColor: colors.background, borderRadius: 12 },
  label: { color: colors.textSecondary, fontSize: 11, fontWeight: 'bold', letterSpacing: 1, marginBottom: 12 },
  actionGrid: { flexDirection: 'row', gap: 12, marginBottom: spacing.xl },
  actionCard: { flex: 1, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: spacing.md, alignItems: 'center', gap: 8 },
  actionCardActive: { borderColor: colors.primary, backgroundColor: 'rgba(0,214,143,0.05)' },
  actionText: { color: colors.textSecondary, fontSize: 13, fontWeight: 'bold' },
  actionTextActive: { color: colors.primary },
  qtySection: { backgroundColor: colors.background, padding: spacing.md, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, fontSize: 24, fontWeight: 'bold', color: colors.textPrimary, textAlign: 'center', paddingVertical: 12 },
  hint: { color: colors.textSecondary, fontSize: 11, textAlign: 'center', marginTop: 8, marginBottom: 16 },
  confirmBtn: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  confirmText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});