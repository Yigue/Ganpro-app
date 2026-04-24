import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert, FlatList, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import withObservables from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';
import { EmptyState } from '@shared/components/EmptyState';
import { ObservableErrorBoundary } from '@shared/components/ObservableErrorBoundary';
import { colors, spacing, typography } from '@theme/index';
import { database } from '@data/database/database';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import PotreroModel from '@data/models/PotreroModel';
import RacionModel from '@data/models/RacionModel';
import SuplementoModel from '@data/models/SuplementoModel';
import CondicionCorporalModel from '@data/models/CondicionCorporalModel';
import AnimalModel from '@data/models/AnimalModel';
import { NutricionRepository } from '@data/repositories/NutricionRepository';

const nutRepo = new NutricionRepository(database);

type TabType = 'potreros' | 'nutricion' | 'cc';

// ── Componentes de Navegación ──────────────────────────────────────────────

const SegmentedControl = ({ active, onChange }: { active: TabType, onChange: (v: TabType) => void }) => (
  <View style={styles.segmentContainer}>
    <TouchableOpacity style={[styles.segmentBtn, active === 'potreros' && styles.segmentBtnActive]} onPress={() => onChange('potreros')}>
      <Ionicons name="map" size={18} color={active === 'potreros' ? colors.background : colors.textSecondary} />
      <Text style={[styles.segmentText, active === 'potreros' && styles.segmentTextActive]}>Potreros</Text>
    </TouchableOpacity>
    <TouchableOpacity style={[styles.segmentBtn, active === 'nutricion' && styles.segmentBtnActive]} onPress={() => onChange('nutricion')}>
      <Ionicons name="nutrition" size={18} color={active === 'nutricion' ? colors.background : colors.textSecondary} />
      <Text style={[styles.segmentText, active === 'nutricion' && styles.segmentTextActive]}>Nutrición</Text>
    </TouchableOpacity>
    <TouchableOpacity style={[styles.segmentBtn, active === 'cc' && styles.segmentBtnActive]} onPress={() => onChange('cc')}>
      <Ionicons name="body" size={18} color={active === 'cc' ? colors.background : colors.textSecondary} />
      <Text style={[styles.segmentText, active === 'cc' && styles.segmentTextActive]}>C.C.</Text>
    </TouchableOpacity>
  </View>
);

// ── Formularios y Modales (Alta Fidelidad) ───────────────────────────────────

function PotreroFormModal({ visible, onClose }: any) {
  const [nombre, setNombre] = useState('');
  const [hectareas, setHectareas] = useState('');
  const [recurso, setRecurso] = useState('PASTURA_NATURAL');

  const handleSave = async () => {
    if (!nombre) return Alert.alert('Error', 'Falta el nombre del potrero');
    try {
      await database.write(async () => {
        await database.get<PotreroModel>('potreros').create((p) => {
          p.nombre = nombre;
          p.hectareas = parseFloat(hectareas) || 0;
          p.recursoForrajero = recurso;
        });
      });
      Alert.alert('Éxito', 'Potrero creado');
      onClose();
    } catch (e) {
      Alert.alert('Error', 'No se pudo crear el potrero');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Nuevo Potrero</Text>
          <Text style={styles.inputLabel}>NOMBRE</Text>
          <TextInput style={styles.input} placeholder="Ej: Potrero Bajo" placeholderTextColor={colors.textSecondary} value={nombre} onChangeText={setNombre} />
          
          <Text style={styles.inputLabel}>HECTÁREAS (HA)</Text>
          <TextInput style={styles.input} placeholder="0" keyboardType="numeric" placeholderTextColor={colors.textSecondary} value={hectareas} onChangeText={setHectareas} />
          
          <Text style={styles.inputLabel}>TIPO DE RECURSO FORRAJERO</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {['PASTURA_NATURAL', 'VERDEO_INVIERNO', 'ALFALFA', 'BOSQUE'].map(t => (
              <TouchableOpacity key={t} style={[styles.chip, recurso === t && styles.chipActive]} onPress={() => setRecurso(t)}>
                <Text style={[styles.chipText, recurso === t && styles.chipTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surface, flex: 0.5 }]} onPress={onClose}>
              <Text style={{ color: colors.textPrimary }}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { flex: 1 }]} onPress={handleSave}>
              <Text style={{ color: colors.background, fontWeight: 'bold' }}>Guardar Potrero</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function RacionFormModal({ visible, onClose, suplementos }: any) {
  const [nombre, setNombre] = useState('');
  const [selectedSup, setSelectedSup] = useState<string | null>(null);
  const [cantidadBase, setCantidadBase] = useState('1');

  const handleSave = async () => {
    if (!nombre) return Alert.alert('Error', 'Falta nombre');
    try {
      const extraData = JSON.stringify({
        suplementoPrincipal: selectedSup,
        cantidad_base: parseFloat(cantidadBase) || 1,
      });
      await nutRepo.createRacion({ nombre, descripcion: extraData });
      Alert.alert('Éxito', 'Ración creada');
      onClose();
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar la ración');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Formulador de Raciones</Text>
          <Text style={styles.inputLabel}>NOMBRE DE LA MEZCLA</Text>
          <TextInput style={styles.input} placeholder="Ej: Ración Engorde Alta Energía" placeholderTextColor={colors.textSecondary} value={nombre} onChangeText={setNombre} />
          
          <Text style={styles.inputLabel}>INGREDIENTE PRINCIPAL</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {suplementos.map((s: any) => (
              <TouchableOpacity key={s.id} style={[styles.chip, selectedSup === s.id && styles.chipActive]} onPress={() => setSelectedSup(s.id)}>
                <Text style={[styles.chipText, selectedSup === s.id && styles.chipTextActive]}>{s.nombre}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.inputLabel}>CANTIDAD BASE (KG / DÍA / ANIMAL)</Text>
          <TextInput style={styles.input} placeholder="1" keyboardType="numeric" placeholderTextColor={colors.textSecondary} value={cantidadBase} onChangeText={setCantidadBase} />

          <View style={styles.modalActions}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surface, flex: 0.5 }]} onPress={onClose}>
              <Text style={{ color: colors.textPrimary }}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { flex: 1 }]} onPress={handleSave}>
              <Text style={{ color: colors.background, fontWeight: 'bold' }}>Crear Ración</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function CCFormModal({ visible, onClose, potreros }: any) {
  const [selectedPotrero, setSelectedPotrero] = useState('');
  const [score, setScore] = useState(3);
  
  const handleSave = async () => {
    if (!selectedPotrero) return Alert.alert('Error', 'Seleccione un potrero (lote)');
    try {
      await nutRepo.createCC({
        loteId: selectedPotrero,
        fecha: Date.now(),
        score,
        evaluador: 'App'
      });
      Alert.alert('Éxito', 'Condición Corporal Registrada');
      onClose();
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar la CC');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Registro de Condición Corporal</Text>
          
          <Text style={styles.inputLabel}>POTRERO OBSERVADO</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {potreros.map((p: any) => (
              <TouchableOpacity key={p.id} style={[styles.chip, selectedPotrero === p.id && styles.chipActive]} onPress={() => setSelectedPotrero(p.id)}>
                <Text style={[styles.chipText, selectedPotrero === p.id && styles.chipTextActive]}>{p.nombre}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.inputLabel}>PUNTAJE GENERAL DEL LOTE (1-5)</Text>
          <View style={styles.ccGrid}>
            {[1, 2, 3, 4, 5].map(s => {
              const color = s <= 2 ? colors.error : s >= 4 ? colors.primary : colors.warning;
              return (
                <TouchableOpacity key={s} style={[styles.ccBtn, score === s && { backgroundColor: color, borderColor: color }]} onPress={() => setScore(s)}>
                  <Text style={[styles.ccText, score === s && { color: colors.background }]}>{s}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
          <Text style={{ textAlign: 'center', color: colors.textSecondary, marginTop: 10, fontSize: 12 }}>
            {score <= 2 ? 'Estado Crítico (Flacos)' : score >= 4 ? 'Buen Estado (Gordos)' : 'Estado Óptimo'}
          </Text>

          <View style={styles.modalActions}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surface, flex: 0.5 }]} onPress={onClose}>
              <Text style={{ color: colors.textPrimary }}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { flex: 1 }]} onPress={handleSave}>
              <Text style={{ color: colors.background, fontWeight: 'bold' }}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Componentes de Lista ─────────────────────────────────────────────────────

const PotreroCardInner = ({ potrero, animalsCount }: any) => (
  <TouchableOpacity style={styles.card} onPress={() => Alert.alert('Detalle de Potrero', `${potrero.nombre}\nAnimales Asignados: ${animalsCount}\n[Próximamente detalle de ocupación y auditoría de movimientos]`)}>
    <View style={styles.cardIcon}><Ionicons name="map" size={24} color={colors.primary} /></View>
    <View style={styles.cardMain}>
      <Text style={styles.cardTitle}>{potrero.nombre}</Text>
      <Text style={styles.cardSub}>{potrero.hectareas} ha · {potrero.recursoForrajero || 'General'}</Text>
    </View>
    <View style={styles.badgeState}>
      <Text style={[styles.badgeStateText, animalsCount > 0 ? { color: colors.warning } : { color: colors.primary }]}>
        {animalsCount > 0 ? 'OCUPADO' : 'LIBRE'}
      </Text>
      {animalsCount > 0 && <Text style={{ color: colors.textPrimary, fontWeight: 'bold', fontSize: 12 }}>{animalsCount} cabezas</Text>}
    </View>
  </TouchableOpacity>
);

const PotreroCard = withObservables(['potrero'], ({ potrero }: { potrero: PotreroModel }) => ({
  potrero: potrero.observe(),
  animalsCount: database.get<AnimalModel>('animals').query(Q.where('potrero_id', potrero.id)).observeCount(),
}))(PotreroCardInner);

const RacionCardInner = ({ racion }: any) => {
  let dosis = 0;
  try { dosis = JSON.parse(racion.descripcion).cantidad_base; } catch(e){}
  return (
    <TouchableOpacity style={styles.card} onPress={() => Alert.alert('Asignación', 'Acá se asignará la ración a un potrero usando potrero_feeding_logs')}>
      <View style={[styles.cardIcon, { backgroundColor: 'rgba(255,170,0,0.1)' }]}><Ionicons name="nutrition" size={24} color={colors.warning} /></View>
      <View style={styles.cardMain}>
        <Text style={styles.cardTitle}>{racion.nombre}</Text>
        <Text style={styles.cardSub}>Dosis Base: {dosis || 1} kg/animal</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textDisabled} />
    </TouchableOpacity>
  );
};

// ── Pantalla Principal ───────────────────────────────────────────────────────

function PotrerosInner({ potreros, raciones, ccs, suplementos }: any) {
  const [activeTab, setActiveTab] = useState<TabType>('potreros');
  
  const [isPotreroModalVisible, setPotreroModal] = useState(false);
  const [isRacionModalVisible, setRacionModal] = useState(false);
  const [isCCModalVisible, setCCModal] = useState(false);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Establecimiento</Text>
          <Text style={styles.subtitle}>Gestión física y nutricional</Text>
        </View>
      </View>

      <SegmentedControl active={activeTab} onChange={setActiveTab} />

      {activeTab === 'potreros' && (
        <View style={styles.flex}>
          <FlatList
            data={potreros}
            keyExtractor={p => p.id}
            renderItem={({ item }) => <PotreroCard potrero={item} />}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<EmptyState icon="map" title="Sin potreros" subtitle="Agregá tu primer potrero" />}
          />
          <TouchableOpacity style={styles.fab} onPress={() => setPotreroModal(true)}>
            <Ionicons name="add" size={32} color="white" />
          </TouchableOpacity>
        </View>
      )}

      {activeTab === 'nutricion' && (
        <View style={styles.flex}>
          <FlatList
            data={raciones}
            keyExtractor={r => r.id}
            renderItem={({ item }) => <RacionCardInner racion={item} />}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<EmptyState icon="nutrition" title="Sin raciones" subtitle="Creá tus mezclas nutricionales" />}
          />
          <TouchableOpacity style={styles.fab} onPress={() => setRacionModal(true)}>
            <Ionicons name="add" size={32} color="white" />
          </TouchableOpacity>
        </View>
      )}

      {activeTab === 'cc' && (
        <View style={styles.flex}>
          <View style={styles.dashGrid}>
            <View style={styles.dashCard}>
              <Ionicons name="trending-up" size={24} color={colors.primary} />
              <Text style={styles.dashValue}>+12kg</Text>
              <Text style={styles.dashLabel}>Ganancia Media</Text>
            </View>
            <View style={styles.dashCard}>
              <Ionicons name="body" size={24} color={colors.warning} />
              <Text style={styles.dashValue}>3.2</Text>
              <Text style={styles.dashLabel}>CC Promedio</Text>
            </View>
          </View>
          <FlatList
            data={ccs}
            keyExtractor={c => c.id}
            renderItem={({ item }: any) => (
              <View style={styles.card}>
                <View style={[styles.cardIcon, { backgroundColor: item.score <= 2 ? 'rgba(255,61,113,0.1)' : 'rgba(0,214,143,0.1)' }]}>
                  <Text style={{ color: item.score <= 2 ? colors.error : colors.primary, fontWeight: 'bold', fontSize: 18 }}>{item.score}</Text>
                </View>
                <View style={styles.cardMain}>
                  <Text style={styles.cardTitle}>Inspección Sanitaria</Text>
                  <Text style={styles.cardSub}>{format(new Date(item.fecha), 'dd MMM yyyy')}</Text>
                </View>
              </View>
            )}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<EmptyState icon="body" title="Sin registros" subtitle="Auditoría de Condición Corporal" />}
          />
          <TouchableOpacity style={styles.fab} onPress={() => setCCModal(true)}>
            <Ionicons name="add" size={32} color="white" />
          </TouchableOpacity>
        </View>
      )}

      <PotreroFormModal visible={isPotreroModalVisible} onClose={() => setPotreroModal(false)} />
      <RacionFormModal visible={isRacionModalVisible} onClose={() => setRacionModal(false)} suplementos={suplementos} />
      <CCFormModal visible={isCCModalVisible} onClose={() => setCCModal(false)} potreros={potreros} />
    </SafeAreaView>
  );
}

const PotrerosWithData = withObservables([], () => ({
  potreros: database.get<PotreroModel>('potreros').query().observe(),
  raciones: database.get<RacionModel>('raciones').query(Q.where('activa', true)).observe(),
  ccs: database.get<CondicionCorporalModel>('condicion_corporal').query(Q.sortBy('fecha', Q.desc)).observe(),
  suplementos: database.get<SuplementoModel>('suplementos').query().observe(),
}))(PotrerosInner);

export function PotrerosScreen() {
  return (
    <ObservableErrorBoundary fallbackTitle="Error en Potreros">
      <PotrerosWithData />
    </ObservableErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: { padding: spacing.md },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: 'bold' },
  subtitle: { color: colors.textSecondary, fontSize: 12 },
  
  segmentContainer: { flexDirection: 'row', backgroundColor: colors.surface, marginHorizontal: spacing.md, marginBottom: spacing.md, borderRadius: 16, padding: 4, borderWidth: 1, borderColor: colors.border },
  segmentBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, gap: 6 },
  segmentBtnActive: { backgroundColor: colors.primary },
  segmentText: { color: colors.textSecondary, fontSize: 12, fontWeight: 'bold' },
  segmentTextActive: { color: colors.background },

  list: { paddingHorizontal: spacing.md, paddingBottom: 150 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 20, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  cardIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,214,143,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  cardMain: { flex: 1 },
  cardTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: 'bold' },
  cardSub: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  badgeState: { alignItems: 'flex-end' },
  badgeStateText: { fontSize: 10, fontWeight: 'bold', marginBottom: 2 },

  dashGrid: { flexDirection: 'row', gap: 15, paddingHorizontal: spacing.md, marginBottom: 15 },
  dashCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 16, padding: 15, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  dashValue: { color: colors.textPrimary, fontSize: 20, fontWeight: 'bold', marginTop: 10 },
  dashLabel: { color: colors.textSecondary, fontSize: 11, marginTop: 4, textTransform: 'uppercase' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surfaceElevated, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: spacing.xl, paddingBottom: spacing.xxl },
  modalHandle: { width: 40, height: 5, backgroundColor: colors.border, borderRadius: 3, alignSelf: 'center', marginBottom: spacing.lg },
  modalTitle: { color: colors.textPrimary, fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  inputLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 10, marginTop: 15 },
  input: { backgroundColor: colors.surface, borderRadius: 12, padding: 15, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border },
  chipRow: { flexDirection: 'row', gap: 10 },
  chip: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginRight: 8, height: 40 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textSecondary, fontSize: 12, fontWeight: 'bold' },
  chipTextActive: { color: colors.background },
  
  ccGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  ccBtn: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  ccText: { color: colors.textPrimary, fontSize: 18, fontWeight: 'bold' },

  modalActions: { flexDirection: 'row', gap: 10, marginTop: 25 },
  actionBtn: { height: 56, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  fab: { position: 'absolute', bottom: 120, right: 24, width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 8 },
});
