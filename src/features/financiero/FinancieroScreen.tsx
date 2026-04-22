import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { ObservableErrorBoundary } from '@shared/components/ObservableErrorBoundary';
import { Button } from '@shared/components/Button';
import { colors, spacing, typography } from '@theme/index';
import { useDatabase } from '@shared/hooks/useDatabase';
import { useHapticFeedback } from '@shared/hooks/useHapticFeedback';
import { FinancieroRepository } from '@data/repositories/FinancieroRepository';
import { CATEGORIA_MOVIMIENTO } from '@core/constants/sanidad';
import { FinancieroContainer } from './model/FinancieroContainer';

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIA_META: Record<string, { icon: string; color: string }> = {
  SANIDAD: { icon: '💉', color: colors.warning },
  NUTRICION: { icon: '🌾', color: colors.primary },
  ALQUILER: { icon: '🏡', color: colors.info },
  VENTA: { icon: '💰', color: colors.primary },
  COMPRA: { icon: '🛒', color: '#C35BD0' },
  OTRO: { icon: '📋', color: colors.textSecondary },
};

// ─── GastoFormModal ──────────────────────────────────────────────────────────

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
    } catch {
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
              style={[
                sheetStyles.toggleBtn,
                tipo === t && (t === 'GASTO' ? sheetStyles.toggleGastoActive : sheetStyles.toggleIngresoActive),
              ]}
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
                  style={[
                    sheetStyles.chip,
                    categoria === cat && { borderColor: meta.color, backgroundColor: `${meta.color}20` },
                  ]}
                  onPress={() => setCategoria(cat)}
                >
                  <Text style={sheetStyles.chipIcon}>{meta.icon}</Text>
                  <Text
                    style={[
                      sheetStyles.chipText,
                      categoria === cat && { color: meta.color, fontWeight: typography.weights.bold },
                    ]}
                  >
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

// ─── PrecioMercadoModal ───────────────────────────────────────────────────────

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
    } catch {
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

// ─── FinancieroScreen (thin orchestration) ───────────────────────────────────

/**
 * FinancieroScreen — thin orchestration layer.
 * Manages only local UI state (filter, modal visibility, refreshing).
 * All data concerns delegated to FinancieroContainer (WatermelonDB).
 */
export function FinancieroScreen() {
  const [filterCategoria, setFilterCategoria] = useState<string | null>(null);
  const [showGastoModal, setShowGastoModal] = useState(false);
  const [showPrecioModal, setShowPrecioModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  return (
    <ObservableErrorBoundary fallbackTitle="Error al cargar finanzas">
      <FinancieroContainer
        filterCategoria={filterCategoria}
        onFilterChange={setFilterCategoria}
        onAdd={() => setShowGastoModal(true)}
        onEditPrecios={() => setShowPrecioModal(true)}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />
      <GastoFormModal visible={showGastoModal} onClose={() => setShowGastoModal(false)} />
      <PrecioMercadoModal visible={showPrecioModal} onClose={() => setShowPrecioModal(false)} />
    </ObservableErrorBoundary>
  );
}

// ─── Sheet Styles ─────────────────────────────────────────────────────────────

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
