import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { ObservableErrorBoundary } from '@shared/components/ObservableErrorBoundary';
import { Button } from '@shared/components/Button';
import { LoteFormModal } from '@features/lotes/LoteFormModal';
import { LoteList } from './ui/LoteList';
import { RacionTab, CCTab } from './ui/NutricionTabs';
import { colors, spacing, typography } from '@theme/index';
import { useDatabase } from '@shared/hooks/useDatabase';
import { useHapticFeedback } from '@shared/hooks/useHapticFeedback';
import { NutricionRepository } from '@data/repositories/NutricionRepository';
import type LoteModel from '@data/models/LoteModel';
import type SuplementoModel from '@data/models/SuplementoModel';

// ─── Types ──────────────────────────────────────────────────────────────────

type Tab = 'potreros' | 'nutricion' | 'cc';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'potreros', label: 'Potreros', icon: '🌿' },
  { key: 'nutricion', label: 'Nutrición', icon: '🌾' },
  { key: 'cc', label: 'Cond. Corporal', icon: '📊' },
];

// ─── RacionFormModal ──────────────────────────────────────────────────────────

function RacionFormModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['70%', '90%'], []);
  const db = useDatabase();
  const { triggerSuccess } = useHapticFeedback();

  const [lotes, setLotes] = useState<LoteModel[]>([]);
  const [suplementos, setSuplementos] = useState<SuplementoModel[]>([]);
  const [selectedLoteId, setSelectedLoteId] = useState<string | null>(null);
  const [selectedSupId, setSelectedSupId] = useState<string | null>(null);
  const [kgDia, setKgDia] = useState('');
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
      setSelectedLoteId(null);
      setSelectedSupId(null);
      setKgDia('');
      setNotas('');
      void (async () => {
        const [l, s] = await Promise.all([
          db.get<LoteModel>('lotes').query().fetch(),
          db.get<SuplementoModel>('suplementos').query().fetch(),
        ]);
        setLotes(l);
        setSuplementos(s);
      })();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible, db]);

  const handleSave = useCallback(async () => {
    if (!selectedLoteId || !selectedSupId || !kgDia) return;
    setSaving(true);
    try {
      const repo = new NutricionRepository(db);
      await repo.createRacion({
        loteId: selectedLoteId,
        suplementoId: selectedSupId,
        kgDiaAnimal: parseFloat(kgDia),
        fechaInicio: Date.now(),
        notas: notas.trim(),
      });
      triggerSuccess();
      onClose();
    } catch {
      Alert.alert('Error', 'No se pudo guardar la ración.');
    } finally {
      setSaving(false);
    }
  }, [selectedLoteId, selectedSupId, kgDia, notas, db, triggerSuccess, onClose]);

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      backgroundStyle={modalStyles.sheet}
      handleIndicatorStyle={modalStyles.indicator}
      onDismiss={onClose}
      enablePanDownToClose
    >
      <BottomSheetScrollView contentContainerStyle={modalStyles.content}>
        <Text style={modalStyles.title}>Nueva Ración</Text>

        <Text style={modalStyles.fieldLabel}>POTRERO</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={modalStyles.chips}>
            {lotes.map((l) => (
              <TouchableOpacity
                key={l.id}
                style={[modalStyles.chip, selectedLoteId === l.id && modalStyles.chipActive]}
                onPress={() => setSelectedLoteId(l.id)}
              >
                <Text style={[modalStyles.chipText, selectedLoteId === l.id && modalStyles.chipTextActive]}>
                  {l.nombre}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <Text style={modalStyles.fieldLabel}>SUPLEMENTO</Text>
        {suplementos.length === 0 ? (
          <Text style={modalStyles.emptyText}>Sin suplementos registrados</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={modalStyles.chips}>
              {suplementos.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={[modalStyles.chip, selectedSupId === s.id && modalStyles.chipActive]}
                  onPress={() => setSelectedSupId(s.id)}
                >
                  <Text style={[modalStyles.chipText, selectedSupId === s.id && modalStyles.chipTextActive]}>
                    {s.nombre}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}

        <Text style={modalStyles.fieldLabel}>KG / DÍA / ANIMAL</Text>
        <TextInput
          style={modalStyles.input}
          placeholder="Ej: 3.5"
          placeholderTextColor={colors.textDisabled}
          keyboardType="numeric"
          value={kgDia}
          onChangeText={setKgDia}
        />

        <Text style={modalStyles.fieldLabel}>NOTAS (opcional)</Text>
        <TextInput
          style={[modalStyles.input, modalStyles.inputMultiline]}
          placeholder="Observaciones..."
          placeholderTextColor={colors.textDisabled}
          multiline
          textAlignVertical="top"
          value={notas}
          onChangeText={setNotas}
        />

        <Button
          label="GUARDAR RACIÓN"
          onPress={handleSave}
          size="lg"
          disabled={!selectedLoteId || !selectedSupId || !kgDia}
          loading={saving}
          style={modalStyles.saveButton}
        />
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

// ─── CCFormModal ──────────────────────────────────────────────────────────────

function CCFormModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['65%'], []);
  const db = useDatabase();
  const { triggerSuccess } = useHapticFeedback();

  const [lotes, setLotes] = useState<LoteModel[]>([]);
  const [selectedLoteId, setSelectedLoteId] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [evaluador, setEvaluador] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
      setSelectedLoteId(null);
      setScore(null);
      setEvaluador('');
      void db.get<LoteModel>('lotes').query().fetch().then(setLotes);
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible, db]);

  const handleSave = useCallback(async () => {
    if (!selectedLoteId || score === null) return;
    setSaving(true);
    try {
      const repo = new NutricionRepository(db);
      await repo.createCC({
        loteId: selectedLoteId,
        fecha: Date.now(),
        score,
        evaluador: evaluador.trim(),
      });
      triggerSuccess();
      onClose();
    } catch {
      Alert.alert('Error', 'No se pudo registrar la CC.');
    } finally {
      setSaving(false);
    }
  }, [selectedLoteId, score, evaluador, db, triggerSuccess, onClose]);

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      backgroundStyle={modalStyles.sheet}
      handleIndicatorStyle={modalStyles.indicator}
      onDismiss={onClose}
      enablePanDownToClose
    >
      <BottomSheetScrollView contentContainerStyle={modalStyles.content}>
        <Text style={modalStyles.title}>Condición Corporal</Text>

        <Text style={modalStyles.fieldLabel}>POTRERO</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={modalStyles.chips}>
            {lotes.map((l) => (
              <TouchableOpacity
                key={l.id}
                style={[modalStyles.chip, selectedLoteId === l.id && modalStyles.chipActive]}
                onPress={() => setSelectedLoteId(l.id)}
              >
                <Text style={[modalStyles.chipText, selectedLoteId === l.id && modalStyles.chipTextActive]}>
                  {l.nombre}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <Text style={modalStyles.fieldLabel}>SCORE (1–9)</Text>
        <View style={modalStyles.scoreRow}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
            const c = n <= 3 ? colors.error : n <= 6 ? colors.warning : colors.primary;
            return (
              <TouchableOpacity
                key={n}
                style={[modalStyles.scoreBtn, score === n && { backgroundColor: c, borderColor: c }]}
                onPress={() => setScore(n)}
              >
                <Text style={[modalStyles.scoreBtnText, score === n && { color: '#fff' }]}>{n}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={modalStyles.fieldLabel}>EVALUADOR</Text>
        <TextInput
          style={modalStyles.input}
          placeholder="Nombre"
          placeholderTextColor={colors.textDisabled}
          value={evaluador}
          onChangeText={setEvaluador}
        />

        <Button
          label="GUARDAR CC"
          onPress={handleSave}
          size="lg"
          disabled={!selectedLoteId || score === null}
          loading={saving}
          style={modalStyles.saveButton}
        />
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

// ─── PotrerosScreen (thin orchestration) ─────────────────────────────────────

/**
 * PotrerosScreen — thin orchestration layer.
 * Manages only: active tab, modal visibility, lote editing state.
 * All data concerns delegated to LoteList, RacionTab, CCTab (with observables).
 */
export function PotrerosScreen() {
  const db = useDatabase();
  const { triggerHeavy } = useHapticFeedback();
  const [activeTab, setActiveTab] = useState<Tab>('potreros');
  const [showLoteModal, setShowLoteModal] = useState(false);
  const [showRacionModal, setShowRacionModal] = useState(false);
  const [showCCModal, setShowCCModal] = useState(false);
  const [editingLote, setEditingLote] = useState<LoteModel | null>(null);

  const handleDelete = useCallback(
    (lote: LoteModel) => {
      Alert.alert(
        'Eliminar Potrero',
        `¿Eliminar "${lote.nombre}"? Los animales asignados quedarán sin potrero.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: () => {
              triggerHeavy();
              void db.write(() => lote.destroyPermanently());
            },
          },
        ]
      );
    },
    [db, triggerHeavy]
  );

  const handleEdit = useCallback((lote: LoteModel) => {
    setEditingLote(lote);
    setShowLoteModal(true);
  }, []);

  return (
    <ObservableErrorBoundary fallbackTitle="Error al cargar potreros">
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Potreros</Text>
          {activeTab === 'potreros' && (
            <Button
              label="+ Nuevo"
              onPress={() => { setEditingLote(null); setShowLoteModal(true); }}
              size="sm"
            />
          )}
        </View>

        {/* Tab Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBar}
        >
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabBtn, activeTab === tab.key && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={styles.tabBtnIcon}>{tab.icon}</Text>
              <Text style={[styles.tabBtnText, activeTab === tab.key && styles.tabBtnTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'potreros' && (
            <LoteList onEdit={handleEdit} onDelete={handleDelete} />
          )}
          {activeTab === 'nutricion' && (
            <RacionTab onAdd={() => setShowRacionModal(true)} />
          )}
          {activeTab === 'cc' && (
            <CCTab onAdd={() => setShowCCModal(true)} />
          )}
        </View>

        {/* Modals */}
        <LoteFormModal
          visible={showLoteModal}
          lote={editingLote}
          onClose={() => { setShowLoteModal(false); setEditingLote(null); }}
        />
        <RacionFormModal visible={showRacionModal} onClose={() => setShowRacionModal(false)} />
        <CCFormModal visible={showCCModal} onClose={() => setShowCCModal(false)} />
      </SafeAreaView>
    </ObservableErrorBoundary>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  tabBar: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  tabBtn: {
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
  tabBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryAlpha,
  },
  tabBtnIcon: { fontSize: 16 },
  tabBtnText: { color: colors.textSecondary, fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
  tabBtnTextActive: { color: colors.primary, fontWeight: typography.weights.bold },
  tabContent: { flex: 1 },
});

const modalStyles = StyleSheet.create({
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
  chips: { flexDirection: 'row', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primaryAlpha },
  chipText: { color: colors.textSecondary, fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
  chipTextActive: { color: colors.primary, fontWeight: typography.weights.bold },
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
  inputMultiline: { height: 80, paddingTop: spacing.sm },
  emptyText: { color: colors.textDisabled, fontSize: typography.sizes.sm, fontStyle: 'italic' },
  saveButton: { marginTop: spacing.lg },
  scoreRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  scoreBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreBtnText: { color: colors.textSecondary, fontSize: typography.sizes.md, fontWeight: typography.weights.bold },
});
