import React, { useState, useEffect } from 'react';
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
import SuplementoModel from '@data/models/SuplementoModel';

interface Props {
  visible: boolean;
  onClose: () => void;
  suplemento?: SuplementoModel | null;
}

export function SuplementoFormModal({ visible, onClose, suplemento }: Props) {
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('OTRO'); // MAIZ | SILO | HENO | PELLET | UREA | OTRO
  const [materiaSecaPct, setMateriaSecaPct] = useState('');
  const [precioPorTonelada, setPrecioPorTonelada] = useState('');
  const [proveedor, setProveedor] = useState('');

  useEffect(() => {
    if (suplemento) {
      setNombre(suplemento.nombre);
      setTipo(suplemento.tipo || 'OTRO');
      setMateriaSecaPct(suplemento.materiaSecaPct?.toString() || '');
      setPrecioPorTonelada(suplemento.precioPorTonelada?.toString() || '');
      setProveedor(suplemento.proveedor || '');
    } else {
      setNombre('');
      setTipo('OTRO');
      setMateriaSecaPct('');
      setPrecioPorTonelada('');
      setProveedor('');
    }
  }, [suplemento, visible]);

  const handleSave = async () => {
    if (!nombre.trim()) return Alert.alert('Error', 'El nombre es obligatorio');
    
    try {
      await database.write(async () => {
        if (suplemento) {
          await suplemento.update((s) => {
            s.nombre = nombre.trim();
            s.tipo = tipo;
            s.materiaSecaPct = parseFloat(materiaSecaPct) || 0;
            s.precioPorTonelada = parseFloat(precioPorTonelada) || 0;
            s.proveedor = proveedor.trim();
          });
        } else {
          await database.get<SuplementoModel>('suplementos').create((s) => {
            s.nombre = nombre.trim();
            s.tipo = tipo;
            s.materiaSecaPct = parseFloat(materiaSecaPct) || 0;
            s.precioPorTonelada = parseFloat(precioPorTonelada) || 0;
            s.proveedor = proveedor.trim();
          });
        }
      });
      onClose();
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar el suplemento');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContentLarge}>
          <View style={styles.modalHandle} />
          <View style={styles.headerRow}>
            <Text style={styles.modalTitle}>{suplemento ? 'Editar Componente' : 'Nuevo Componente'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.inputLabel}>NOMBRE</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Ej. Maíz Molido" 
              placeholderTextColor={colors.textSecondary} 
              value={nombre} 
              onChangeText={setNombre} 
            />

            <Text style={styles.inputLabel}>TIPO</Text>
            <View style={styles.typeRow}>
              {['MAIZ', 'SILO', 'HENO', 'MINERALES', 'OTRO'].map(t => (
                <TouchableOpacity 
                  key={t} 
                  style={[styles.typeBadge, tipo === t && styles.typeBadgeActive]}
                  onPress={() => setTipo(t)}
                >
                  <Text style={[styles.typeText, tipo === t && styles.typeTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>MATERIA SECA (%)</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Ej. 88" 
              placeholderTextColor={colors.textSecondary} 
              value={materiaSecaPct} 
              onChangeText={setMateriaSecaPct} 
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>PRECIO POR TONELADA ($)</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Ej. 150000" 
              placeholderTextColor={colors.textSecondary} 
              value={precioPorTonelada} 
              onChangeText={setPrecioPorTonelada} 
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>PROVEEDOR (Opcional)</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Ej. Forrajera San Juan" 
              placeholderTextColor={colors.textSecondary} 
              value={proveedor} 
              onChangeText={setProveedor} 
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                 <Text style={{ color: colors.textPrimary, fontWeight: 'bold' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={handleSave}>
                <Text style={{ color: colors.background, fontWeight: 'bold' }}>Guardar</Text>
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
  input: { backgroundColor: colors.surface, borderRadius: 16, padding: 18, color: colors.textPrimary, fontSize: 16, marginBottom: 20, borderWidth: 1, borderColor: colors.border },
  inputLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: 'bold', marginBottom: 10 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  typeBadge: { backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  typeBadgeActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeText: { color: colors.textPrimary, fontSize: 12, fontWeight: 'bold' },
  typeTextActive: { color: colors.background },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  cancelBtn: { flex: 0.5, height: 56, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  actionBtn: { flex: 1, height: 56, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
