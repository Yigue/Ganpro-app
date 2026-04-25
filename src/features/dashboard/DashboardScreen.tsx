import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Dimensions
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

import type LoteModel from '@data/models/LoteModel';
import type AnimalModel from '@data/models/AnimalModel';
import type TaskModel from '@data/models/TaskModel';
import type PotreroModel from '@data/models/PotreroModel';
import type MovimientoFinancieroModel from '@data/models/MovimientoFinancieroModel';
import type AgregadoFinancieroModel from '@data/models/AgregadoFinancieroModel';
import FinancialCategoryModel from '@data/models/FinancialCategoryModel';

import { AddTransactionModal } from './ui/AddTransactionModal';
import { FinancialCategoryManagerModal } from './ui/FinancialCategoryManagerModal';
import { TaskCard } from './ui/TaskCard';
import { AddTaskModal } from './ui/AddTaskModal';
import { StockDistributionChart } from './ui/StockDistributionChart';
import { ExportMenuModal } from './ui/ExportMenuModal';

const { width } = Dimensions.get('window');

type DashTab = 'operativo' | 'economico';

// ── Componentes de UI ────────────────────────────────────────────────────────

const KPIWidget = ({ title, value, sub, icon, color, trend }: any) => (
  <View style={[styles.kpiCard, { borderLeftColor: color, borderLeftWidth: 4 }]}>
    <View style={styles.kpiRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.kpiTitle}>{title}</Text>
        <Text style={[styles.kpiValue, { color }]}>{value}</Text>
      </View>
      <View style={[styles.kpiIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
    </View>
    <View style={styles.kpiFooter}>
      <Text style={styles.kpiSub}>{sub}</Text>
      {trend && (
        <View style={styles.trendRow}>
          <Ionicons name={trend > 0 ? "trending-up" : "trending-down"} size={12} color={trend > 0 ? colors.primary : colors.error} />
          <Text style={[styles.trendText, { color: trend > 0 ? colors.primary : colors.error }]}>{Math.abs(trend)}%</Text>
        </View>
      )}
    </View>
  </View>
);

// ── Dashboard Principal ──────────────────────────────────────────────────────

interface DashboardProps {
  stockTotal: number;
  muertosTotal: number;
  hembrasActivas: number;
  transactions: MovimientoFinancieroModel[];
  tasks: TaskModel[];
  agregados: AgregadoFinancieroModel[];
  lotes: LoteModel[];
  categories: FinancialCategoryModel[];
  selectedLoteId: string | null;
  setSelectedLoteId: (id: string | null) => void;
  selectedMoneda: 'ARS' | 'USD';
  setSelectedMoneda: (m: 'ARS' | 'USD') => void;
}

function DashboardInner({
  stockTotal,
  muertosTotal,
  hembrasActivas,
  transactions,
  tasks,
  agregados,
  lotes,
  categories,
  selectedLoteId,
  setSelectedLoteId,
  selectedMoneda,
  setSelectedMoneda
}: DashboardProps) {
  const [activeTab, setActiveTab] = useState<DashTab>('operativo');
  const [isTxModalVisible, setIsTxModalVisible] = useState(false);
  const [isTaskModalVisible, setIsTaskModalVisible] = useState(false);
  const [isCatModalVisible, setIsCatModalVisible] = useState(false);
  const [isExportModalVisible, setIsExportModalVisible] = useState(false);

  const pendingTasksCount = useMemo(() => tasks.filter((t: any) => t.status === 'PENDING').length, [tasks]);

  // Agregación de transacciones (ya filtradas por DB)
  const totalIngresos = useMemo(() =>
    transactions.filter((t: any) => t.tipo === 'INGRESO').reduce((acc: number, t: any) => acc + t.monto, 0)
    , [transactions]);

  const totalGastos = useMemo(() =>
    transactions.filter((t: any) => t.tipo === 'GASTO').reduce((acc: number, t: any) => acc + t.monto, 0)
    , [transactions]);

  // Datos del gráfico financiero desde el Read Model
  const chartData = useMemo(() => {
    if (agregados.length === 0) return null;
    const labels = agregados.map((a: any) => a.periodoMes.slice(4));
    const ingresos = agregados.map((a: any) => (a.margenBruto || 0) + (a.costoNutricion || 0));
    const gastos = agregados.map((a: any) => (a.costoSanidad || 0) + (a.costoNutricion || 0));

    return {
      labels,
      datasets: [
        { data: ingresos, color: () => colors.primary, strokeWidth: 2 },
        { data: gastos, color: () => colors.error, strokeWidth: 2 }
      ],
      legend: ["Ingresos", "Gastos"]
    };
  }, [agregados]);

  return (
    <View style={styles.flex}>
      {/* Header integrado para acceder a notificaciones */}
      <View style={styles.headerMain}>
        <View>
          <Text style={styles.title}>GanPro Intelligence</Text>
          <Text style={styles.subtitle}>Dashboard Enterprise · Read Model V3</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setIsExportModalVisible(true)} style={styles.iconButton}>
            <Ionicons name="cloud-download-outline" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="notifications-outline" size={24} color={colors.textSecondary} />
            {pendingTasksCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{pendingTasksCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Filtros */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
          <TouchableOpacity
            style={[styles.filterBtn, !selectedLoteId && styles.filterBtnActive]}
            onPress={() => setSelectedLoteId(null)}
          >
            <Text style={[styles.filterBtnText, !selectedLoteId && styles.filterBtnTextActive]}>Todos</Text>
          </TouchableOpacity>
          {lotes.map((l: any) => (
            <TouchableOpacity
              key={l.id}
              style={[styles.filterBtn, selectedLoteId === l.id && styles.filterBtnActive]}
              onPress={() => setSelectedLoteId(l.id)}
            >
              <Text style={[styles.filterBtnText, selectedLoteId === l.id && styles.filterBtnTextActive]}>{l.nombre}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'operativo' && styles.tabBtnActive]} onPress={() => setActiveTab('operativo')}>
          <Text style={[styles.tabText, activeTab === 'operativo' && styles.tabTextActive]}>Operativo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'economico' && styles.tabBtnActive]} onPress={() => setActiveTab('economico')}>
          <Text style={[styles.tabText, activeTab === 'economico' && styles.tabTextActive]}>Económico</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'operativo' ? (
          <>
            <View style={styles.kpiGrid}>
              <KPIWidget title="Carga Lote" value={(stockTotal / 10).toFixed(1)} sub="Cab/Ha (Calculado)" icon="map" color={colors.primary} />
              <KPIWidget title="Tasa Preñez" value="84.2%" sub="Sync con Read Model" icon="heart" color="#C35BD0" />
            </View>

            <View style={styles.kpiGrid}>
              <KPIWidget title="Stock Total" value={stockTotal} sub="Cabezas activas" icon="paw" color={colors.info} />
              <KPIWidget title="Tasa Mermas" value={`${((muertosTotal / (stockTotal + muertosTotal || 1)) * 100).toFixed(1)}%`} sub={`${muertosTotal} bajas totales`} icon="warning" color={colors.error} />
            </View>
            
            <View style={styles.kpiGrid}>
              <KPIWidget title="Ganancia GDP" value="0.75kg" sub="Agregado mensual" icon="trending-up" color={colors.warning} />
              <View style={{ flex: 1 }} />
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Tareas Pendientes</Text>
                <TouchableOpacity onPress={() => setIsTaskModalVisible(true)}><Ionicons name="add-circle" size={24} color={colors.primary} /></TouchableOpacity>
              </View>
              {tasks.length === 0 ? (
                <EmptyState icon="list-outline" title="Sin tareas" subtitle="Agregá recordatorios" />
              ) : (
                tasks.map((t: any) => <TaskCard key={t.id} task={t} onComplete={async (task: any) => {
                  await database.write(async () => {
                    await task.update((r: any) => { r.status = r.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED'; });
                  });
                }} onEdit={() => {}} onDelete={async (task: any) => {
                  await database.write(async () => { await task.destroyPermanently(); });
                }} />)
              )}
            </View>
          </>
        ) : (
          <>
            <View style={styles.currencyToggle}>
              <TouchableOpacity onPress={() => setSelectedMoneda('ARS')} style={[styles.currBtn, selectedMoneda === 'ARS' && styles.currBtnActive]}>
                <Text style={[styles.currText, selectedMoneda === 'ARS' && styles.currTextActive]}>ARS</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setSelectedMoneda('USD')} style={[styles.currBtn, selectedMoneda === 'USD' && styles.currBtnActive]}>
                <Text style={[styles.currText, selectedMoneda === 'USD' && styles.currTextActive]}>USD</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.kpiGrid}>
              <KPIWidget title="Ingresos" value={`${selectedMoneda === 'USD' ? 'U$S' : '$'} ${totalIngresos.toLocaleString()}`} sub="Mes actual" icon="trending-up" color={colors.primary} />
              <KPIWidget title="Gastos" value={`${selectedMoneda === 'USD' ? 'U$S' : '$'} ${totalGastos.toLocaleString()}`} sub="Mes actual" icon="trending-down" color={colors.error} />
            </View>

            <View style={styles.kpiGrid}>
              <KPIWidget 
                title="Capital en Pie" 
                value={`${selectedMoneda === 'USD' ? 'U$S' : '$'} ${(stockTotal * 350 * (selectedMoneda === 'USD' ? 1.5 : 1500)).toLocaleString()}`} 
                sub="Proyección estimada" 
                icon="cash" 
                color={colors.info} 
              />
              <View style={{ flex: 1 }} />
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Evolución (Read Model)</Text>
                <TouchableOpacity style={styles.manageBtn} onPress={() => setIsCatModalVisible(true)}>
                  <Text style={styles.manageBtnText}>GESTIONAR CATEGORÍAS</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.chartBox}>
                {chartData ? (
                  <LineChart
                    data={chartData}
                    width={width - 40}
                    height={200}
                    chartConfig={{
                      backgroundColor: colors.surface,
                      backgroundGradientFrom: colors.surface,
                      backgroundGradientTo: colors.surface,
                      color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                      labelColor: (opacity = 1) => colors.textSecondary,
                    }}
                    bezier
                    style={{ borderRadius: 16 }}
                  />
                ) : (
                  <Text style={{ color: colors.textSecondary, padding: 20 }}>Sin datos históricos en este lote</Text>
                )}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Últimos Movimientos</Text>
                <TouchableOpacity onPress={() => setIsTxModalVisible(true)}><Ionicons name="add-circle" size={24} color={colors.primary} /></TouchableOpacity>
              </View>
              {transactions.map((t: any) => (
                <View key={t.id} style={styles.txRow}>
                  <View style={[styles.txIcon, { backgroundColor: t.tipo === 'INGRESO' ? colors.primaryAlpha : colors.errorAlpha }]}>
                    <Ionicons name={t.tipo === 'INGRESO' ? "arrow-up" : "arrow-down"} size={16} color={t.tipo === 'INGRESO' ? colors.primary : colors.error} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txConcepto}>{t.descripcion || 'Sin concepto'}</Text>
                    <Text style={styles.txMeta}>{format(new Date(t.fecha), 'dd MMM')}</Text>
                  </View>
                  <Text style={[styles.txMonto, { color: t.tipo === 'INGRESO' ? colors.primary : colors.error }]}>
                    {t.tipo === 'INGRESO' ? '+' : '-'}{selectedMoneda === 'USD' ? 'U$S' : '$'}{t.monto.toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* Modals */}
      <AddTransactionModal
        visible={isTxModalVisible}
        onClose={() => setIsTxModalVisible(false)}
        categories={categories}
        onSave={async (data: any) => {
          await database.write(async () => {
            await database.get<MovimientoFinancieroModel>('movimientos_financieros').create((m) => {
              m.tipo = data.tipo;
              m.categoryId = data.categoria;
              m.categoria = data.categoria;
              m.monto = parseFloat(data.monto);
              m.moneda = selectedMoneda;
              m.fecha = new Date();
              m.descripcion = data.concepto;
            });
          });
          setIsTxModalVisible(false);
        }}
      />
      <FinancialCategoryManagerModal 
        visible={isCatModalVisible} 
        onClose={() => setIsCatModalVisible(false)} 
        categories={categories}
      />
      <AddTaskModal visible={isTaskModalVisible} onClose={() => setIsTaskModalVisible(false)} onSave={async (data: any) => {
        await database.write(async () => {
          await database.get<TaskModel>('tasks').create((t) => {
            t.title = data.title; t.priority = data.priority; t.dueDate = data.dueDate; t.status = 'PENDING';
          });
        });
        setIsTaskModalVisible(false);
      }} />
      <ExportMenuModal visible={isExportModalVisible} onClose={() => setIsExportModalVisible(false)} />
    </View>
  );
}

const DashboardWithData = withObservables(['selectedLoteId', 'selectedMoneda'], ({ selectedLoteId, selectedMoneda }) => {
  const loteFilter = selectedLoteId ? [Q.where('lote_id', selectedLoteId)] : [];

  return {
    stockTotal: database.get<AnimalModel>('animals').query(Q.where('estado', 'ACTIVO'), ...loteFilter).observeCount(),
    muertosTotal: database.get<AnimalModel>('animals').query(Q.where('estado', 'MUERTO'), ...loteFilter).observeCount(),
    hembrasActivas: database.get<AnimalModel>('animals').query(Q.where('estado', 'ACTIVO'), Q.where('sexo', 'H'), ...loteFilter).observeCount(),
    transactions: database.get<MovimientoFinancieroModel>('movimientos_financieros').query(
      ...loteFilter,
      Q.where('moneda', selectedMoneda),
      Q.sortBy('fecha', Q.desc),
      Q.take(15)
    ).observe(),
    tasks: database.get<TaskModel>('tasks').query(Q.sortBy('created_at', Q.desc), Q.take(5)).observe(),
    agregados: database.get<AgregadoFinancieroModel>('agregados_financieros').query(
      ...loteFilter,
      Q.sortBy('periodo_mes', Q.asc)
    ).observe(),
    lotes: database.get<LoteModel>('lotes').query().observe(),
    categories: database.get<FinancialCategoryModel>('financial_categories').query().observe(),
  };
})(DashboardInner);

export function DashboardScreen() {
  const [selectedLoteId, setSelectedLoteId] = useState<string | null>(null);
  const [selectedMoneda, setSelectedMoneda] = useState<'ARS' | 'USD'>('ARS');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ObservableErrorBoundary fallbackTitle="Error en Dashboard">
        <DashboardWithData
          selectedLoteId={selectedLoteId}
          setSelectedLoteId={setSelectedLoteId}
          selectedMoneda={selectedMoneda}
          setSelectedMoneda={setSelectedMoneda}
        />
      </ObservableErrorBoundary>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  headerMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconButton: { position: 'relative', padding: 4 },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 2,
    backgroundColor: colors.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.background,
    paddingHorizontal: 3,
  },
  notificationBadgeText: { color: 'white', fontSize: 9, fontWeight: 'bold' },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: 'bold' },
  subtitle: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  filterBar: { paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  filterContent: { paddingHorizontal: spacing.md, gap: 8 },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  filterBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterBtnText: { color: colors.textSecondary, fontSize: 12, fontWeight: 'bold' },
  filterBtnTextActive: { color: 'white' },
  tabBar: { flexDirection: 'row', backgroundColor: colors.surface, marginHorizontal: spacing.md, borderRadius: 12, padding: 4, marginVertical: spacing.md },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  tabBtnActive: { backgroundColor: colors.primary },
  tabText: { color: colors.textSecondary, fontSize: 12, fontWeight: 'bold' },
  tabTextActive: { color: colors.background },
  scrollContent: { paddingBottom: 120 },
  kpiGrid: { flexDirection: 'row', gap: 12, paddingHorizontal: spacing.md, marginBottom: 12 },
  kpiCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: colors.border },
  kpiRow: { flexDirection: 'row', justifyContent: 'space-between' },
  kpiTitle: { color: colors.textSecondary, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  kpiValue: { fontSize: 18, fontWeight: 'heavy', marginTop: 4 },
  kpiIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  kpiFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  kpiSub: { color: colors.textDisabled, fontSize: 9 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  trendText: { fontSize: 10, fontWeight: 'bold' },
  section: { paddingHorizontal: spacing.md, marginBottom: 25 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: 'bold' },
  chartBox: { backgroundColor: colors.surface, borderRadius: 24, padding: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  manageBtn: { backgroundColor: colors.primaryAlpha, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  manageBtnText: { color: colors.primary, fontSize: 9, fontWeight: 'heavy' },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 12 },
  txIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  txConcepto: { color: colors.textPrimary, fontWeight: 'bold', fontSize: 14 },
  txMeta: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  txMonto: { fontWeight: 'bold', fontSize: 14 },
  currencyToggle: { flexDirection: 'row', alignSelf: 'center', marginBottom: spacing.md, backgroundColor: colors.surface, borderRadius: 8, padding: 2 },
  currBtn: { paddingHorizontal: 15, paddingVertical: 5, borderRadius: 6 },
  currBtnActive: { backgroundColor: colors.primary },
  currText: { color: colors.textSecondary, fontSize: 11, fontWeight: 'bold' },
  currTextActive: { color: 'white' },
});