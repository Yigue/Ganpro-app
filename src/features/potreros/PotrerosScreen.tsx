import React, { useState, useMemo, useEffect } from 'react';
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

// ── Formularios y Modales (Potreros) ─────────────────────────────────────────

function PotreroFormModal({ visible, onClose, potreroToEdit }: any) {
  const [nombre, setNombre] = useState('');
  const [hectareas, setHectareas] = useState('');
  const [recurso, setRecurso] = useState('PASTURA_NATURAL');

  useEffect(() => {
    if (potreroToEdit) {
      setNombre(potreroToEdit.nombre);
      setHectareas(potreroToEdit.hectareas?.toString() || '');
      setRecurso(potreroToEdit.recursoForrajero || 'PASTURA_NATURAL');
    } else {
      setNombre(''); setHectareas(''); setRecurso('PASTURA_NATURAL');
    }
  }, [potreroToEdit, visible]);

  const handleSave = async () => {
    if (!nombre) return Alert.alert('Error', 'Falta el nombre del potrero');
    try {
      await database.write(async () => {
        if (potreroToEdit) {
          await potreroToEdit.update((p: any) => {
            p.nombre = nombre;
            p.hectareas = parseFloat(hectareas) || 0;
            p.recursoForrajero = recurso;
          });
          Alert.alert('Éxito', 'Potrero actualizado');
        } else {
          await database.get<PotreroModel>('potreros').create((p) => {
            p.nombre = nombre;
            p.hectareas = parseFloat(hectareas) || 0;
            p.recursoForrajero = recurso;
          });
          Alert.alert('Éxito', 'Potrero creado');
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
          <Text style={styles.modalTitle}>{potreroToEdit ? 'Editar Potrero' : 'Nuevo Potrero'}</Text>
          
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.inputLabel}>NOMBRE</Text>
            <TextInput style={styles.input} placeholder="Ej: Potrero Bajo" placeholderTextColor={colors.textSecondary} value={nombre} onChangeText={setNombre} />
            
            <Text style={styles.inputLabel}>HECTÁREAS (HA)</Text>
            <TextInput style={styles.input} placeholder="0" keyboardType="numeric" placeholderTextColor={colors.textSecondary} value={hectareas} onChangeText={setHectareas} />
            
            <Text style={styles.inputLabel}>TIPO DE RECURSO FORRAJERO</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {['PASTURA_NATURAL', 'VERDEO_INVIERNO', 'ALFALFA', 'BOSQUE', 'CORRAL'].map(t => (
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
                <Text style={{ color: colors.background, fontWeight: 'bold' }}>{potreroToEdit ? 'Actualizar' : 'Guardar'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function PotreroDetailsModal({ visible, onClose, potrero, animalsCount, onEdit }: any) {
  if (!potrero) return null;

  const handleDelete = () => {
    if (animalsCount > 0) {
      return Alert.alert('Bloqueado', 'No podés eliminar un potrero que tiene animales asignados. Mové la hacienda primero.');
    }
    Alert.alert('Atención', `¿Eliminar permanentemente el potrero ${potrero.nombre}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try {
          await database.write(async () => {
            await potrero.destroyPermanently();
          });
          onClose();
        } catch(e) { Alert.alert('Error', 'No se pudo eliminar'); }
      }}
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContentLarge}>
          <View style={styles.modalHandle} />
          
          <View style={styles.detailsHeader}>
            <View style={styles.detailsIcon}><Ionicons name="map" size={32} color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.detailsTitle}>{potrero.nombre}</Text>
              <Text style={styles.detailsSub}>{potrero.recursoForrajero || 'Sin recurso especificado'}</Text>
            </View>
          </View>

          <View style={styles.kpiGrid}>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiValue}>{potrero.hectareas || 0}</Text>
              <Text style={styles.kpiLabel}>Hectáreas</Text>
            </View>
            <View style={[styles.kpiBox, { borderColor: animalsCount > 0 ? colors.warning : colors.border }]}>
              <Text style={[styles.kpiValue, animalsCount > 0 && { color: colors.warning }]}>{animalsCount}</Text>
              <Text style={styles.kpiLabel}>Cabezas</Text>
            </View>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiValue}>{animalsCount > 0 && potrero.hectareas ? (animalsCount / potrero.hectareas).toFixed(1) : 0}</Text>
              <Text style={styles.kpiLabel}>Carga (Cab/Ha)</Text>
            </View>
          </View>

          <Text style={styles.inputLabel}>ACCIONES DEL POTRERO</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity style={styles.gridBtn} onPress={() => { onClose(); onEdit(potrero); }}>
              <Ionicons name="pencil" size={24} color={colors.primary} />
              <Text style={styles.gridBtnText}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.gridBtn} onPress={() => Alert.alert('Ver', 'Próximamente lista de animales en este lote')}>
              <Ionicons name="list" size={24} color={colors.info} />
              <Text style={styles.gridBtnText}>Ver Animales</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.gridBtn} onPress={() => Alert.alert('Movimientos', 'Próximamente historial de movimientos')}>
              <Ionicons name="swap-horizontal" size={24} color={colors.warning} />
              <Text style={styles.gridBtnText}>Movimientos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.gridBtn} onPress={handleDelete}>
              <Ionicons name="trash" size={24} color={colors.error} />
              <Text style={[styles.gridBtnText, { color: colors.error }]}>Eliminar</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surface, marginTop: 20 }]} onPress={onClose}>
            <Text style={{ color: colors.textPrimary }}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Formularios y Modales (Nutrición) ────────────────────────────────────────

function SuplementoFormModal({ visible, onClose }: any) {
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('MAIZ');
  const [materiaSeca, setMateriaSeca] = useState('85');
  const [proteina, setProteina] = useState('8');
  const [energia, setEnergia] = useState('2.9');
  const [precio, setPrecio] = useState('200');

  const handleSave = async () => {
    if (!nombre) return Alert.alert('Error', 'El nombre es obligatorio');
    try {
      await nutRepo.createSuplemento({
        nombre, tipo,
        materiaSecaPct: parseFloat(materiaSeca) || 0,
        proteinaBrutaPct: parseFloat(proteina) || 0,
        energiaMcalKg: parseFloat(energia) || 0,
        precioPorTonelada: parseFloat(precio) || 0,
      });
      Alert.alert('Éxito', 'Ingrediente base registrado');
      onClose();
    } catch(e) { Alert.alert('Error', 'No se pudo guardar'); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContentLarge}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Nuevo Ingrediente Base</Text>
          
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.inputLabel}>NOMBRE DEL INGREDIENTE</Text>
            <TextInput style={styles.input} placeholder="Ej: Maíz Quebrado" placeholderTextColor={colors.textSecondary} value={nombre} onChangeText={setNombre} />
            
            <Text style={styles.inputLabel}>TIPO</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {['MAIZ', 'SILO', 'HENO', 'PELLET', 'UREA', 'SAL_MINERAL'].map(t => (
                <TouchableOpacity key={t} style={[styles.chip, tipo === t && styles.chipActive]} onPress={() => setTipo(t)}>
                  <Text style={[styles.chipText, tipo === t && styles.chipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.rowInputs}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.inputLabel}>% MATERIA SECA</Text>
                <TextInput style={styles.input} placeholder="85" keyboardType="numeric" placeholderTextColor={colors.textSecondary} value={materiaSeca} onChangeText={setMateriaSeca} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>% PROTEÍNA BRUTA</Text>
                <TextInput style={styles.input} placeholder="8" keyboardType="numeric" placeholderTextColor={colors.textSecondary} value={proteina} onChangeText={setProteina} />
              </View>
            </View>

            <View style={styles.rowInputs}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.inputLabel}>ENERGÍA (Mcal/Kg)</Text>
                <TextInput style={styles.input} placeholder="2.9" keyboardType="numeric" placeholderTextColor={colors.textSecondary} value={energia} onChangeText={setEnergia} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>PRECIO / TONELADA ($)</Text>
                <TextInput style={styles.input} placeholder="200" keyboardType="numeric" placeholderTextColor={colors.textSecondary} value={precio} onChangeText={setPrecio} />
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surface, flex: 0.5 }]} onPress={onClose}>
                <Text style={{ color: colors.textPrimary }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { flex: 1 }]} onPress={handleSave}>
                <Text style={{ color: colors.background, fontWeight: 'bold' }}>Guardar Ingrediente</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function CalculatorModal({ visible, onClose, raciones }: any) {
  const [cabezas, setCabezas] = useState('100');
  const [pesoPromedio, setPesoPromedio] = useState('350');
  const [gananciaDiaria, setGananciaDiaria] = useState('1.2');
  const [selectedRacion, setSelectedRacion] = useState<any>(null);

  const calc = useMemo(() => {
    const nCabezas = parseFloat(cabezas) || 0;
    const pPromedio = parseFloat(pesoPromedio) || 0;
    const gDiaria = parseFloat(gananciaDiaria) || 0;

    // Fórmula genérica super simplificada para MVP: 
    // Consumo Materia Seca aprox = 2.5% a 3% del peso vivo para engorde
    const consumoMSPorAnimal = pPromedio * 0.028; // 2.8% del peso vivo
    
    // Ajuste falopa por ganancia diaria (a más ganancia, más consumo/energía requerida)
    const factorGanancia = gDiaria > 1 ? (gDiaria * 1.1) : 1; 
    const kgTotalesMS = consumoMSPorAnimal * nCabezas * factorGanancia;
    
    // Asumimos un 75% de Materia Seca en la dieta promedio si no tenemos el dato real de los ingredientes
    const kgMateriaTal = kgTotalesMS / 0.75; 

    // Costo estimado (inventado si no hay ración, $150 el kg)
    const costoKg = 150; 
    const costoTotal = kgMateriaTal * costoKg;

    return { kgTotalesMS, kgMateriaTal, costoTotal };
  }, [cabezas, pesoPromedio, gananciaDiaria, selectedRacion]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContentLarge}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Calculadora Nutricional</Text>
          <Text style={styles.modalSubtitle}>Estimación de consumo base</Text>
          
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.rowInputs}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.inputLabel}>CABEZAS DEL LOTE</Text>
                <TextInput style={styles.input} placeholder="100" keyboardType="numeric" placeholderTextColor={colors.textSecondary} value={cabezas} onChangeText={setCabezas} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>PESO PROMEDIO (KG)</Text>
                <TextInput style={styles.input} placeholder="350" keyboardType="numeric" placeholderTextColor={colors.textSecondary} value={pesoPromedio} onChangeText={setPesoPromedio} />
              </View>
            </View>

            <Text style={styles.inputLabel}>OBJETIVO: GANANCIA DIARIA (KG/DÍA)</Text>
            <TextInput style={styles.input} placeholder="1.2" keyboardType="numeric" placeholderTextColor={colors.textSecondary} value={gananciaDiaria} onChangeText={setGananciaDiaria} />

            <View style={styles.calcResultsBox}>
              <Text style={styles.calcResultTitle}>RESULTADOS DEL CÁLCULO</Text>
              
              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Requerimiento Materia Seca:</Text>
                <Text style={styles.calcValue}>{calc.kgTotalesMS.toFixed(0)} kg/día</Text>
              </View>
              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Requerimiento Materia Tal:</Text>
                <Text style={[styles.calcValue, { color: colors.warning }]}>{calc.kgMateriaTal.toFixed(0)} kg/día</Text>
              </View>
              <View style={[styles.calcRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 10 }]}>
                <Text style={styles.calcLabel}>Costo Estimado Diario:</Text>
                <Text style={[styles.calcValue, { color: colors.primary, fontSize: 18 }]}>${calc.costoTotal.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.actionBtn, { flex: 1 }]} onPress={onClose}>
                <Text style={{ color: colors.background, fontWeight: 'bold' }}>Cerrar Calculadora</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Formularios (Condición Corporal) ─────────────────────────────────────────

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
        <View style={styles.modalContentLarge}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Registro de Condición Corporal</Text>
          
          <Text style={styles.inputLabel}>POTRERO OBSERVADO</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={potreros}
            keyExtractor={p => p.id}
            style={styles.chipRow}
            renderItem={({ item }) => (
              <TouchableOpacity style={[styles.chip, selectedPotrero === item.id && styles.chipActive]} onPress={() => setSelectedPotrero(item.id)}>
                <Text style={[styles.chipText, selectedPotrero === item.id && styles.chipTextActive]}>{item.nombre}</Text>
              </TouchableOpacity>
            )}
          />

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

import { LineChart } from 'react-native-chart-kit';

// ── Componentes de Lista ─────────────────────────────────────────────────────

const PotreroMapPlaceholder = () => (
  <View style={styles.mapPlaceholder}>
    <Ionicons name="map-outline" size={48} color={colors.primary} style={{ opacity: 0.5 }} />
    <Text style={styles.mapPlaceholderTitle}>Vista Satelital (GIS)</Text>
    <Text style={styles.mapPlaceholderSub}>El módulo de mapas interactivos estará disponible en la próxima actualización.</Text>
  </View>
);

const PotreroCardInner = ({ potrero, animalsCount, onPress }: any) => (

  <TouchableOpacity style={styles.card} onPress={() => onPress(potrero, animalsCount)}>
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

const SuplementoCardInner = ({ item }: any) => (
  <View style={styles.card}>
    <View style={[styles.cardIcon, { backgroundColor: 'rgba(255,170,0,0.1)' }]}><Ionicons name="nutrition" size={24} color={colors.warning} /></View>
    <View style={styles.cardMain}>
      <Text style={styles.cardTitle}>{item.nombre}</Text>
      <Text style={styles.cardSub}>{item.tipo} · {item.materiaSecaPct}% MS · {item.energiaMcalKg} Mcal/Kg</Text>
    </View>
    <View style={styles.badgeState}>
      <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 14 }}>${item.precioPorTonelada}/Tn</Text>
    </View>
  </View>
);

// ── Pantalla Principal ───────────────────────────────────────────────────────

function PotrerosInner({ potreros, raciones, ccs, suplementos }: any) {
  const [activeTab, setActiveTab] = useState<TabType>('potreros');
  
  // Modals Potreros
  const [isPotreroModalVisible, setPotreroModal] = useState(false);
  const [isPotreroDetailsVisible, setPotreroDetailsVisible] = useState(false);
  const [selectedPotrero, setSelectedPotrero] = useState<PotreroModel | null>(null);
  const [selectedPotreroCount, setSelectedPotreroCount] = useState(0);

  // Modals Nutrición & CC
  const [isSupModalVisible, setSupModal] = useState(false);
  const [isCalcModalVisible, setCalcModal] = useState(false);
  const [isCCModalVisible, setCCModal] = useState(false);

  const openPotreroDetails = (p: PotreroModel, count: number) => {
    setSelectedPotrero(p);
    setSelectedPotreroCount(count);
    setPotreroDetailsVisible(true);
  };

  const openPotreroEdit = (p: PotreroModel) => {
    setPotreroDetailsVisible(false);
    setSelectedPotrero(p);
    setTimeout(() => setPotreroModal(true), 300); // Wait for transition
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Establecimiento</Text>
          <Text style={styles.subtitle}>Gestión física y nutricional</Text>
        </View>
        {activeTab === 'nutricion' && (
          <TouchableOpacity style={styles.headerBtn} onPress={() => setCalcModal(true)}>
            <Ionicons name="calculator" size={20} color={colors.primary} />
            <Text style={styles.headerBtnText}>CALCULAR</Text>
          </TouchableOpacity>
        )}
      </View>

      <SegmentedControl active={activeTab} onChange={setActiveTab} />

      {activeTab === 'potreros' && (
        <View style={styles.flex}>
          <PotreroMapPlaceholder />
          <FlatList
            data={potreros}
            keyExtractor={p => p.id}
            renderItem={({ item }) => <PotreroCard potrero={item} onPress={openPotreroDetails} />}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<EmptyState icon="map" title="Sin potreros" subtitle="Agregá tu primer potrero" />}
          />
          <TouchableOpacity style={styles.fab} onPress={() => { setSelectedPotrero(null); setPotreroModal(true); }}>
            <Ionicons name="add" size={32} color="white" />
          </TouchableOpacity>
        </View>
      )}

      {activeTab === 'nutricion' && (
        <View style={styles.flex}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ingredientes Base (Stock)</Text>
          </View>
          <FlatList
            data={suplementos}
            keyExtractor={s => s.id}
            renderItem={({ item }) => <SuplementoCardInner item={item} />}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<EmptyState icon="nutrition" title="Sin Ingredientes" subtitle="Creá tus suplementos base (Maíz, Sales, etc)" />}
          />
          <TouchableOpacity style={styles.fab} onPress={() => setSupModal(true)}>
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
          
          <View style={{ paddingHorizontal: spacing.md, marginBottom: spacing.md }}>
            <Text style={styles.sectionTitle}>Evolución CC</Text>
            <View style={{ backgroundColor: colors.surface, borderRadius: 16, marginTop: 10, padding: 10, borderWidth: 1, borderColor: colors.border }}>
              <LineChart
                data={{
                  labels: ["Ene", "Feb", "Mar", "Abr", "May", "Jun"],
                  datasets: [{ data: [2.5, 2.8, 3.0, 3.2, 3.1, 3.2] }]
                }}
                width={width - spacing.md * 2 - 20}
                height={180}
                chartConfig={{
                  backgroundColor: colors.surface,
                  backgroundGradientFrom: colors.surface,
                  backgroundGradientTo: colors.surface,
                  decimalPlaces: 1,
                  color: (opacity = 1) => `rgba(0, 214, 143, ${opacity})`,
                  labelColor: (opacity = 1) => colors.textSecondary,
                  style: { borderRadius: 16 },
                  propsForDots: { r: "4", strokeWidth: "2", stroke: colors.primary }
                }}
                bezier
                style={{ marginVertical: 8, borderRadius: 16 }}
              />
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

      {/* Modales Compartidos */}
      <PotreroDetailsModal 
        visible={isPotreroDetailsVisible} 
        onClose={() => setPotreroDetailsVisible(false)} 
        potrero={selectedPotrero} 
        animalsCount={selectedPotreroCount}
        onEdit={openPotreroEdit}
      />
      <PotreroFormModal 
        visible={isPotreroModalVisible} 
        onClose={() => setPotreroModal(false)} 
        potreroToEdit={selectedPotrero}
      />
      <SuplementoFormModal 
        visible={isSupModalVisible} 
        onClose={() => setSupModal(false)} 
      />
      <CalculatorModal 
        visible={isCalcModalVisible} 
        onClose={() => setCalcModal(false)} 
        raciones={raciones} 
      />
      <CCFormModal 
        visible={isCCModalVisible} 
        onClose={() => setCCModal(false)} 
        potreros={potreros} 
      />
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: 'bold' },
  subtitle: { color: colors.textSecondary, fontSize: 12 },
  
  headerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,214,143,0.1)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.primary },
  headerBtnText: { color: colors.primary, fontSize: 10, fontWeight: 'bold' },

  segmentContainer: { flexDirection: 'row', backgroundColor: colors.surface, marginHorizontal: spacing.md, marginBottom: spacing.md, borderRadius: 16, padding: 4, borderWidth: 1, borderColor: colors.border },
  segmentBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, gap: 6 },
  segmentBtnActive: { backgroundColor: colors.primary },
  segmentText: { color: colors.textSecondary, fontSize: 12, fontWeight: 'bold' },
  segmentTextActive: { color: colors.background },

  sectionHeader: { paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  sectionTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: 'bold' },

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
  modalContentLarge: { backgroundColor: colors.surfaceElevated, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: spacing.xl, paddingBottom: spacing.xxl, height: '85%' },
  modalHandle: { width: 40, height: 5, backgroundColor: colors.border, borderRadius: 3, alignSelf: 'center', marginBottom: spacing.lg },
  modalTitle: { color: colors.textPrimary, fontSize: 22, fontWeight: 'bold', textAlign: 'center' },
  modalSubtitle: { color: colors.primary, fontSize: 14, textAlign: 'center', marginTop: 4, marginBottom: 20 },
  inputLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 10, marginTop: 15 },
  input: { backgroundColor: colors.surface, borderRadius: 12, padding: 15, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border },
  rowInputs: { flexDirection: 'row', gap: 10 },
  chipRow: { flexDirection: 'row', gap: 10, marginTop: 5 },
  chip: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginRight: 8, height: 40 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textSecondary, fontSize: 12, fontWeight: 'bold' },
  chipTextActive: { color: colors.background },
  
  ccGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  ccBtn: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  ccText: { color: colors.textPrimary, fontSize: 18, fontWeight: 'bold' },

  detailsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  detailsIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(0,214,143,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  detailsTitle: { color: colors.textPrimary, fontSize: 24, fontWeight: 'bold' },
  detailsSub: { color: colors.textSecondary, fontSize: 14, marginTop: 4 },
  kpiGrid: { flexDirection: 'row', gap: 10, marginBottom: 25 },
  kpiBox: { flex: 1, backgroundColor: colors.surface, padding: 15, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  kpiValue: { color: colors.textPrimary, fontSize: 20, fontWeight: 'bold' },
  kpiLabel: { color: colors.textSecondary, fontSize: 10, textTransform: 'uppercase', marginTop: 4 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  gridBtn: { width: '48%', backgroundColor: colors.surface, padding: 15, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, gap: 5 },
  gridBtnText: { color: colors.textPrimary, fontSize: 12, fontWeight: 'bold' },

  calcResultsBox: { backgroundColor: colors.surface, padding: 20, borderRadius: 16, marginTop: 25, borderWidth: 1, borderColor: colors.border },
  calcResultTitle: { color: colors.textSecondary, fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginBottom: 15 },
  calcRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  calcLabel: { color: colors.textSecondary, fontSize: 13 },
  calcValue: { color: colors.textPrimary, fontSize: 14, fontWeight: 'bold' },

  modalActions: { flexDirection: 'row', gap: 10, marginTop: 25 },
  actionBtn: { height: 56, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  fab: { position: 'absolute', bottom: 120, right: 24, width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 8 },

  mapPlaceholder: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  mapPlaceholderTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: spacing.sm,
  },
  mapPlaceholderSub: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
