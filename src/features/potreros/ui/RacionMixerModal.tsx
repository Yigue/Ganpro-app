import React, { useState, useMemo } from 'react';
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
import { database } from '@data/database/database';
import { NutricionRepository } from '@data/repositories/NutricionRepository';
import SuplementoModel from '@data/models/SuplementoModel';

const nutRepo = new NutricionRepository(database);

const SUP_ICONS: Record<string, any> = {
  MAIZ: 'leaf-outline',
  SILO: 'bus-outline',
  PELLETS: 'apps-outline',
  HENO: 'reorder-four-outline',
  MINERALES: 'color-filter-outline',
};

interface Props {
  visible: boolean;
  onClose: () => void;
  suplementos: SuplementoModel[];
}

export function RacionMixerModal({ visible, onClose, suplementos }: Props) {
  const [nombre, setNombre] = useState('');
  const [mix, setMix] = useState<Record<string, number>>({});

  const totalPct = useMemo(() => Object.values(mix).reduce((a, b) => a + b, 0), [mix]);
  const costoFinal = useMemo(() => {
    let total = 0;
    Object.entries(mix).forEach(([id, pct]) => {
      const s = suplementos.find(x => x.id === id);
      if (s) total += ((s.precioPorTonelada || 0) / 1000) * (pct / 100);
    });
    return total;
  }, [mix, suplementos]);

  const handleSave = async () => {
    if (totalPct !== 100) return Alert.alert('Error', 'La mezcla debe sumar 100%');
    try {
      await nutRepo.createRacionConIngredientes({
        nombre,
        descripcion: `Costo: $${costoFinal.toFixed(2)}/kg`,
        costoEstimadoKg: costoFinal,
        ingredientes: Object.entries(mix).map(([id, pct]) => ({
          suplementoId: id,
          porcentaje: pct,
          kgPorTonelada: pct * 10
        }))
      });
      Alert.alert('Éxito', 'Ración formulada correctamente');
      onClose();
    } catch(e: any) { 
      console.error('[RacionMixer] Error saving:', e);
      Alert.alert('Error', `No se pudo guardar: ${e.message || 'Error desconocido'}`); 
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContentLarge}>
          <View style={styles.modalHandle} />
          <View style={styles.headerRow}>
            <Text style={styles.modalTitle}>Mezclador de Raciones</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <TextInput 
            style={styles.input} 
            placeholder="Nombre de la mezcla..." 
            placeholderTextColor={colors.textSecondary} 
            value={nombre} 
            onChangeText={setNombre} 
          />
          
          <Text style={styles.inputLabel}>COMPOSICIÓN (DEBE SUMAR 100%)</Text>
          <View style={{ maxHeight: 350 }}>
            {suplementos.map((s) => (
              <View key={s.id} style={styles.mixRow}>
                <Ionicons name={SUP_ICONS[s.tipo] || 'cube-outline'} size={20} color={colors.primary} />
                <Text style={styles.mixName}>{s.nombre}</Text>
                <TextInput 
                  style={styles.mixInput} 
                  keyboardType="numeric" 
                  placeholder="0" 
                  placeholderTextColor={colors.textDisabled}
                  onChangeText={(v) => setMix(prev => ({ ...prev, [s.id]: parseFloat(v) || 0 }))}
                />
                <Text style={styles.mixUnit}>%</Text>
              </View>
            ))}
          </View>

          <View style={styles.calcResultsBox}>
            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>Total Mezcla:</Text>
              <Text style={[styles.calcValue, { color: totalPct === 100 ? colors.primary : colors.error }]}>{totalPct}%</Text>
            </View>
            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>Costo Estimado:</Text>
              <Text style={styles.calcValue}>${costoFinal.toFixed(2)} / kg</Text>
            </View>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
               <Text style={{ color: colors.textPrimary, fontWeight: 'bold' }}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={handleSave}>
              <Text style={{ color: colors.background, fontWeight: 'bold' }}>Guardar Ración</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
  modalContentLarge: { backgroundColor: colors.surfaceElevated, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: spacing.xl, paddingBottom: spacing.xxl, height: '92%' },
  modalHandle: { width: 40, height: 5, backgroundColor: colors.border, borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: 'bold' },
  closeBtn: { padding: 4 },
  input: { backgroundColor: colors.surface, borderRadius: 16, padding: 18, color: colors.textPrimary, fontSize: 16, marginBottom: 20, borderWidth: 1, borderColor: colors.border },
  inputLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: 'bold', marginBottom: 10 },
  mixRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 15, borderRadius: 16, marginBottom: 8, gap: 10 },
  mixName: { flex: 1, color: colors.textPrimary, fontWeight: 'bold' },
  mixInput: { backgroundColor: colors.background, width: 60, padding: 10, borderRadius: 10, color: colors.primary, textAlign: 'center', fontWeight: 'bold' },
  mixUnit: { color: colors.textSecondary, fontWeight: 'bold' },
  calcResultsBox: { backgroundColor: colors.surface, padding: 20, borderRadius: 20, marginTop: 10 },
  calcRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  calcLabel: { color: colors.textSecondary },
  calcValue: { color: colors.textPrimary, fontWeight: 'bold' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 0.5, height: 56, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  actionBtn: { flex: 1, height: 56, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
