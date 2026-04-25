import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@theme/index';
import { database } from '@data/database/database';
import { NutricionRepository } from '@data/repositories/NutricionRepository';
import PotreroModel from '@data/models/PotreroModel';
import { format } from 'date-fns';

const nutRepo = new NutricionRepository(database);

interface Props {
  visible: boolean;
  onClose: () => void;
  potreros: PotreroModel[];
}

export function CCAuditModal({ visible, onClose, potreros }: Props) {
  const [score, setScore] = useState<number>(3);
  const [selectedPotreroId, setSelectedPotreroId] = useState<string>('');
  const [evaluador, setEvaluador] = useState('');
  const [notas, setNotas] = useState('');

  // Reset form when visible changes
  React.useEffect(() => {
    if (visible) {
      setScore(3);
      setSelectedPotreroId(potreros.length > 0 ? potreros[0].id : '');
      setEvaluador('');
      setNotas('');
    }
  }, [visible, potreros]);

  const handleSave = async () => {
    if (!selectedPotreroId) return Alert.alert('Error', 'Debe seleccionar un potrero / lote.');
    
    try {
      await nutRepo.createCC({
        loteId: selectedPotreroId,
        fecha: Date.now(),
        score,
        evaluador: evaluador.trim(),
        notas: notas.trim()
      });
      onClose();
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar la auditoría de CC');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContentLarge}>
          <View style={styles.modalHandle} />
          <View style={styles.headerRow}>
            <Text style={styles.modalTitle}>Nueva Auditoría C.C.</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.inputLabel}>FECHA</Text>
            <View style={styles.dateBox}>
              <Ionicons name="calendar-outline" size={20} color={colors.primary} />
              <Text style={styles.dateText}>{format(new Date(), 'dd/MM/yyyy')}</Text>
            </View>

            <Text style={styles.inputLabel}>POTRERO / LOTE AFECTADO</Text>
            <View style={styles.typeRow}>
              {potreros.length === 0 ? (
                <Text style={{ color: colors.textSecondary }}>No hay potreros disponibles</Text>
              ) : (
                potreros.map(p => (
                  <TouchableOpacity 
                    key={p.id} 
                    style={[styles.typeBadge, selectedPotreroId === p.id && styles.typeBadgeActive]}
                    onPress={() => setSelectedPotreroId(p.id)}
                  >
                    <Text style={[styles.typeText, selectedPotreroId === p.id && styles.typeTextActive]}>
                      {p.nombre}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>

            <Text style={styles.inputLabel}>SCORE DE CONDICIÓN CORPORAL (1-5)</Text>
            <View style={styles.scoreContainer}>
              {[1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map(val => (
                <TouchableOpacity
                  key={val}
                  style={[styles.scoreBtn, score === val && styles.scoreBtnActive]}
                  onPress={() => setScore(val)}
                >
                  <Text style={[styles.scoreText, score === val && styles.scoreTextActive]}>{val}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.scoreHelper}>
              {score < 2.5 ? 'Baja condición (Flaca)' : score > 3.5 ? 'Alta condición (Gorda)' : 'Condición óptima (Ideal)'}
            </Text>

            <Text style={styles.inputLabel}>EVALUADOR (Opcional)</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Ej. Juan Pérez" 
              placeholderTextColor={colors.textSecondary} 
              value={evaluador} 
              onChangeText={setEvaluador} 
            />

            <Text style={styles.inputLabel}>NOTAS (Opcional)</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Observaciones de la auditoría..." 
              placeholderTextColor={colors.textSecondary} 
              value={notas} 
              onChangeText={setNotas} 
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                 <Text style={{ color: colors.textPrimary, fontWeight: 'bold' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={handleSave}>
                <Text style={{ color: colors.background, fontWeight: 'bold' }}>Guardar Auditoría</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
  modalContentLarge: { backgroundColor: colors.surfaceElevated, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: spacing.xl, paddingBottom: spacing.xxl, maxHeight: '90%' },
  modalHandle: { width: 40, height: 5, backgroundColor: colors.border, borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: 'bold' },
  closeBtn: { padding: 4 },
  dateBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 16, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: colors.border, gap: 10 },
  dateText: { color: colors.textPrimary, fontSize: 16, fontWeight: 'bold' },
  input: { backgroundColor: colors.surface, borderRadius: 16, padding: 18, color: colors.textPrimary, fontSize: 16, marginBottom: 20, borderWidth: 1, borderColor: colors.border },
  inputLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: 'bold', marginBottom: 10 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  typeBadge: { backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  typeBadgeActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeText: { color: colors.textPrimary, fontSize: 12, fontWeight: 'bold' },
  typeTextActive: { color: colors.background },
  scoreContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  scoreBtn: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  scoreBtnActive: { backgroundColor: colors.warning, borderColor: colors.warning },
  scoreText: { color: colors.textPrimary, fontSize: 14, fontWeight: 'bold' },
  scoreTextActive: { color: colors.background },
  scoreHelper: { color: colors.textSecondary, fontSize: 12, fontStyle: 'italic', marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  cancelBtn: { flex: 0.5, height: 56, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  actionBtn: { flex: 1, height: 56, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
