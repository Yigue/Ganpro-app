import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, FlatList, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import withObservables from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { EmptyState } from '@shared/components/EmptyState';
import { ObservableErrorBoundary } from '@shared/components/ObservableErrorBoundary';
import { colors, spacing, typography } from '@theme/index';
import { database } from '@data/database/database';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import type EventoModel from '@data/models/EventoModel';
import type LoteModel from '@data/models/LoteModel';
import type AnimalModel from '@data/models/AnimalModel';
import type TaskModel from '@data/models/TaskModel';
import type MovimientoFinancieroModel from '@data/models/MovimientoFinancieroModel';
import type { FinancialCategoryModel } from '@data/models/FinancialCategoryModel';

import { AddTransactionModal } from './ui/AddTransactionModal';
import { FinancialCategoryManagerModal } from './ui/FinancialCategoryManagerModal';
import { TaskCard } from './ui/TaskCard';
import { AddTaskModal } from './ui/AddTaskModal';

const { width } = Dimensions.get('window');

type DashTab = 'operativo' | 'economico';

// ── Componentes de UI ────────────────────────────────────────────────────────

const KPICard = ({ title, value, sub, icon, color }: any) => (
  <View style={[styles.kpiCard, { borderLeftColor: color, borderLeftWidth: 4 }]}>
    <View style={styles.kpiRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.kpiTitle}>{title}</Text>
        <Text style={[styles.kpiValue, { color }]}>{value}</Text>
      </View>
      <View style={[styles.kpiIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
    </View>
    <Text style={styles.kpiSub}>{sub}</Text>
  </View>
);

// ── Dashboard Principal ──────────────────────────────────────────────────────

function DashboardInner({
  pesajes, lotes, todosAnimales, animalesMuertos, transactions, financialCategories, tasks
}: any) {
  const [activeTab, setActiveTab] = useState<DashTab>('operativo');
  const [isTxModalVisible, setIsTxModalVisible] = useState(false);
  const [isTaskModalVisible, setIsTaskModalVisible] = useState(false);
  const [isCatModalVisible, setIsCatModalVisible] = useState(false);

  // Lógica de Stock por Categoría (Gráfico de Torta)
  const pieData = useMemo(() => {
    const counts: Record<string, number> = {};
    todosAnimales.forEach((a: any) => { counts[a.categoria] = (counts[a.categoria] ?? 0) + 1; });
    const COLORS = [colors.primary, colors.info, colors.warning, '#C35BD0', '#FFAA00'];
    return Object.entries(counts).map(([name, count], i) => ({
      name,
      population: count,
      color: COLORS[i % COLORS.length],
      legendFontColor: colors.textSecondary,
      legendFontSize: 10,
    }));
  }, [todosAnimales]);

  const totalIngresos = transactions.filter((t: any) => t.tipo === 'INGRESO').reduce((acc: number, t: any) => acc + t.monto, 0);
  const totalGastos = transactions.filter((t: any) => t.tipo === 'GASTO').reduce((acc: number, t: any) => acc + t.monto, 0);

  const toggleTask = async (task: TaskModel) => {
    await database.write(async () => {
      await task.update((t: any) => {
        t.status = t.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
      });
    });
  };

  const deleteTask = async (task: TaskModel) => {
    await database.write(async () => { await task.destroyPermanently(); });
  };

  return (
    <View style={styles.flex}>
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
              <KPICard title="Total Hacienda" value={todosAnimales.length} sub="Cabezas activas" icon="paw" color={colors.primary} />
              <KPICard title="Mortalidad" value={`${((animalesMuertos.length / (todosAnimales.length || 1)) * 100).toFixed(1)}%`} sub="Tasa histórica" icon="trending-down" color={colors.error} />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Distribución de Stock</Text>
              <View style={styles.chartBox}>
                <PieChart
                  data={pieData}
                  width={width - 40}
                  height={180}
                  chartConfig={{ color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})` }}
                  accessor={"population"}
                  backgroundColor={"transparent"}
                  paddingLeft={"15"}
                  center={[10, 0]}
                  absolute
                />
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Gestión de Tareas</Text>
                <TouchableOpacity onPress={() => setIsTaskModalVisible(true)}><Ionicons name="add-circle" size={24} color={colors.primary} /></TouchableOpacity>
              </View>
              {tasks.length === 0 ? (
                <EmptyState icon="list-outline" title="Sin tareas" subtitle="Agregá recordatorios para el personal" />
              ) : (
                tasks.map((t: any) => <TaskCard key={t.id} task={t} onToggleStatus={toggleTask} onDelete={deleteTask} />)
              )}
            </View>
          </>
        ) : (
          <>
            <View style={styles.kpiGrid}>
              <KPICard title="Ingresos" value={`$${totalIngresos.toLocaleString()}`} sub="Mes actual" icon="trending-up" color={colors.primary} />
              <KPICard title="Gastos" value={`$${totalGastos.toLocaleString()}`} sub="Mes actual" icon="trending-down" color={colors.error} />
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Flujo de Caja</Text>
                <TouchableOpacity style={styles.manageBtn} onPress={() => setIsCatModalVisible(true)}>
                  <Text style={styles.manageBtnText}>CATEGORÍAS</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.chartBox}>
                <LineChart
                  data={{
                    labels: ["Ene", "Feb", "Mar", "Abr", "May", "Jun"],
                    datasets: [{ data: [20, 45, 28, 80, 99, 43], color: () => colors.primary }, { data: [15, 30, 45, 50, 70, 60], color: () => colors.error }]
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
                  style={{ borderRadius: 16 }}
                />
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
                    <Text style={styles.txMeta}>{t.categoria} · {format(new Date(t.fecha), 'dd MMM')}</Text>
                  </View>
                  <Text style={[styles.txMonto, { color: t.tipo === 'INGRESO' ? colors.primary : colors.error }]}>
                    {t.tipo === 'INGRESO' ? '+' : '-'}${t.monto.toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <AddTransactionModal visible={isTxModalVisible} categories={financialCategories} onClose={() => setIsTxModalVisible(false)} onSave={async (data) => {
        await database.write(async () => {
          await database.get('movimientos_financieros').create((m: any) => {
            m.tipo = data.tipo; m.categoria = data.categoria; m.monto = parseFloat(data.monto); m.fecha = Date.now(); m.descripcion = data.concepto;
          });
        });
        setIsTxModalVisible(false);
      }} />

      <FinancialCategoryManagerModal visible={isCatModalVisible} categories={financialCategories} onClose={() => setIsCatModalVisible(false)} />
      
      <AddTaskModal visible={isTaskModalVisible} onClose={() => setIsTaskModalVisible(false)} onSave={async (data) => {
        await database.write(async () => {
          await database.get('tasks').create((t: any) => {
            t.title = data.title; t.priority = data.priority; t.dueDate = data.dueDate; t.status = 'PENDING';
          });
        });
        setIsTaskModalVisible(false);
      }} />
    </View>
  );
}

const DashboardWithData = withObservables([], () => ({
  todosAnimales: database.get<AnimalModel>('animals').query(Q.where('estado', 'ACTIVO')).observe(),
  animalesMuertos: database.get<AnimalModel>('animals').query(Q.where('estado', 'MUERTO')).observe(),
  transactions: database.get<MovimientoFinancieroModel>('movimientos_financieros').query(Q.sortBy('fecha', Q.desc), Q.take(10)).observe(),
  financialCategories: database.get<FinancialCategoryModel>('financial_categories').query().observe(),
  tasks: database.get<TaskModel>('tasks').query(Q.sortBy('created_at', Q.desc)).observe(),
}))(DashboardInner);

export function DashboardScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerMain}>
        <Text style={styles.title}>GanPro Dash</Text>
        <Ionicons name="notifications-outline" size={24} color={colors.textSecondary} />
      </View>
      <ObservableErrorBoundary fallbackTitle="Error en Dashboard">
        <DashboardWithData />
      </ObservableErrorBoundary>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  headerMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: 'bold' },
  tabBar: { flexDirection: 'row', backgroundColor: colors.surface, marginHorizontal: spacing.md, borderRadius: 12, padding: 4, marginBottom: spacing.md },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  tabBtnActive: { backgroundColor: colors.primary },
  tabText: { color: colors.textSecondary, fontSize: 12, fontWeight: 'bold' },
  tabTextActive: { color: colors.background },
  scrollContent: { paddingBottom: 100 },
  kpiGrid: { flexDirection: 'row', gap: 12, paddingHorizontal: spacing.md, marginBottom: 20 },
  kpiCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: colors.border },
  kpiRow: { flexDirection: 'row', justifyContent: 'space-between' },
  kpiTitle: { color: colors.textSecondary, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  kpiValue: { fontSize: 20, fontWeight: 'heavy', marginTop: 4 },
  kpiIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  kpiSub: { color: colors.textDisabled, fontSize: 9, marginTop: 8 },
  section: { paddingHorizontal: spacing.md, marginBottom: 25 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: 'bold' },
  chartBox: { backgroundColor: colors.surface, borderRadius: 24, padding: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  manageBtn: { backgroundColor: colors.primaryAlpha, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  manageBtnText: { color: colors.primary, fontSize: 10, fontWeight: 'heavy' },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 12 },
  txIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  txConcepto: { color: colors.textPrimary, fontWeight: 'bold', fontSize: 14 },
  txMeta: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  txMonto: { fontWeight: 'bold', fontSize: 14 },
});
