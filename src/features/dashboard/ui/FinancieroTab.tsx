import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import withObservables from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';
import { ObservableErrorBoundary } from '@shared/components/ObservableErrorBoundary';
import { EmptyState } from '@shared/components/EmptyState';
import { colors, spacing, typography } from '@theme/index';
import { database } from '@data/database/database';
import { BarChart, type BarChartMonth } from './BarChart';
import { TransactionListItem } from './TransactionListItem';
import { AddTransactionModal, type TransactionTipo } from './AddTransactionModal';
import { FinancialCategoryManagerModal } from './FinancialCategoryManagerModal';
import type MovimientoFinancieroModel from '@data/models/MovimientoFinancieroModel';
import type FinancialCategoryModel from '@data/models/FinancialCategoryModel';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FinancieroTabOuterProps {
  loteId: string | null;
}

interface FinancieroTabProps extends FinancieroTabOuterProps {
  transactions: MovimientoFinancieroModel[];
  financialCategories: FinancialCategoryModel[];
}

type FiltroTipo = 'TODOS' | 'INGRESO' | 'GASTO';

// ─── Default seed data ────────────────────────────────────────────────────────

const DEFAULT_CATEGORIES = [
  { name: 'Sanidad', type: 'EXPENSE', color: '#FF3D71' },
  { name: 'Nutrición', type: 'EXPENSE', color: '#FFAA00' },
  { name: 'Sueldos', type: 'EXPENSE', color: '#FF6B9D' },
  { name: 'Combustible', type: 'EXPENSE', color: '#8F9BB3' },
  { name: 'Alquiler', type: 'EXPENSE', color: '#C35BD0' },
  { name: 'Mantenimiento', type: 'EXPENSE', color: '#0095FF' },
  { name: 'Venta Hacienda', type: 'INCOME', color: '#00D68F' },
  { name: 'Venta Fardos', type: 'INCOME', color: '#4DFFC0' },
  { name: 'Subsidio', type: 'INCOME', color: '#00B4D8' },
] as const;

async function seedDefaultCategories(): Promise<void> {
  const existing = await database.get<FinancialCategoryModel>('financial_categories').query().fetchCount();
  if (existing > 0) return;

  await database.write(async () => {
    for (const cat of DEFAULT_CATEGORIES) {
      await database.get<FinancialCategoryModel>('financial_categories').create((c) => {
        c.name = cat.name;
        c.type = cat.type as 'INCOME' | 'EXPENSE';
        c.color = cat.color;
      });
    }
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function getLast6MonthsData(transactions: MovimientoFinancieroModel[]): BarChartMonth[] {
  const now = new Date();
  const months: BarChartMonth[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const label = MONTH_LABELS[month];

    const monthTransactions = transactions.filter((t) => {
      const td = new Date(t.fecha);
      return td.getFullYear() === year && td.getMonth() === month;
    });

    const ingresos = monthTransactions
      .filter((t) => t.tipo === 'INGRESO')
      .reduce((sum, t) => sum + t.monto, 0);

    const egresos = monthTransactions
      .filter((t) => t.tipo === 'GASTO')
      .reduce((sum, t) => sum + t.monto, 0);

    months.push({ label, ingresos, egresos });
  }

  return months;
}

function formatMonto(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function parseFechaText(text: string): number {
  const parts = text.split('/');
  if (parts.length !== 3) return Date.now();
  const [dd, mm, yyyy] = parts.map(Number);
  if (isNaN(dd) || isNaN(mm) || isNaN(yyyy)) return Date.now();
  const d = new Date(yyyy, mm - 1, dd);
  return isNaN(d.getTime()) ? Date.now() : d.getTime();
}

// ─── Inner View ───────────────────────────────────────────────────────────────

function FinancieroTabView({ transactions, financialCategories, loteId }: FinancieroTabProps) {
  const [filtro, setFiltro] = useState<FiltroTipo>('TODOS');
  const [modalVisible, setModalVisible] = useState(false);
  const [initialTipo, setInitialTipo] = useState<TransactionTipo>('INGRESO');
  const [categoriasModalVisible, setCategoriasModalVisible] = useState(false);

  // Seed categorías por defecto una sola vez si la tabla está vacía
  useEffect(() => {
    seedDefaultCategories().catch((err) =>
      console.warn('[FinancieroTab] seed error:', err)
    );
  }, []);

  // ── Métricas del mes actual ──────────────────────────────────────────────
  const { ingresosDelMes, egresosDelMes, balanceNeto } = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const mesActual = transactions.filter((t) => {
      const d = new Date(t.fecha);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });

    const ing = mesActual.filter((t) => t.tipo === 'INGRESO').reduce((s, t) => s + t.monto, 0);
    const eg = mesActual.filter((t) => t.tipo === 'GASTO').reduce((s, t) => s + t.monto, 0);
    return { ingresosDelMes: ing, egresosDelMes: eg, balanceNeto: ing - eg };
  }, [transactions]);

  // ── Datos 6 meses para BarChart ──────────────────────────────────────────
  const barData = useMemo(() => getLast6MonthsData(transactions), [transactions]);

  // ── Filtro por tipo ──────────────────────────────────────────────────────
  const transactionsFiltradas = useMemo(() => {
    if (filtro === 'TODOS') return transactions;
    return transactions.filter((t) => t.tipo === filtro);
  }, [transactions, filtro]);

  // ── FAB handler ───────────────────────────────────────────────────────────
  const handleFAB = () => {
    Alert.alert(
      'Nuevo movimiento',
      '¿Qué tipo de movimiento querés registrar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Ingreso',
          onPress: () => {
            setInitialTipo('INGRESO');
            setModalVisible(true);
          },
        },
        {
          text: 'Gasto',
          onPress: () => {
            setInitialTipo('GASTO');
            setModalVisible(true);
          },
        },
      ]
    );
  };

  // ── Save handler ──────────────────────────────────────────────────────────
  const handleSave = async (data: {
    tipo: TransactionTipo;
    monto: string;
    concepto: string;
    categoria: string;
    fechaText: string;
  }) => {
    const fechaNum = parseFechaText(data.fechaText);
    const fecha = fechaNum ? new Date(fechaNum) : new Date();
    await database.write(async () => {
      await database.get<MovimientoFinancieroModel>('movimientos_financieros').create((m) => {
        m.tipo = data.tipo;
        m.categoria = data.categoria;
        m.categoryId = data.categoria;
        m.monto = parseFloat(data.monto);
        m.fecha = fecha;
        m.descripcion = data.concepto;
        m.loteId = loteId ?? '';
      });
    });
    setModalVisible(false);
  };

  const balanceColor = balanceNeto >= 0 ? colors.primary : colors.error;
  const balancePrefix = balanceNeto >= 0 ? '+' : '';

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Sección 1: Resumen del mes ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mes actual</Text>
          <View style={styles.resumenRow}>
            {/* Ingresos */}
            <View style={[styles.resumenCard, { borderColor: colors.primary + '40' }]}>
              <View style={[styles.resumenIcon, { backgroundColor: colors.primaryAlpha }]}>
                <Ionicons name="arrow-up-circle-outline" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.resumenMonto, { color: colors.primary }]}>
                +{formatMonto(ingresosDelMes)}
              </Text>
              <Text style={styles.resumenLabel}>Ingresos</Text>
            </View>
            {/* Egresos */}
            <View style={[styles.resumenCard, { borderColor: colors.error + '40' }]}>
              <View style={[styles.resumenIcon, { backgroundColor: colors.errorAlpha }]}>
                <Ionicons name="arrow-down-circle-outline" size={20} color={colors.error} />
              </View>
              <Text style={[styles.resumenMonto, { color: colors.error }]}>
                -{formatMonto(egresosDelMes)}
              </Text>
              <Text style={styles.resumenLabel}>Egresos</Text>
            </View>
          </View>
          {/* Balance neto */}
          <View style={[styles.balanceRow, { borderColor: balanceColor + '30' }]}>
            <Text style={styles.balanceLabel}>Balance neto</Text>
            <Text style={[styles.balanceMonto, { color: balanceColor }]}>
              {balancePrefix}{formatMonto(Math.abs(balanceNeto))}
            </Text>
          </View>
        </View>

        {/* ── Sección 2: Gráfico 6 meses ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Balance últimos 6 meses</Text>
          <View style={styles.card}>
            <BarChart data={barData} maxBarHeight={100} />
          </View>
        </View>

        {/* ── Sección 3: Filtro rápido + gestionar categorías ── */}
        <View style={styles.section}>
          <View style={styles.filterRow}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
              style={styles.chipScroll}
            >
              {(['TODOS', 'INGRESOS', 'EGRESOS'] as const).map((f) => {
                const active = filtro === (f === 'INGRESOS' ? 'INGRESO' : f === 'EGRESOS' ? 'GASTO' : 'TODOS');
                return (
                  <TouchableOpacity
                    key={f}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                    onPress={() =>
                      setFiltro(f === 'INGRESOS' ? 'INGRESO' : f === 'EGRESOS' ? 'GASTO' : 'TODOS')
                    }
                  >
                    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                      {f}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={styles.gearBtn}
              onPress={() => setCategoriasModalVisible(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="settings-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Sección 4: Historial ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Historial</Text>
          {transactionsFiltradas.length === 0 ? (
            <EmptyState
              icon="💰"
              title="Sin movimientos"
              subtitle="Usá el botón + para registrar ingresos o gastos"
            />
          ) : (
            <View style={styles.listCard}>
              {transactionsFiltradas.map((t) => (
                <ObservableErrorBoundary key={t.id}>
                  <TransactionListItem transaction={t} />
                </ObservableErrorBoundary>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={handleFAB} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color={colors.textOnPrimary} />
      </TouchableOpacity>

      <AddTransactionModal
        visible={modalVisible}
        initialTipo={initialTipo}
        categories={financialCategories}
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
      />

      <FinancialCategoryManagerModal
        visible={categoriasModalVisible}
        onClose={() => setCategoriasModalVisible(false)}
        categories={financialCategories}
      />
    </>
  );
}

// ─── withObservables connector ────────────────────────────────────────────────

const FinancieroTabConnected = withObservables(
  ['loteId'],
  ({ loteId }: FinancieroTabOuterProps) => {
    const loteFilter = loteId ? [Q.where('lote_id', loteId)] : [];
    return {
      transactions: database
        .get<MovimientoFinancieroModel>('movimientos_financieros')
        .query(...loteFilter, Q.sortBy('fecha', Q.desc))
        .observe(),
      financialCategories: database
        .get<FinancialCategoryModel>('financial_categories')
        .query(Q.sortBy('name', Q.asc))
        .observe(),
    };
  }
)(FinancieroTabView);

// ─── Export ───────────────────────────────────────────────────────────────────

export function FinancieroTab({ loteId }: FinancieroTabOuterProps) {
  return (
    <ObservableErrorBoundary fallbackTitle="Error al cargar tab financiero">
      <FinancieroTabConnected loteId={loteId} />
    </ObservableErrorBoundary>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 100 }, // espacio para FAB
  section: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.sm,
  },
  resumenRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  resumenCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    gap: spacing.xs,
  },
  resumenIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumenMonto: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.heavy,
    fontVariant: ['tabular-nums'],
  },
  resumenLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
  },
  balanceLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  balanceMonto: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.heavy,
    fontVariant: ['tabular-nums'],
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  chipScroll: {
    flex: 1,
  },
  chipRow: {
    gap: spacing.xs,
  },
  gearBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryAlpha,
  },
  filterChipText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
  },
  filterChipTextActive: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  fab: {
    position: 'absolute',
    bottom: 80,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
