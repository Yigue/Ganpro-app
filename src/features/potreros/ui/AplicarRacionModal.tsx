import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@theme/index';
import { database } from '@data/database/database';
import { NutricionRepository } from '@data/repositories/NutricionRepository';
import RacionModel from '@data/models/RacionModel';

const nutRepo = new NutricionRepository(database);

interface Props {
  visible: boolean;
  onClose: () => void;
  potreroId: string;
  raciones: RacionModel[];
}

export function AplicarRacionModal({ visible, onClose, potreroId, raciones }: Props) {
  const [selectedRacionId, setSelectedRacionId] = useState('');
  const [kilos, setKilos] = useState('');

  const handleSave = async () => {
    if (!selectedRacionId) return Alert.alert('Error', 'Debe seleccionar una ración');
    const k = parseFloat(kilos);
    if (isNaN(k) || k <= 0) return Alert.alert('Error', 'Ingrese una cantidad válida de kilos');

    try {
      await nutRepo.applyRacionToPotrero(selectedRacionId, potreroId, k);
      Alert.alert('Éxito', 'Suplementación registrada');
      onClose();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'No se pudo registrar la suplementación');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHandle} />
          <View style={styles.headerRow}>
            <Text style={styles.modalTitle}>Suplementar Potrero</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>SELECCIONAR RACIÓN</Text>
          <View style={{ maxHeight: 250 }}>
            {raciones.map(r => (
              <TouchableOpacity
                key={r.id}
                style={[styles.racionCard, selectedRacionId === r.id && styles.racionCardActive]}
                onPress={() => setSelectedRacionId(r.id)}
              >
                <Ionicons name="nutrition" size={20} color={selectedRacionId === r.id ? 'white' : colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.racionName, selectedRacionId === r.id && { color: 'white' }]}>{r.nombre}</Text>
                  <Text style={[styles.racionDesc, selectedRacionId === r.id && { color: 'rgba(255,255,255,0.7)' }]}>{r.descripcion}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.inputLabel, { marginTop: 20 }]}>KILOS TOTALES A ENTREGAR</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej. 500"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
            value={kilos}
            onChangeText={setKilos}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={{ color: colors.textPrimary, fontWeight: 'bold' }}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={handleSave}>
              <Text style={{ color: colors.background, fontWeight: 'bold' }}>Confirmar Entrega</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surfaceElevated, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: spacing.xl, paddingBottom: spacing.xxl },
  modalHandle: { width: 40, height: 5, backgroundColor: colors.border, borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: 'bold' },
  inputLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: 'bold', marginBottom: 10, letterSpacing: 1 },
  racionCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15, borderRadius: 16, backgroundColor: colors.surface, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  racionCardActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  racionName: { color: colors.textPrimary, fontWeight: 'bold', fontSize: 14 },
  racionDesc: { color: colors.textSecondary, fontSize: 11 },
  input: { backgroundColor: colors.surface, borderRadius: 16, padding: 18, color: colors.textPrimary, fontSize: 16, marginBottom: 20, borderWidth: 1, borderColor: colors.border },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  cancelBtn: { flex: 0.5, height: 56, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  actionBtn: { flex: 1, height: 56, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
