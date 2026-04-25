import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert, FlatList, TextInput, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import withObservables from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';
import { LineChart } from 'react-native-chart-kit';
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
import { AnimalMovementModel } from '@data/models/AnimalMovementModel';
import { NutricionRepository } from '@data/repositories/NutricionRepository';

const { width } = Dimensions.get('window');
const nutRepo = new NutricionRepository(database);

type TabType = 'potreros' | 'nutricion' | 'cc';

// --- Helper: Categoría Icons ---
const SUP_ICONS: Record<string, any> = {
  MAIZ: 'leaf-outline',
  SILO: 'bus-outline',
  PELLETS: 'apps-outline',
  HENO: 'reorder-four-outline',
  MINERALES: 'color-filter-outline',
};

// ── Componentes de Navegación ──────────────────────────────────────────────

const SegmentedControl = ({ active, onChange }: { active: TabType; onChange: (v: TabType) => void }) => (
  <View style={styles.segmentContainer}>
    {['potreros', 'nutricion', 'cc'].map((t) => (
      <TouchableOpacity 
        key={t}
        style={[styles.segmentBtn, active === t && styles.segmentBtnActive]}
        onPress={() => onChange(t as TabType)}
      >
        <Ionicons 
          name={t === 'potreros' ? 'map' : t === 'nutricion' ? 'nutrition' : 'body'} 
          size={16} 
          color={active === t ? colors.background : colors.textSecondary} 
        />
        <Text style={[styles.segmentText, active === t && styles.segmentTextActive]}>
          {t === 'cc' ? 'C.C.' : t.charAt(0).toUpperCase() + t.slice(1)}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

// ── Módulo Potreros: Detalles y Desglose Real ────────────────────────────────

const PotreroDetailsInner = ({ visible, onClose, potrero, animalsCount, movements, animals, onEdit, onFeeding }: any) => {
  if (!potrero) return null;

  const categoryBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    animals.forEach((a: any) => {
      counts[a.categoria] = (counts[a.categoria] ?? 0) + 1;
    });
    return Object.entries(counts);
  }, [animals]);

  const carga = potrero.hectareas > 0 ? (animalsCount / potrero.hectareas).toFixed(1) : '0';
  const cargaColor = parseFloat(carga) > 2.0 ? colors.error : parseFloat(carga) > 1.2 ? colors.warning : colors.primary;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContentLarge}>
          <View style={styles.modalHandle} />
          
          <View style={styles.detailsHeader}>
            <View style={[styles.detailsIcon, { backgroundColor: `${cargaColor}15` }]}>
              <Ionicons name="map" size={32} color={cargaColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.detailsTitle}>{potrero.nombre}</Text>
              <Text style={styles.detailsSub}>{potrero.recursoForrajero} · Dispo: ALTA</Text>
            </View>
          </View>

          <View style={styles.kpiGrid}>
            <View style={styles.kpiBox}><Text style={styles.kpiValue}>{potrero.hectareas} ha</Text><Text style={styles.kpiLabel}>Superficie</Text></View>
            <View style={styles.kpiBox}><Text style={[styles.kpiValue, { color: cargaColor }]}>{carga}</Text><Text style={styles.kpiLabel}>Carga (Cab/Ha)</Text></View>
          </View>

          <View style={styles.breakdownBox}>
            <Text style={styles.sectionTitleSmall}>DESGLOSE DE HACIENDA ({animalsCount})</Text>
            <View style={styles.categoryRow}>
              {categoryBreakdown.length === 0 ? (
                <Text style={styles.emptyTextSmall}>Sin animales actualmente.</Text>
              ) : (
                categoryBreakdown.map(([cat, count]) => (
                  <View key={cat} style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{cat}: {count}</Text>
                  </View>
                ))
              )}
            </View>
          </View>

          {/* ACCIONES RÁPIDAS DE POTRERO */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 15 }}>
            <TouchableOpacity style={[styles.quickFeedingBtn, { flex: 1, backgroundColor: colors.info }]} onPress={() => { onClose(); Alert.alert('Movimiento Masivo', 'Próximamente: Mover la hacienda de este potrero.'); }}>
              <Ionicons name="swap-horizontal" size={20} color="white" />
              <Text style={styles.quickFeedingText}>MOVER</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.quickFeedingBtn, { flex: 1, backgroundColor: colors.warning }]} onPress={() => { onClose(); Alert.alert('Sanidad', 'Próximamente: Aplicar tratamiento al potrero.'); }}>
              <Ionicons name="medkit" size={20} color="white" />
              <Text style={styles.quickFeedingText}>SANIDAD</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.quickFeedingBtn, { flex: 1, backgroundColor: colors.primary }]} onPress={() => { onClose(); onFeeding(potrero); }}>
              <Ionicons name="cart" size={20} color="white" />
              <Text style={styles.quickFeedingText}>NUTRIR</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitleSmall}>ÚLTIMOS MOVIMIENTOS</Text>
          <View style={{ flex: 1, marginTop: 10 }}>
            {movements.slice(0, 5).map((m: any) => (
              <View key={m.id} style={styles.movementItem}>
                <Ionicons name="swap-horizontal" size={16} color={colors.textSecondary} style={{ marginRight: 10 }} />
                <Text style={styles.movementText}>Animal {m.animalId.slice(0,6)} ingresó</Text>
                <Text style={styles.movementDate}>{format(new Date(m.fecha), 'dd/MM')}</Text>
              </View>
            ))}
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.gridBtn} onPress={() => { onClose(); onEdit(potrero); }}>
              <Ionicons name="pencil" size={20} color={colors.primary} /><Text style={styles.gridBtnText}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surface, flex: 1 }]} onPress={onClose}>
              <Text style={{ color: colors.textPrimary }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const PotreroDetailsModal = withObservables(['potrero'], ({ potrero }: { potrero: PotreroModel | null }) => {
  const potreroId = potrero?.id || 'INVALID';
  return {
    potrero: potrero ? potrero.observe() : database.get<PotreroModel>('potreros').query(Q.where('id', 'INVALID')).observe().pipe((obs: any) => obs),
    movements: nutRepo.queryMovimientosByPotrero(potreroId).observe(),
    animals: database.get<AnimalModel>('animals').query(Q.where('potrero_id', potreroId)).observe(),
    animalsCount: database.get<AnimalModel>('animals').query(Q.where('potrero_id', potreroId)).observeCount(),
  };
})(PotreroDetailsInner);

// ── Modales de ABM ───────────────────────────────────────────────────────────

import { RacionMixerModal } from './ui/RacionMixerModal';
import { RacionCalculadoraModal } from './ui/RacionCalculadoraModal';
import { PotreroFormModal } from './ui/PotreroFormModal';
import { SuplementoFormModal } from './ui/SuplementoFormModal';
import { CCAuditModal } from './ui/CCAuditModal';
import { AplicarRacionModal } from './ui/AplicarRacionModal';

// ── Pantalla Principal ───────────────────────────────────────────────────────

function PotrerosInner({ potreros, raciones, ccs, suplementos }: any) {
  const [activeTab, setActiveTab] = useState<TabType>('potreros');
  const [isDetailsVisible, setDetailsVisible] = useState(false);
  const [isMixerVisible, setMixerVisible] = useState(false);
  const [isPotreroFormVisible, setPotreroFormVisible] = useState(false);
  const [isSuplementoFormVisible, setSuplementoFormVisible] = useState(false);
  const [isCCAuditModalVisible, setCCAuditModalVisible] = useState(false);
  const [isFeedingModalVisible, setFeedingModalVisible] = useState(false);
  const [isCalcVisible, setCalcVisible] = useState(false);
  const [selectedPotrero, setSelectedPotrero] = useState<PotreroModel | null>(null);
  const [racionCalc, setRacionCalc] = useState<RacionModel | null>(null);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {activeTab === 'potreros' && (
        <>
          <FlatList
            data={potreros}
            keyExtractor={p => p.id}
            contentContainerStyle={styles.list}
            ListHeaderComponent={() => (
              <>
                <View style={styles.header}>
                  <View><Text style={styles.title}>GanPro Establecimiento</Text><Text style={styles.subtitle}>Gestión de recursos y nutrición</Text></View>
                </View>
                <SegmentedControl active={activeTab} onChange={setActiveTab} />
              </>
            )}
            renderItem={({ item }) => <PotreroCard potrero={item} onPress={(p: any) => { setSelectedPotrero(p); setDetailsVisible(true); }} />}
          />
          <View style={styles.fabContainer}>
            <TouchableOpacity style={styles.fab} onPress={() => { setSelectedPotrero(null); setPotreroFormVisible(true); }}>
              <Ionicons name="add" size={30} color="white" />
            </TouchableOpacity>
          </View>
        </>
      )}

      {activeTab === 'nutricion' && (
        <>
          <FlatList
            data={raciones}
            keyExtractor={r => r.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <RacionCardInner
                racion={item}
                onPress={(r) => { setRacionCalc(r); setCalcVisible(true); }}
              />
            )}
            ListHeaderComponent={() => (
              <>
                <View style={styles.header}>
                  <View><Text style={styles.title}>GanPro Establecimiento</Text><Text style={styles.subtitle}>Gestión de recursos y nutrición</Text></View>
                </View>
                <SegmentedControl active={activeTab} onChange={setActiveTab} />
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Mi Vademécum Nutricional</Text>
                  {raciones.length === 0 && <EmptyState icon="nutrition-outline" title="Sin raciones" subtitle="Formulá tu primera mezcla" />}
                </View>
              </>
            )}
          />
          <View style={styles.fabContainer}>
            <TouchableOpacity style={[styles.fabSmall, { backgroundColor: colors.info }]} onPress={() => setSuplementoFormVisible(true)}>
              <Ionicons name="leaf" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.fab} onPress={() => setMixerVisible(true)}>
              <Ionicons name="flask" size={30} color="white" />
            </TouchableOpacity>
          </View>
        </>
      )}

      {activeTab === 'cc' && (
        <>
          <FlatList
            data={ccs}
            keyExtractor={c => c.id}
            contentContainerStyle={styles.list}
            ListHeaderComponent={() => {
              const recentCcs = ccs.slice(0, 6).reverse();
              const chartData = recentCcs.length > 0 ? recentCcs.map((c: any) => c.score) : [0];
              const chartLabels = recentCcs.length > 0 ? recentCcs.map((c: any) => format(new Date(c.fecha), 'dd/MM')) : ['N/A'];
              return (
                <>
                  <View style={styles.header}>
                    <View><Text style={styles.title}>GanPro Establecimiento</Text><Text style={styles.subtitle}>Gestión de recursos y nutrición</Text></View>
                  </View>
                  <SegmentedControl active={activeTab} onChange={setActiveTab} />
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Evolución de Peso y CC</Text>
                    <View style={styles.chartContainer}>
                      {recentCcs.length > 0 ? (
                        <LineChart
                          data={{
                            labels: chartLabels,
                            datasets: [{ data: chartData }]
                          }}
                          width={width - 40}
                          height={180}
                          chartConfig={{
                            backgroundColor: colors.surface,
                            backgroundGradientFrom: colors.surface,
                            backgroundGradientTo: colors.surface,
                            color: (opacity = 1) => `rgba(0, 214, 143, ${opacity})`,
                            labelColor: (opacity = 1) => colors.textSecondary,
                          }}
                          bezier
                          style={{ borderRadius: 16, marginVertical: 10 }}
                        />
                      ) : (
                        <EmptyState icon="analytics-outline" title="Sin auditorías" subtitle="No hay datos de condición corporal" />
                      )}
                    </View>
                  </View>
                </>
              );
            }}
            renderItem={({ item }: any) => (
              <View style={styles.card}>
                <View style={styles.cardIcon}><Text style={{ color: colors.primary, fontWeight: 'bold' }}>{item.score}</Text></View>
                <View style={{ flex: 1 }}><Text style={styles.cardTitle}>Auditoría CC</Text><Text style={styles.cardSub}>{format(new Date(item.fecha), 'dd MMM')}</Text></View>
                <Ionicons name="checkmark-done" size={20} color={colors.primary} />
              </View>
            )}
          />
          <View style={styles.fabContainer}>
            <TouchableOpacity style={styles.fab} onPress={() => setCCAuditModalVisible(true)}>
              <Ionicons name="add" size={30} color="white" />
            </TouchableOpacity>
          </View>
        </>
      )}

      <PotreroDetailsModal 
        visible={isDetailsVisible} 
        onClose={() => setDetailsVisible(false)} 
        potrero={selectedPotrero} 
        onEdit={() => { setDetailsVisible(false); setPotreroFormVisible(true); }} 
        onFeeding={(p: any) => { setDetailsVisible(false); setSelectedPotrero(p); setFeedingModalVisible(true); }} 
      />
      <RacionMixerModal 
        visible={isMixerVisible} 
        onClose={() => setMixerVisible(false)} 
        suplementos={suplementos} 
      />
      <PotreroFormModal 
        visible={isPotreroFormVisible} 
        onClose={() => setPotreroFormVisible(false)} 
        potrero={selectedPotrero} 
      />
      <SuplementoFormModal 
        visible={isSuplementoFormVisible} 
        onClose={() => setSuplementoFormVisible(false)} 
      />
      <CCAuditModal
        visible={isCCAuditModalVisible}
        onClose={() => setCCAuditModalVisible(false)}
        potreros={potreros}
      />
      <AplicarRacionModal
        visible={isFeedingModalVisible}
        onClose={() => setFeedingModalVisible(false)}
        potreroId={selectedPotrero?.id || ''}
        raciones={raciones}
      />
      <RacionCalculadoraModal
        visible={isCalcVisible}
        onClose={() => setCalcVisible(false)}
        racion={racionCalc}
      />
    </SafeAreaView>
  );
}

// ... (withObservables y styles para soportar el nuevo diseño denso)

const PotreroCardInner = ({ potrero, animalsCount, onPress }: any) => {
  const carga = potrero.hectareas > 0 ? (animalsCount / potrero.hectareas) : 0;
  const statusColor = carga > 2.0 ? colors.error : carga > 1.2 ? colors.warning : colors.primary;
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(potrero)}>
      <View style={[styles.cardIcon, { backgroundColor: `${statusColor}15` }]}>
        <Ionicons name="map" size={24} color={statusColor} />
      </View>
      <View style={styles.cardMain}>
        <Text style={styles.cardTitle}>{potrero.nombre}</Text>
        <Text style={styles.cardSub}>{potrero.hectareas} ha · {potrero.recursoForrajero}</Text>
      </View>
      <View style={styles.badgeState}>
        <Text style={[styles.badgeStateText, { color: statusColor }]}>{animalsCount > 0 ? 'OCUPADO' : 'LIBRE'}</Text>
        <Text style={styles.cabezasText}>{animalsCount} cab</Text>
      </View>
    </TouchableOpacity>
  );
};

const PotreroCard = withObservables(['potrero'], ({ potrero }: { potrero: PotreroModel }) => ({
  potrero: potrero.observe(),
  animalsCount: database.get<AnimalModel>('animals').query(Q.where('potrero_id', potrero.id)).observeCount(),
}))(PotreroCardInner);

const RacionCardInner = ({ racion, onPress }: { racion: RacionModel; onPress?: (r: RacionModel) => void }) => (
  <TouchableOpacity style={styles.card} onPress={() => onPress?.(racion)} activeOpacity={0.7}>
    <View style={styles.cardIcon}><Ionicons name="nutrition" size={24} color={colors.warning} /></View>
    <View style={{ flex: 1 }}>
      <Text style={styles.cardTitle}>{racion.nombre}</Text>
      <Text style={styles.cardSub}>
        {racion.descripcion || `$${(racion.costoEstimadoKg ?? 0).toFixed(3)}/kg`}
      </Text>
    </View>
    <Ionicons name="calculator-outline" size={20} color={colors.textSecondary} />
  </TouchableOpacity>
);

const PotrerosWithData = withObservables([], () => ({
  potreros: database.get<PotreroModel>('potreros').query().observe(),
  raciones: database.get<RacionModel>('raciones').query(Q.where('activa', true)).observe(),
  ccs: database.get<CondicionCorporalModel>('condicion_corporal').query(Q.sortBy('fecha', Q.desc)).observe(),
  suplementos: database.get<SuplementoModel>('suplementos').query().observe(),
}))(PotrerosInner);

export function PotrerosScreen() {
  return (
    <ObservableErrorBoundary fallbackTitle="Error en Potreros Pro">
      <PotrerosWithData />
    </ObservableErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.md },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: 'bold' },
  subtitle: { color: colors.textSecondary, fontSize: 12 },
  segmentContainer: { flexDirection: 'row', backgroundColor: colors.surface, marginHorizontal: spacing.md, marginBottom: spacing.md, borderRadius: 16, padding: 4, borderWidth: 1, borderColor: colors.border },
  segmentBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, gap: 6 },
  segmentBtnActive: { backgroundColor: colors.primary },
  segmentText: { color: colors.textSecondary, fontSize: 12, fontWeight: 'bold' },
  segmentTextActive: { color: colors.background },
  list: { paddingHorizontal: spacing.md, paddingBottom: 100 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 20, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  cardIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  cardMain: { flex: 1 },
  cardTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: 'bold' },
  cardSub: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  badgeState: { alignItems: 'flex-end' },
  badgeStateText: { fontSize: 10, fontWeight: 'bold' },
  cabezasText: { color: colors.textPrimary, fontWeight: 'bold', fontSize: 13 },
  section: { marginBottom: 20 },
  sectionTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  mixerBtn: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, borderRadius: 16, gap: 10 },
  mixerBtnText: { color: colors.background, fontWeight: 'heavy', fontSize: 13, letterSpacing: 1 },
  chartContainer: { backgroundColor: colors.surface, borderRadius: 20, padding: 10, borderWidth: 1, borderColor: colors.border },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
  modalContentLarge: { backgroundColor: colors.surfaceElevated, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: spacing.xl, paddingBottom: spacing.xxl, height: '92%' },
  modalHandle: { width: 40, height: 5, backgroundColor: colors.border, borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  detailsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  detailsIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  detailsTitle: { color: colors.textPrimary, fontSize: 24, fontWeight: 'bold' },
  detailsSub: { color: colors.textSecondary, fontSize: 14, marginTop: 4 },
  kpiGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  kpiBox: { flex: 1, backgroundColor: colors.surface, padding: 15, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  kpiValue: { color: colors.textPrimary, fontSize: 18, fontWeight: 'bold' },
  kpiLabel: { color: colors.textSecondary, fontSize: 10, textTransform: 'uppercase' },
  breakdownBox: { backgroundColor: colors.surface, padding: 15, borderRadius: 20, marginBottom: 20 },
  sectionTitleSmall: { color: colors.textSecondary, fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginBottom: 10 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryBadge: { backgroundColor: colors.background, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  categoryBadgeText: { color: colors.textPrimary, fontSize: 11, fontWeight: 'bold' },
  quickFeedingBtn: { backgroundColor: colors.warning, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 20, borderRadius: 20, gap: 12, marginBottom: 20 },
  quickFeedingText: { color: 'white', fontWeight: 'heavy', fontSize: 14 },
  movementItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  movementText: { color: colors.textPrimary, flex: 1, fontSize: 13 },
  movementDate: { color: colors.textSecondary, fontSize: 11 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  gridBtn: { backgroundColor: colors.surface, padding: 15, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, width: 100 },
  gridBtnText: { color: colors.textPrimary, fontSize: 11, fontWeight: 'bold' },
  actionBtn: { height: 56, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
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
  emptyTextSmall: { color: colors.textSecondary, fontSize: 12, fontStyle: 'italic', textAlign: 'center', marginVertical: 10 },
  modalTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  fabContainer: { position: 'absolute', bottom: 110, right: 24, gap: 15, alignItems: 'center' },
  fabSmall: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.info, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 5 },
  fab: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 },
});
