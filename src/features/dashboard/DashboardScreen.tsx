import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import withObservables from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';
import { EmptyState } from '@shared/components/EmptyState';
import { ObservableErrorBoundary } from '@shared/components/ObservableErrorBoundary';
import { colors, spacing, typography } from '@theme/index';
import { database } from '@data/database/database';
import { calcularGDP } from '@core/utils/nutricionEngine';
import { EVENTO_TIPO, type EventoTipoType } from '@core/constants/eventTypes';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type EventoModel from '@data/models/EventoModel';
import type LoteModel from '@data/models/LoteModel';
import type PrecioMercadoModel from '@data/models/PrecioMercadoModel';
import type AnimalModel from '@data/models/AnimalModel';
import type SyncLogModel from '@data/models/SyncLogModel';
import type { FinancialCategoryModel } from '@data/models/FinancialCategoryModel';
import type MovimientoFinancieroModel from '@data/models/MovimientoFinancieroModel';

import { AddTransactionModal } from './ui/AddTransactionModal';
import { FinancialCategoryManagerModal } from './ui/FinancialCategoryManagerModal';
import { seedDatabase } from '@shared/utils/seedDatabase';

type DashTab = 'operativo' | 'economico';

type TipoMeta = {
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
};

const TIPO_META: Record<EventoTipoType, TipoMeta> = {
  PESAJE:      { iconName: 'scale-outline',             color: colors.info },
  VACUNACION:  { iconName: 'medical-outline',           color: colors.warning },
  CAMBIO_LOTE: { iconName: 'swap-horizontal-outline',   color: colors.primary },
  TACTO:       { iconName: 'flask-outline',             color: '#C35BD0' },
  OTRO:        { iconName: 'document-text-outline',     color: colors.textSecondary },
};

// ── GDP Line Chart ─────────────────────────────────────────────────────────────

function SimpleLineChart({ data }: { data: { x: number; y: number }[] }) {
  if (data.length < 2) {
    return (
      <EmptyState
        icon="⚖️"
        title="Pocos pesajes"
        subtitle="Registrá al menos 2 pesajes para ver la curva GDP"
      />
    );
  }

  const CHART_H = 130;
  const maxY = Math.max(...data.map((d) => d.y));
  const minY = Math.min(...data.map((d) => d.y));
  const range = maxY - minY || 1;

  const points = data.map((point, i) => ({
    xPct: i / (data.length - 1),
    yPct: (point.y - minY) / range,
    ...point,
  }));

  return (
    <View style={chartStyles.container}>
      <View style={[chartStyles.chart, { height: CHART_H }]}>
        {points.map((pt, i) => (
          <View
            key={i}
            style={[
              chartStyles.dot,
              {
                left: `${pt.xPct * 84 + 4}%` as `${number}%`,
                bottom: pt.yPct * (CHART_H - 32) + 12,
              },
            ]}
          />
        ))}
        <Text style={chartStyles.maxLabel}>{maxY.toFixed(1)} kg</Text>
        <Text style={chartStyles.minLabel}>{minY.toFixed(1)} kg</Text>
      </View>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: { marginTop: spacing.sm },
  chart: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    position: 'relative',
    paddingHorizontal: spacing.sm,
  },
  dot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  maxLabel: { position: 'absolute', top: 8, right: 8, color: colors.textDisabled, fontSize: 10 },
  minLabel: { position: 'absolute', bottom: 8, right: 8, color: colors.textDisabled, fontSize: 10 },
});

// ── Semáforo Card ─────────────────────────────────────────────────────────────

function SemaforoCard({ title, value, status }: { title: string; value: string; status: 'green' | 'yellow' | 'red' | 'gray' }) {
  const color = status === 'green' ? colors.primary : status === 'yellow' ? colors.warning : status === 'red' ? colors.error : colors.textDisabled;
  return (
    <View style={[semaforoStyles.card, { borderColor: `${color}40` }]}>
      <Text style={[semaforoStyles.value, { color }]}>{value}</Text>
      <Text style={semaforoStyles.title}>{title}</Text>
    </View>
  );
}

const semaforoStyles = StyleSheet.create({
  card: { flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md, alignItems: 'center', borderWidth: 1 },
  value: { fontSize: typography.sizes.lg, fontWeight: typography.weights.heavy },
  title: { color: colors.textSecondary, fontSize: 10, textAlign: 'center', marginTop: 4 },
});

// ── Dashboard Inner ───────────────────────────────────────────────────────────

interface DashboardProps {
  pesajes: EventoModel[];
  eventosRecientes: EventoModel[];
  lotes: LoteModel[];
  ultimoPrecio: PrecioMercadoModel[];
  animalesMuertos: AnimalModel[];
  todosAnimales: AnimalModel[];
  pendingSyncs: number;
  transactions: MovimientoFinancieroModel[];
  financialCategories: FinancialCategoryModel[];
  selectedLoteId: string | null;
  onSelectLote: (id: string | null) => void;
  activeTab: DashTab;
}

function DashboardInner({
  pesajes,
  eventosRecientes,
  lotes,
  ultimoPrecio,
  animalesMuertos,
  todosAnimales,
  pendingSyncs,
  transactions,
  financialCategories,
  selectedLoteId,
  onSelectLote,
  activeTab,
}: DashboardProps) {
  const [isTxModalVisible, setIsTxModalVisible] = useState(false);
  const [isCatModalVisible, setIsCatModalVisible] = useState(false);

  const chartData = useMemo(() => {
    return pesajes
      .filter((p) => p.valor != null)
      .map((p) => ({ x: p.timestamp, y: p.valor! }));
  }, [pesajes]);

  const gdp = useMemo(() => {
    if (pesajes.length < 2) return null;
    const sorted = [...pesajes].sort((a, b) => a.timestamp - b.timestamp);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const days = (last.timestamp - first.timestamp) / (1000 * 60 * 60 * 24);
    return days > 0 ? (last.valor! - first.valor!) / days : 0;
  }, [pesajes]);

  const totalIngresos = transactions.filter(t => t.tipo === 'INGRESO').reduce((acc, t) => acc + t.monto, 0);
  const totalGastos = transactions.filter(t => t.tipo === 'GASTO').reduce((acc, t) => acc + t.monto, 0);

  const handleSeed = () => {
    Alert.alert('Simulación Pro', 'Esto cargará 100 animales, potreros, sanidad y finanzas para pruebas. ¿Continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cargar Demo', onPress: async () => {
        try {
          await seedDatabase();
          Alert.alert('Éxito', 'Información mock cargada. Reinicie la app si no ve los cambios.');
        } catch (e) {
          Alert.alert('Error', 'Falló la carga de datos mock.');
        }
      }}
    ]);
  };

  return (
    <ScrollView contentContainerStyle={dashStyles.scrollContent} showsVerticalScrollIndicator={false}>
      
      {/* Botón de Inyección de Datos (Solo para testing) */}
      {todosAnimales.length === 0 && (
        <TouchableOpacity style={dashStyles.seedBtn} onPress={handleSeed}>
          <Ionicons name="flask" size={16} color="white" />
          <Text style={dashStyles.seedBtnText}>CARGAR ESTABLECIMIENTO DEMO</Text>
        </TouchableOpacity>
      )}

      {/* Lote selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={dashStyles.loteRow}>
        <TouchableOpacity style={[dashStyles.loteChip, selectedLoteId === null && dashStyles.loteChipActive]} onPress={() => onSelectLote(null)}>
          <Text style={[dashStyles.loteChipText, selectedLoteId === null && dashStyles.loteChipTextActive]}>Todos</Text>
        </TouchableOpacity>
        {lotes.map((l) => (
          <TouchableOpacity key={l.id} style={[dashStyles.loteChip, selectedLoteId === l.id && dashStyles.loteChipActive]} onPress={() => onSelectLote(l.id)}>
            <Text style={[dashStyles.loteChipText, selectedLoteId === l.id && dashStyles.loteChipTextActive]}>{l.nombre}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {activeTab === 'operativo' ? (
        <>
          <View style={dashStyles.section}>
            <View style={dashStyles.sectionHeader}>
              <Text style={dashStyles.sectionTitle}>Ganancia Diaria de Peso</Text>
              {gdp != null && <Text style={dashStyles.gdpValue}>{gdp.toFixed(2)} kg/d</Text>}
            </View>
            <SimpleLineChart data={chartData} />
          </View>

          <View style={dashStyles.section}>
            <Text style={dashStyles.sectionTitle}>Indicadores</Text>
            <View style={dashStyles.semaforoRow}>
              <SemaforoCard title="GDP" value={gdp != null ? `${gdp.toFixed(1)}kg` : 'N/D'} status={gdp && gdp >= 0.8 ? 'green' : 'yellow'} />
              <SemaforoCard title="Mortalidad" value={`${((animalesMuertos.length / (todosAnimales.length || 1)) * 100).toFixed(1)}%`} status="green" />
              <SemaforoCard title="Precio Nov." value={ultimoPrecio[0] ? `$${ultimoPrecio[0].novilloKg}` : 'N/C'} status="gray" />
            </View>
          </View>
        </>
      ) : (
        <>
          <View style={dashStyles.section}>
            <View style={dashStyles.sectionHeader}>
              <Text style={dashStyles.sectionTitle}>Resumen Financiero</Text>
              <TouchableOpacity onPress={() => setIsCatModalVisible(true)} style={dashStyles.manageBtn}>
                <Ionicons name="settings-outline" size={16} color={colors.primary} />
                <Text style={dashStyles.manageBtnText}>CATEGORÍAS</Text>
              </TouchableOpacity>
            </View>
            <View style={dashStyles.finGrid}>
              <View style={[dashStyles.finCard, { borderColor: colors.primary + '40' }]}>
                <Text style={dashStyles.finLabel}>INGRESOS</Text>
                <Text style={[dashStyles.finValue, { color: colors.primary }]}>${totalIngresos.toLocaleString()}</Text>
              </View>
              <View style={[dashStyles.finCard, { borderColor: colors.error + '40' }]}>
                <Text style={dashStyles.finLabel}>GASTOS</Text>
                <Text style={[dashStyles.finValue, { color: colors.error }]}>${totalGastos.toLocaleString()}</Text>
              </View>
            </View>
          </View>

          <View style={dashStyles.section}>
            <View style={dashStyles.sectionHeader}>
              <Text style={dashStyles.sectionTitle}>Últimos Movimientos</Text>
              <TouchableOpacity onPress={() => setIsTxModalVisible(true)} style={dashStyles.addBtnSmall}>
                <Ionicons name="add" size={18} color="white" />
              </TouchableOpacity>
            </View>
            {transactions.map(t => (
              <View key={t.id} style={dashStyles.txRow}>
                <View style={[dashStyles.txIcon, { backgroundColor: t.tipo === 'INGRESO' ? colors.primaryAlpha : colors.errorAlpha }]}>
                  <Ionicons name={t.tipo === 'INGRESO' ? "trending-up" : "trending-down"} size={16} color={t.tipo === 'INGRESO' ? colors.primary : colors.error} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={dashStyles.txConcepto}>{t.descripcion || 'Sin concepto'}</Text>
                  <Text style={dashStyles.txMeta}>{t.categoria} · {format(new Date(t.fecha), 'dd/MM')}</Text>
                </View>
                <Text style={[dashStyles.txMonto, { color: t.tipo === 'INGRESO' ? colors.primary : colors.error }]}>
                  {t.tipo === 'INGRESO' ? '+' : '-'}${t.monto.toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      <AddTransactionModal 
        visible={isTxModalVisible} 
        onClose={() => setIsTxModalVisible(false)} 
        categories={financialCategories}
        onSave={async (data) => {
          await database.write(async () => {
            await database.get<MovimientoFinancieroModel>('movimientos_financieros').create(record => {
              record.tipo = data.tipo;
              record.monto = parseFloat(data.monto);
              record.descripcion = data.concepto;
              record.categoria = data.categoria;
              record.fecha = Date.now();
            });
          });
          setIsTxModalVisible(false);
        }}
      />

      <FinancialCategoryManagerModal 
        visible={isCatModalVisible} 
        onClose={() => setIsCatModalVisible(false)} 
        categories={financialCategories}
      />
    </ScrollView>
  );
}

const DashboardWithData = withObservables(
  ['selectedLoteId', 'activeTab'],
  ({ selectedLoteId }: { selectedLoteId: string | null }) => ({
    pesajes: database.get<EventoModel>('eventos').query(Q.where('tipo', EVENTO_TIPO.PESAJE), Q.take(30)).observe(),
    eventosRecientes: database.get<EventoModel>('eventos').query(Q.sortBy('timestamp', Q.desc), Q.take(10)).observe(),
    lotes: database.get<LoteModel>('lotes').query().observe(),
    ultimoPrecio: database.get<PrecioMercadoModel>('precios_mercado').query(Q.sortBy('fecha', Q.desc), Q.take(1)).observe(),
    animalesMuertos: database.get<AnimalModel>('animals').query(Q.where('estado', 'MUERTO')).observe(),
    todosAnimales: database.get<AnimalModel>('animals').query().observe(),
    pendingSyncs: database.get<SyncLogModel>('sync_logs').query(Q.where('synced', false)).observeCount(),
    transactions: database.get<MovimientoFinancieroModel>('movimientos_financieros').query(Q.sortBy('fecha', Q.desc), Q.take(20)).observe(),
    financialCategories: database.get<FinancialCategoryModel>('financial_categories').query(Q.sortBy('name', Q.asc)).observe(),
  })
)(DashboardInner);

export function DashboardScreen() {
  const [selectedLoteId, setSelectedLoteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DashTab>('operativo');

  return (
    <ObservableErrorBoundary fallbackTitle="Error al cargar dashboard">
      <SafeAreaView style={dashStyles.container} edges={['top']}>
        <View style={dashStyles.headerMain}>
          <View>
            <Text style={dashStyles.title}>Dashboard</Text>
            <View style={dashStyles.tabToggle}>
              <TouchableOpacity style={[dashStyles.tabBtn, activeTab === 'operativo' && dashStyles.tabBtnActive]} onPress={() => setActiveTab('operativo')}>
                <Text style={[dashStyles.tabText, activeTab === 'operativo' && dashStyles.tabTextActive]}>Operativo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[dashStyles.tabBtn, activeTab === 'economico' && dashStyles.tabBtnActive]} onPress={() => setActiveTab('economico')}>
                <Text style={[dashStyles.tabText, activeTab === 'economico' && dashStyles.tabTextActive]}>Económico</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Ionicons name="notifications-outline" size={24} color={colors.textSecondary} />
        </View>

        <DashboardWithData
          selectedLoteId={selectedLoteId}
          onSelectLote={setSelectedLoteId}
          activeTab={activeTab}
        />
      </SafeAreaView>
    </ObservableErrorBoundary>
  );
}

const dashStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: spacing.md },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: 'bold' },
  tabToggle: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 12, padding: 2, marginTop: 10, width: 200 },
  tabBtn: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 10 },
  tabBtnActive: { backgroundColor: colors.primary },
  tabText: { color: colors.textSecondary, fontSize: 12, fontWeight: 'bold' },
  tabTextActive: { color: colors.background },
  
  scrollContent: { paddingBottom: 120 },
  loteRow: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: 8 },
  loteChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  loteChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryAlpha },
  loteChipText: { color: colors.textSecondary, fontSize: 12 },
  loteChipTextActive: { color: colors.primary, fontWeight: 'bold' },

  seedBtn: {
    backgroundColor: colors.warning,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginHorizontal: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
    gap: 8,
  },
  seedBtnText: { color: 'white', fontWeight: 'heavy', fontSize: 11, letterSpacing: 1 },

  section: { paddingHorizontal: spacing.md, marginBottom: spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: 'bold' },
  gdpValue: { color: colors.primary, fontSize: 18, fontWeight: 'bold' },
  semaforoRow: { flexDirection: 'row', gap: 10 },

  manageBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primaryAlpha, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  manageBtnText: { color: colors.primary, fontSize: 10, fontWeight: 'bold' },
  finGrid: { flexDirection: 'row', gap: 10 },
  finCard: { flex: 1, backgroundColor: colors.surface, padding: 15, borderRadius: 16, borderWidth: 1 },
  finLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: 'bold' },
  finValue: { fontSize: 18, fontWeight: 'bold', marginTop: 4 },

  addBtnSmall: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 12 },
  txIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  txConcepto: { color: colors.textPrimary, fontWeight: 'bold', fontSize: 14 },
  txMeta: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  txMonto: { fontWeight: 'bold', fontSize: 15 },
});
