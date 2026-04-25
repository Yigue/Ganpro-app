import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@theme/index';
import { ExportService } from '@shared/services/ExportService';
import { database } from '@data/database/database';
import type AnimalModel from '@data/models/AnimalModel';
import { Q } from '@nozbe/watermelondb';

export function ExportMenuModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [isExporting, setIsExporting] = React.useState(false);

  const handleExportDB = async () => {
    setIsExporting(true);
    try {
      await ExportService.exportDatabaseBackup();
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      // Traemos los animales de la BD al vuelo para no tenerlos fijos en memoria RAM
      const animals = await database.get<AnimalModel>('animals').query(Q.where('estado', 'ACTIVO')).fetch();
      await ExportService.exportInventoryToCSV(animals);
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.content}>
          <Text style={styles.title}>Exportar Datos</Text>
          <Text style={styles.subtitle}>Seleccioná el formato para respaldar tu información offline.</Text>
          
          {isExporting ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loaderText}>Generando archivo...</Text>
            </View>
          ) : (
            <View style={styles.options}>
              <TouchableOpacity style={styles.optionBtn} onPress={handleExportCSV}>
                <Ionicons name="document-text-outline" size={24} color={colors.primary} />
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Inventario (CSV)</Text>
                  <Text style={styles.optionDesc}>Descargar stock actual en formato Excel.</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.optionBtn} onPress={handleExportDB}>
                <Ionicons name="server-outline" size={24} color={colors.info} />
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Backup Completo (.db)</Text>
                  <Text style={styles.optionDesc}>Copia de seguridad técnica del sistema.</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  content: { backgroundColor: colors.surface, borderRadius: 20, padding: spacing.lg, width: '85%' },
  title: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.lg },
  options: { gap: spacing.md },
  optionBtn: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, backgroundColor: colors.background, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  optionTextContainer: { marginLeft: spacing.md, flex: 1 },
  optionTitle: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary },
  optionDesc: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  loaderContainer: { alignItems: 'center', padding: spacing.xl },
  loaderText: { marginTop: spacing.md, color: colors.primary, fontWeight: 'bold' }
});