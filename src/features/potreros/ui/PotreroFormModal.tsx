import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@theme/index';
import { database } from '@data/database/database';
import PotreroModel from '@data/models/PotreroModel';

interface Props {
  visible: boolean;
  onClose: () => void;
  potrero?: PotreroModel | null;
}

export function PotreroFormModal({ visible, onClose, potrero }: Props) {
  const [nombre, setNombre] = useState('');
  const [hectareas, setHectareas] = useState('');
  const [recursoForrajero, setRecursoForrajero] = useState('');

  useEffect(() => {
    if (potrero) {
      setNombre(potrero.nombre);
      setHectareas(potrero.hectareas?.toString() || '');
      setRecursoForrajero(potrero.recursoForrajero || '');
    } else {
      setNombre('');
      setHectareas('');
      setRecursoForrajero('');
    }
  }, [potrero, visible]);

  const handleSave = async () => {
    if (!nombre.trim()) return Alert.alert('Error', 'El nombre es obligatorio');
    
    try {
      await database.write(async () => {
        if (potrero) {
          await potrero.update((p) => {
            p.nombre = nombre.trim();
            p.hectareas = parseFloat(hectareas) || 0;
            p.recursoForrajero = recursoForrajero.trim();
          });
        } else {
          await database.get<PotreroModel>('potreros').create((p) => {
            p.nombre = nombre.trim();
            p.hectareas = parseFloat(hectareas) || 0;
            p.recursoForrajero = recursoForrajero.trim();
            p.establecimientoId = ''; // default empty
            p.geoJson = '';
          });
        }
      });
      onClose();
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar el potrero');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContentLarge}>
          <View style={styles.modalHandle} />
          <View style={styles.headerRow}>
            <Text style={styles.modalTitle}>{potrero ? 'Editar Potrero' : 'Nuevo Potrero'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.inputLabel}>NOMBRE</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Ej. Potrero 1" 
            placeholderTextColor={colors.textSecondary} 
            value={nombre} 
            onChangeText={setNombre} 
          />

          <Text style={styles.inputLabel}>SUPERFICIE (HA)</Text>
          <TextInput 
            style={styles.input} 
            placeholder="0.0" 
            placeholderTextColor={colors.textSecondary} 
            value={hectareas} 
            onChangeText={setHectareas} 
            keyboardType="numeric"
          />

          <Text style={styles.inputLabel}>RECURSO FORRAJERO</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Ej. Gatton Panic" 
            placeholderTextColor={colors.textSecondary} 
            value={recursoForrajero} 
            onChangeText={setRecursoForrajero} 
          />

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
               <Text style={{ color: colors.textPrimary, fontWeight: 'bold' }}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={handleSave}>
              <Text style={{ color: colors.background, fontWeight: 'bold' }}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
  modalContentLarge: { backgroundColor: colors.surfaceElevated, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: spacing.xl, paddingBottom: spacing.xxl },
  modalHandle: { width: 40, height: 5, backgroundColor: colors.border, borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: 'bold' },
  closeBtn: { padding: 4 },
  input: { backgroundColor: colors.surface, borderRadius: 16, padding: 18, color: colors.textPrimary, fontSize: 16, marginBottom: 20, borderWidth: 1, borderColor: colors.border },
  inputLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: 'bold', marginBottom: 10 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  cancelBtn: { flex: 0.5, height: 56, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  actionBtn: { flex: 1, height: 56, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
