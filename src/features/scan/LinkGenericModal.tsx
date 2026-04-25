import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@theme/index';
import { database } from '@data/database/database';
import { Q } from '@nozbe/watermelondb';
import { AnimalRepository } from '@data/repositories/AnimalRepository';
import type AnimalModel from '@data/models/AnimalModel';

const animalRepo = new AnimalRepository(database);

interface Props {
  visible: boolean;
  rfid: string;
  onClose: () => void;
  onSaved: () => void;
}

export const LinkGenericModal: React.FC<Props> = ({ visible, rfid, onClose, onSaved }) => {
  const [generics, setGenerics] = useState<AnimalModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchGenerics();
    }
  }, [visible]);

  const fetchGenerics = async () => {
    setFetching(true);
    try {
      const results = await database
        .get<AnimalModel>('animals')
        .query(
          Q.where('estado', 'ACTIVO'),
          Q.where('is_generic', true)
        )
        .fetch();
      setGenerics(results);
    } catch (e) {
      console.error('Error fetching generics', e);
    } finally {
      setFetching(false);
    }
  };

  const handleLink = async (animal: AnimalModel) => {
    Alert.alert(
      'Confirmar Vinculación',
      `¿Vincular el RFID ${rfid} a este animal genérico (${animal.categoria})?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Vincular', 
          style: 'default',
          onPress: async () => {
            setLoading(true);
            try {
              await animalRepo.linkRfidToGeneric(animal.id, rfid);
              Alert.alert('Éxito', 'Animal vinculado correctamente');
              onSaved();
            } catch (e: any) {
              Alert.alert('Error', e.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.content} activeOpacity={1}>
          <View style={styles.handle} />
          
          <View style={styles.header}>
            <Text style={styles.title}>Vincular Tropa</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.subtitle}>Seleccione un animal genérico para asignarle el arete {rfid}:</Text>

          {fetching ? (
            <ActivityIndicator style={{ margin: 20 }} color={colors.primary} />
          ) : generics.length === 0 ? (
            <Text style={{ textAlign: 'center', margin: 20, color: colors.textSecondary }}>No hay animales genéricos activos.</Text>
          ) : (
            <ScrollView style={styles.list}>
              {generics.map(animal => (
                <TouchableOpacity 
                  key={animal.id} 
                  style={styles.card}
                  onPress={() => handleLink(animal)}
                  disabled={loading}
                >
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardCategoria}>{animal.categoria}</Text>
                    <Text style={styles.cardMeta}>{animal.sexo === 'M' ? 'Macho' : 'Hembra'} | {animal.raza || 'Sin raza'}</Text>
                  </View>
                  <Ionicons name="link-outline" size={24} color={colors.primary} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  title: { color: colors.textPrimary, fontSize: 20, fontWeight: 'bold' },
  subtitle: { color: colors.textSecondary, marginBottom: spacing.lg },
  list: { marginBottom: spacing.xl },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  cardInfo: { flex: 1 },
  cardCategoria: { color: colors.textPrimary, fontSize: 16, fontWeight: 'bold' },
  cardMeta: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
});
