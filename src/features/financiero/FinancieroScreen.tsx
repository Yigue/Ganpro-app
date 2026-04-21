import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import withObservables from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { EmptyState } from '@shared/components/EmptyState';
import { ObservableErrorBoundary } from '@shared/components/ObservableErrorBoundary';
import { Button } from '@shared/components/Button';
import { TrendBadge } from '@shared/components/TrendBadge';
import { colors, spacing, typography } from '@theme/index';
import { database } from '@data/database/database';
import { useDatabase } from '@shared/hooks/useDatabase';
import { useHapticFeedback } from '@shared/hooks/useHapticFeedback';
import { FinancieroRepository } from '@data/repositories/FinancieroRepository';
import {
  TIPO_MOVIMIENTO,
  CATEGORIA_MOVIMIENTO,
} from '@core/constants/sanidad';
import type MovimientoFinancieroModel from '@data/models/MovimientoFinancieroModel';
import type PrecioMercadoModel from '@data/models/PrecioMercadoModel';

const CATEGORIA_META: Record<string, { icon: string; color: string }> = {
  SANIDAD: { icon: '💉', color: colors.warning },
  NUTRICION: { icon: '🌾', color: colors.primary },
  ALQUILER: { icon: '🏡', color: colors.info },
  VENTA: { icon: '💰', color: colors.primary },
  COMPRA: { icon: '🛒', color: '#C35BD0' },
  OTRO: { icon: '📋', color: colors.textSecondary },
};

const FILTER_OPTIONS = [null, ...Object.keys(CATEGORIA_MOVIMIENTO)] as (string | null)[];

// ── Inner Component ──────────────────────────────────────────────────────────

interface FinancieroOuterProps {
  filterCategoria: string | null;
  onFilterChange: (c: string | null) => void;
  onAdd: () => void;
  onEditPrecios: () => void;
  refreshing: boolean;
  onRefresh: () => void;
}

interface FinancieroProps extends FinancieroOuterProps {
  movimientos: MovimientoFinancieroModel[];
  ultimoPrecio: PrecioMercadoModel[];
}

function FinancieroInner({ movimientos, ultimoPrecio, filterCategoria, onFilterChange, onAdd, onEditPrecios, refreshing, onRefresh }: FinancieroProps) {
  const precio = ultimoPrecio[0];

  const gastos = movimientos.filter((m) => m.tipo === TIPO_MOVIMIENTO.GASTO);
  const ingresos = movimientos.filter((m) => m.tipo === TIPO_MOVIMIENTO.INGRESO);
  const totalGastos = gastos.reduce((s, m) => s + m.monto, 0);
  const totalIngresos = ingresos.reduce((s, m) => s + m.monto, 0);
  const balance = totalIngresos - totalGastos;

  return (
    <>
      {/* Summary cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, styles.summaryGasto]}>
          <Text style={styles.summaryAmount}>${totalGastos.toLocaleString('es-AR')}</Text>
          <Text style={styles.summaryLabel}>Gastos</Text>
          <TrendBadge value={0} />
        </View>
        <View style={[styles.summaryCard, styles.summaryIngreso]}>
          <Text style={[styles.summaryAmount, { color: colors.primary }]}>${totalIngresos.toLocaleString('es-AR')}</Text>
          <Text style={styles.summaryLabel}>Ingresos</Text>
          <TrendBadge value={0} />
        </View>
        <View style={[styles.summaryCard, { borderColor: balance >= 0 ? colors.primary : colors.error }]}>
          <Text style={[styles.summaryAmount, { color: balance >= 0 ? colors.primary : colors.error }]}>
            ${Math.abs(balance).toLocaleString('es-AR')}
          </Text>
          <Text style={styles.summaryLabel}>{balance >= 0 ? 'Superávit' : 'Déficit'}</Text>
          <TrendBadge value={balance >= 0 ? 0 : 0} />
        </View>
      </View>

      {/* Precio de mercado */}
      <TouchableOpacity style={styles.precioCard} onPress={onEditPrecios} activeOpacity={0.8}>
        <View style={styles.precioInfo}>
          <Text style={styles.precioTitle}>Precios de Mercado</Text>
          {precio ? (
            <Text style={styles.precioValue}>
              Novillo: ${precio.novilloKg}/kg · Ternero: ${precio.terneroKg}/kg
            </Text>
          ) : (
            <Text style={styles.precioEmpty}>Tocá para cargar precios actuales</Text>
          )}
        </View>
        <Text style={styles.precioEdit}>✏️</Text>
      </TouchableOpacity>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {FILTER_OPTIONS.map((cat) => {
          const meta = cat ? CATEGORIA_META[cat] : null;
          return (
            <TouchableOpacity
              key={cat ?? 'all'}
              style={[styles.filterChip, filterCategoria === cat && styles.filterChipActive]}
              onPress={() => onFilterChange(cat)}
            >
              {meta && <Text style={styles.filterChipIcon}>{meta.icon}</Text>}
              <Text style={[styles.filterChipText, filterCategoria === cat && styles.filterChipTextActive]}>
                {cat ?? 'Todos'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* List */}
      {movimientos.length === 0 ? (
        <EmptyState icon="💸" title="Sin movimientos" subtitle="Registrá gastos e ingresos" />
      ) : (
        <FlatList
          data={movimientos}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => (
            <ObservableErrorBoundary key={item.id}>
              <MovimientoItem mov={item} />
            </ObservableErrorBoundary>
          )}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={onAdd} activeOpacity={0.85}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </>
  );
}

const FinancieroWithData = withObservables(
  ['filterCategoria', 'refreshing', 'onRefresh'],
  ({ filterCategoria }: FinancieroOuterProps) => ({
    movimientos: (filterCategoria
      ? database
          .get<MovimientoFinancieroModel>('movimientos_financieros')
          .query(Q.where('categoria', filterCategoria), Q.sortBy('fecha', Q.desc), Q.take(100))
      : database
          .get<MovimientoFinancieroModel>('movimientos_financieros')
          .query(Q.sortBy('fecha', Q.desc), Q.take(100))
    ).observe(),
    ultimoPrecio: database
      .get<PrecioMercadoModel>('precios_mercado')
      .query(Q.sortBy('fecha', Q.desc), Q.take(1))
      .observe(),
  })
)(FinancieroInner);

function MovimientoItem({ mov }: { mov: MovimientoFinancieroModel }) {
  const meta = CATEGORIA_META[mov.categoria] ?? CATEGORIA_META.OTRO;
  const isGasto = mov.tipo === TIPO_MOVIMIENTO.GASTO;
  return (
    <View style={styles.movItem}>
      <View style={[styles.movIconCircle, { backgroundColor: `${meta.color}20` }]}>
        <Text style={styles.movIcon}>{meta.icon}</Text>
      </View>
      <View style={styles.movInfo}>
        <Text style={styles.movDesc}>{mov.descripcion || mov.categoria}</Text>
        <Text style={styles.movDate}>{new Date(mov.fecha).toLocaleDateString('es-AR')}</Text>
      </View>
      <Text style={[styles.movMonto, { color: isGasto ? colors.error : colors.primary }]}>
        {isGasto ? '-' : '+'}${mov.monto.toLocaleString('es-AR')}
      </Text>
    </View>
  );
}

// ── Gasto Form Modal ──────────────────────────────────────────────────────────

function GastoFormModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['75%', '95%'], []);
  const db = useDatabase();
  const { triggerSuccess } = useHapticFeedback();

  const [tipo, setTipo] = useState<'GASTO' | 'INGRESO'>('GASTO');
  const [categoria, setCategoria] = useState<string>('OTRO');
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [dteNumero, setDteNumero] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
      setTipo('GASTO');
      setCategoria('OTRO');
      setMonto('');
      setDescripcion('');
      setDteNumero('');
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible]);

  const handleSave = useCallback(async () => {
    if (!monto || parseFloat(monto) <= 0) {
      Alert.alert('Error', 'Ingresá un monto válido');
      return;
    }
    setSaving(true);
    try {
      const repo = new FinancieroRepository(db);
      await repo.createMovimiento({
        tipo,
        categoria,
        monto: parseFloat(monto),
        fecha: Date.now(),
        descripcion: descripcion.trim(),
        dteNumero: dteNumero.trim(),
      });
      triggerSuccess();
      onClose();
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar el movimiento.');
    } finally {
      setSaving(false);
    }
  }, [tipo, categoria, monto, descripcion, dteNumero, db, triggerSuccess, onClose]);

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      backgroundStyle={sheetStyles.sheet}
      handleIndicatorStyle={sheetStyles.indicator}
      onDismiss={onClose}
      enablePanDownToClose
    >
      <BottomSheetScrollView contentContainerStyle={sheetStyles.content}>
        <Text style={sheetStyles.title}>Registrar Movimiento</Text>

        <Text style={sheetStyles.fieldLabel}>TIPO</Text>
        <View style={sheetStyles.toggleRow}>
          {(['GASTO', 'INGRESO'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[sheetStyles.toggleBtn, tipo === t && (t === 'GASTO' ? sheetStyles.toggleGastoActive : sheetStyles.toggleIngresoActive)]}
              onPress={() => setTipo(t)}
            >
              <Text style={[sheetStyles.toggleText, tipo === t && sheetStyles.toggleTextActive]}>
                {t === 'GASTO' ? '📤 Gasto' : '📥 Ingreso'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={sheetStyles.fieldLabel}>CATEGORÍA</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={sheetStyles.chips}>
            {Object.keys(CATEGORIA_MOVIMIENTO).map((cat) => {
              const meta = CATEGORIA_META[cat];
              return (
                <TouchableOpacity
                  key={cat}
                  style={[sheetStyles.chip, categoria === cat && { borderColor: meta.color, backgroundColor: `${meta.color}20` }]}
                  onPress={() => setCategoria(cat)}
                >
                  <Text style={sheetStyles.chipIcon}>{meta.icon}</Text>
                  <Text style={[sheetStyles.chipText, categoria === cat && { color: meta.color, fontWeight: typography.weights.bold }]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <Text style={sheetStyles.fieldLabel}>MONTO ($) *</Text>
        <TextInput
          style={sheetStyles.input}
          placeholder="0"
          placeholderTextColor={colors.textDisabled}
          keyboardType="numeric"
          value={monto}
          onChangeText={setMonto}
        />

        <Text style={sheetStyles.fieldLabel}>DESCRIPCIÓN</Text>
        <TextInput
          style={sheetStyles.input}
          placeholder="Ej: Ivermectina para lote norte"
          placeholderTextColor={colors.textDisabled}
          value={descripcion}
          onChangeText={setDescripcion}
        />

        <Text style={sheetStyles.fieldLabel}>N° DTe / DTA (opcional)</Text>
        <TextInput
          style={sheetStyles.input}
          placeholder="Ej: DTA-2025-001"
          placeholderTextColor={colors.textDisabled}
          value={dteNumero}
          onChangeText={setDteNumero}
        />

        <Button
          label="GUARDAR"
          onPress={handleSave}
          size="lg"
          disabled={!monto || parseFloat(monto) <= 0}
          loading={saving}
          style={sheetStyles.saveButton}
        />
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

// ── Precio Mercado Modal ──────────────────────────────────────────────────────

function PrecioMercadoModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['65%'], []);
  const db = useDatabase();
  const { triggerSuccess } = useHapticFeedback();

  const [novillo, setNovillo] = useState('');
  const [ternero, setTernero] = useState('');
  const [vaca, setVaca] = useState('');
  const [vacaDescarte, setVacaDescarte] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
      setNovillo('');
      setTernero('');
      setVaca('');
      setVacaDescarte('');
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible]);

  const handleSave = useCallback(async () => {
    if (!novillo) { Alert.alert('Error', 'Ingresá el precio del novillo'); return; }
    setSaving(true);
    try {
      const repo = new FinancieroRepository(db);
      await repo.upsertPrecioMercado({
        fecha: Date.now(),
        novilloKg: parseFloat(novillo),
        terneroKg: ternero ? parseFloat(ternero) : 0,
        vacaKg: vaca ? parseFloat(vaca) : 0,
        vacaDescarteKg: vacaDescarte ? parseFloat(vacaDescarte) : 0,
        fuente: 'MANUAL',
      });
      triggerSuccess();
      onClose();
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar los precios.');
    } finally {
      setSaving(false);
    }
  }, [novillo, ternero, vaca, vacaDescarte, db, triggerSuccess, onClose]);

  const PriceInput = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
    <>
      <Text style={sheetStyles.fieldLabel}>{label} ($/kg)</Text>
      <TextInput
        style={sheetStyles.input}
        placeholder="0"
        placeholderTextColor={colors.textDisabled}
        keyboardType="numeric"
        value={value}
        onChangeText={onChange}
      />
    </>
  );

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      backgroundStyle={sheetStyles.sheet}
      handleIndicatorStyle={sheetStyles.indicator}
      onDismiss={onClose}
      enablePanDownToClose
    >
      <BottomSheetScrollView contentContainerStyle={sheetStyles.content}>
        <Text style={sheetStyles.title}>Precios de Mercado</Text>
        <PriceInput label="NOVILLO *" value={novillo} onChange={setNovillo} />
        <PriceInput label="TERNERO" value={ternero} onChange={setTernero} />
        <PriceInput label="VACA" value={vaca} onChange={setVaca} />
        <PriceInput label="VACA DESCARTE" value={vacaDescarte} onChange={setVacaDescarte} />
        <Button
          label="GUARDAR PRECIOS"
          onPress={handleSave}
          size="lg"
          disabled={!novillo}
          loading={saving}
          style={sheetStyles.saveButton}
        />
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────

export function FinancieroScreen() {
  const [filterCategoria, setFilterCategoria] = useState<string | null>(null);
  const [showGastoModal, setShowGastoModal] = useState(false);
  const [showPrecioModal, setShowPrecioModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // WatermelonDB observables are reactive — spinner is pure UX feedback
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  return (
    <ObservableErrorBoundary fallbackTitle="Error al cargar finanzas">
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Financiero</Text>
        </View>

        <FinancieroWithData
          filterCategoria={filterCategoria}
          onFilterChange={setFilterCategoria}
          onAdd={() => setShowGastoModal(true)}
          onEditPrecios={() => setShowPrecioModal(true)}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />

        <GastoFormModal visible={showGastoModal} onClose={() => setShowGastoModal(false)} />
        <PrecioMercadoModal visible={showPrecioModal} onClose={() => setShowPrecioModal(false)} />
      </SafeAreaView>
    </ObservableErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  summaryGasto: { borderColor: `${colors.error}40` },
  summaryIngreso: { borderColor: `${colors.primary}40` },
  summaryAmount: {
    color: colors.error,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.heavy,
    fontVariant: ['tabular-nums'],
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  precioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  precioInfo: { flex: 1 },
  precioTitle: { color: colors.textPrimary, fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },
  precioValue: { color: colors.textSecondary, fontSize: typography.sizes.xs, marginTop: 2 },
  precioEmpty: { color: colors.textDisabled, fontSize: typography.sizes.xs, marginTop: 2 },
  precioEdit: { fontSize: 18 },
  filterRow: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  filterChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryAlpha },
  filterChipIcon: { fontSize: 14 },
  filterChipText: { color: colors.textSecondary, fontSize: typography.sizes.sm },
  filterChipTextActive: { color: colors.primary, fontWeight: typography.weights.bold },
  list: { paddingBottom: spacing.xxl * 2 },
  separator: { height: 1, backgroundColor: colors.border },
  movItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    gap: spacing.md,
    minHeight: spacing.touchTarget,
  },
  movIconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  movIcon: { fontSize: 20 },
  movInfo: { flex: 1 },
  movDesc: { color: colors.textPrimary, fontSize: typography.sizes.md, fontWeight: typography.weights.medium },
  movDate: { color: colors.textDisabled, fontSize: typography.sizes.xs, marginTop: 2 },
  movMonto: { fontSize: typography.sizes.md, fontWeight: typography.weights.bold, fontVariant: ['tabular-nums'] },
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  fabText: { color: colors.background, fontSize: 28, fontWeight: typography.weights.bold, lineHeight: 32 },
});

const sheetStyles = StyleSheet.create({
  sheet: { backgroundColor: colors.surfaceElevated },
  indicator: { backgroundColor: colors.border, width: 40 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm },
  title: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    paddingHorizontal: spacing.md,
    height: spacing.touchTarget,
  },
  toggleRow: { flexDirection: 'row', gap: spacing.sm },
  toggleBtn: {
    flex: 1,
    height: spacing.touchTarget,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleGastoActive: { borderColor: colors.error, backgroundColor: colors.errorAlpha },
  toggleIngresoActive: { borderColor: colors.primary, backgroundColor: colors.primaryAlpha },
  toggleText: { color: colors.textSecondary, fontSize: typography.sizes.md, fontWeight: typography.weights.medium },
  toggleTextActive: { fontWeight: typography.weights.bold },
  chips: { flexDirection: 'row', gap: spacing.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  chipIcon: { fontSize: 14 },
  chipText: { color: colors.textSecondary, fontSize: typography.sizes.sm },
  saveButton: { marginTop: spacing.lg },
});
