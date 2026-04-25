import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@theme/index';
import { CATEGORIA, CategoriaType } from '@core/constants/categories';
import { database } from '@data/database/database';
import { AnimalRepository } from '@data/repositories/AnimalRepository';
import type PotreroModel from '@data/models/PotreroModel';

const animalRepo = new AnimalRepository(database);

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BulkCreateModal: React.FC<Props> = ({ visible, onClose, onSuccess }) => {
  const [cantidad, setCantidad] = useState('');
  const [categoria, setCategoria] = useState<CategoriaType>('TERNERO');
  const [pesoTotal, setPesoTotal] = useState('');
  const [potreroId, setPotreroId] = useState('');
  const [potreros, setPotreros] = useState<PotreroModel[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      // Cargar potreros al abrir
      database.get<PotreroModel>('potreros').query().fetch().then(setPotreros);
      setCantidad('');
      setPesoTotal('');
    }
  }, [visible]);

  const handleSave = async () => {
    const qty = parseInt(cantidad, 10);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Error', 'La cantidad debe ser mayor a 0');
      return;
    }
    if (!potreroId) {
      Alert.alert('Error', 'Debe seleccionar un potrero destino');
      return;
    }

    setLoading(true);
    try {
      const peso = parseFloat(pesoTotal) || 0;
      await animalRepo.createBulkGenerics(qty, categoria, potreroId, peso);
      onSuccess();
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.content} activeOpacity={1}>
          <View style={styles.handle} />
          
          <View style={styles.header}>
            <Text style={styles.title}>Ingreso Masivo (Tropa)</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Cantidad de Animales *</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={cantidad}
                onChangeText={setCantidad}
                placeholder="Ej. 50"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Categoría *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipContainer}>
                {Object.values(CATEGORIA).map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.chip, categoria === cat && styles.chipActive]}
                    onPress={() => setCategoria(cat as CategoriaType)}
                  >
                    <Text style={[styles.chipText, categoria === cat && styles.chipTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Potrero Destino *</Text>
              <View style={styles.chipContainer}>
                {potreros.length === 0 ? (
                  <Text style={{ color: colors.textSecondary }}>No hay potreros creados.</Text>
                ) : (
                  potreros.map(potrero => (
                    <TouchableOpacity
                      key={potrero.id}
                      style={[styles.chip, potreroId === potrero.id && styles.chipActive]}
                      onPress={() => setPotreroId(potrero.id)}
                    >
                      <Text style={[styles.chipText, potreroId === potrero.id && styles.chipTextActive]}>{potrero.nombre}</Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Peso Total de la Tropa (kg)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={pesoTotal}
                onChangeText={setPesoTotal}
                placeholder="Opcional. Se prorratea entre todos."
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.btnSave} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="white" /> : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="white" />
                <Text style={styles.btnSaveText}>Ingresar Tropa</Text>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  content: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: spacing.xl,
    maxHeight: '80%',
  },
  handle: { width: 40, height: 5, backgroundColor: colors.border, borderRadius: 3, alignSelf: 'center', marginBottom: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  title: { color: colors.textPrimary, fontSize: 20, fontWeight: 'bold' },
  form: { marginBottom: spacing.xl },
  field: { marginBottom: spacing.lg },
  label: { color: colors.textSecondary, fontSize: 14, marginBottom: spacing.sm, fontWeight: '500' },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: 16,
  },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textSecondary, fontWeight: '500' },
  chipTextActive: { color: 'white', fontWeight: 'bold' },
  btnSave: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  btnSaveText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});
