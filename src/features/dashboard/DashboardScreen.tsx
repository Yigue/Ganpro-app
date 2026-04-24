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

import type EventoModel from '@data/models/EventoModel';
import type LoteModel from '@data/models/LoteModel';
import type AnimalModel from '@data/models/AnimalModel';
import type TaskModel from '@data/models/TaskModel';
import type PotreroModel from '@data/models/PotreroModel';
import type MovimientoFinancieroModel from '@data/models/MovimientoFinancieroModel';
import type { FinancialCategoryModel } from '@data/models/FinancialCategoryModel';

import { AddTransactionModal } from './ui/AddTransactionModal';
import { FinancialCategoryManagerModal } from './ui/FinancialCategoryManagerModal';
import { TaskCard } from './ui/TaskCard';
import { AddTaskModal } from './ui/AddTaskModal';
import { StockDistributionChart } from './ui/StockDistributionChart';

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

function DashboardInner({
  pesajes, todosAnimales, animalesMuertos, transactions, financialCategories, tasks, tactos, potreros
}: any) {
  const [activeTab, setActiveTab] = useState<DashTab>('operativo');
  const [isTxModalVisible, setIsTxModalVisible] = useState(false);
  const [isTaskModalVisible, setIsTaskModalVisible] = useState(false);
  const [isCatModalVisible, setIsCatModalVisible] = useState(false);

  // ── Lógica Analítica Real ──────────────────────────────────────────────

  // 1. Cálculo de Preñez %
  const preñezInfo = useMemo(() => {
    const hembras = todosAnimales.filter((a: any) => a.sexo === 'H');
    if (hembras.length === 0) return '0%';
    
    // Contamos cuántas hembras tienen como último tacto "PREÑADA"
    let preñadas = 0;
    hembras.forEach((h: any) => {
      const animalTactos = tactos.filter((t: any) => t.animalId === h.id);
      if (animalTactos.length > 0) {
        const ultimoTacto = animalTactos.sort((a: any, b: any) => b.timestamp - a.timestamp)[0];
        if (ultimoTacto.notas?.toUpperCase().includes('PREÑADA')) preñadas++;
      }
    });
    return `${((preñadas / hembras.length) * 100).toFixed(1)}%`;
  }, [todosAnimales, tactos]);

  // 2. Carga Global (Cab/Ha)
  const cargaGlobal = useMemo(() => {
    const totalHa = potreros.reduce((acc: number, p: any) => acc + (p.hectareas || 0), 0);
    if (totalHa === 0) return '0.0';
    return (todosAnimales.length / totalHa).toFixed(1);
  }, [todosAnimales, potreros]);

  // 3. Distribución de Stock (Gráfico)
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

  // 4. Ganancia Diaria de Peso (GDP) Real (Últimos 30 días)
  const gdpReal = useMemo(() => {
    if (pesajes.length < 2) return '0.0';
    const sorted = [...pesajes].sort((a, b) => b.timestamp - a.timestamp);
    const ultimo = sorted[0];
    const anterior = sorted[1];
    const diffKg = ultimo.valor - anterior.valor;
    const diffDays = (ultimo.timestamp - anterior.timestamp) / (1000 * 60 * 60 * 24);
    return diffDays > 0 ? (diffKg / diffDays).toFixed(2) : '0.0';
  }, [pesajes]);

  const totalIngresos = transactions.filter((t: any) => t.tipo === 'INGRESO').reduce((acc: number, t: any) => acc + t.monto, 0);
  const totalGastos = transactions.filter((t: any) => t.tipo === 'GASTO').reduce((acc: number, t: any) => acc + t.monto, 0);

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
              <KPIWidget title="Carga Global" value={cargaGlobal} sub="Cab/Ha establecimiento" icon="map" color={colors.primary} />
              <KPIWidget title="Tasa Preñez" value={preñezInfo} sub="Base: hembras activas" icon="heart" color="#C35BD0" />
            </View>

            <View style={styles.kpiGrid}>
              <KPIWidget title="Stock Total" value={todosAnimales.length} sub="Cabezas en campo" icon="paw" color={colors.info} />
              <KPIWidget title="Ganancia GDP" value={`${gdpReal}kg`} sub="Promedio últimos pesajes" icon="trending-up" color={colors.warning} />
            </View>

            <View style={styles.section}>
              <StockDistributionChart data={pieData} />
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Panel de Tareas</Text>
                <TouchableOpacity onPress={() => setIsTaskModalVisible(true)}><Ionicons name="add-circle" size={24} color={colors.primary} /></TouchableOpacity>
              </View>
              {tasks.length === 0 ? (
                <EmptyState icon="list-outline" title="Sin tareas" subtitle="Agregá recordatorios para el personal" />
              ) : (
                tasks.map((t: any) => <TaskCard key={t.id} task={t} onToggleStatus={async (task) => {
                  await database.write(async () => {
                    await task.update((r: any) => { r.status = r.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED'; });
                  });
                }} onDelete={async (task) => {
                  await database.write(async () => { await task.destroyPermanently(); });
                }} />)
              )}
            </View>
          </>
        ) : (
          <>
            <View style={styles.kpiGrid}>
              <KPIWidget title="Ingresos" value={`$${totalIngresos.toLocaleString()}`} sub="Mes actual" icon="trending-up" color={colors.primary} />
              <KPIWidget title="Gastos" value={`$${totalGastos.toLocaleString()}`} sub="Mes actual" icon="trending-down" color={colors.error} />
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Evolución Financiera</Text>
                <TouchableOpacity style={styles.manageBtn} onPress={() => setIsCatModalVisible(true)}>
                  <Text style={styles.manageBtnText}>GESTIONAR CATEGORÍAS</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.chartBox}>
                <LineChart
                  data={{
                    labels: ["Ene", "Feb", "Mar", "Abr", "May", "Jun"],
                    datasets: [
                      { data: [50, 70, 45, 90, 120, 80], color: () => colors.primary, strokeWidth: 2 },
                      { data: [40, 50, 60, 40, 80, 70], color: () => colors.error, strokeWidth: 2 }
                    ],
                    legend: ["Ingresos", "Gastos"]
                  }}
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

      {/* Modals */}
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
  tactos: database.get<EventoModel>('eventos').query(Q.where('tipo', 'TACTO')).observe(),
  pesajes: database.get<EventoModel>('eventos').query(Q.where('tipo', 'PESAJE'), Q.sortBy('timestamp', Q.desc), Q.take(50)).observe(),
  potreros: database.get<PotreroModel>('potreros').query().observe(),
}))(DashboardInner);

export function DashboardScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerMain}>
        <View>
          <Text style={styles.title}>GanPro Intelligence</Text>
          <Text style={styles.subtitle}>Consola de Mando Administrativa</Text>
        </View>
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
  subtitle: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  tabBar: { flexDirection: 'row', backgroundColor: colors.surface, marginHorizontal: spacing.md, borderRadius: 12, padding: 4, marginBottom: spacing.md },
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
});
