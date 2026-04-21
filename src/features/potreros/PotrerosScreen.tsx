import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import withObservables from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';
import { EmptyState } from '@shared/components/EmptyState';
import { ObservableErrorBoundary } from '@shared/components/ObservableErrorBoundary';
import { Button } from '@shared/components/Button';
import { colors, spacing, typography } from '@theme/index';
import { database } from '@data/database/database';
import { useDatabase } from '@shared/hooks/useDatabase';
import { useHapticFeedback } from '@shared/hooks/useHapticFeedback';
import { LoteFormModal } from '@features/lotes/LoteFormModal';
import { NutricionRepository } from '@data/repositories/NutricionRepository';
import type LoteModel from '@data/models/LoteModel';
import type RacionModel from '@data/models/RacionModel';
import type CondicionCorporalModel from '@data/models/CondicionCorporalModel';
import type SuplementoModel from '@data/models/SuplementoModel';

type Tab = 'potreros' | 'nutricion' | 'cc';

// ── Potreros Tab ─────────────────────────────────────────────────────────────

interface LoteListOuterProps {
  onEdit: (lote: LoteModel) => void;
  onDelete: (lote: LoteModel) => void;
}
interface LoteListProps extends LoteListOuterProps {
  lotes: LoteModel[];
}

function LoteListInner({ lotes, onEdit, onDelete }: LoteListProps) {
  return lotes.length === 0 ? (
    <EmptyState icon="🌿" title="Sin potreros" subtitle="Creá el primer potrero para registrar animales" />
  ) : (
    <FlatList
      data={lotes}
      keyExtractor={(l) => l.id}
      renderItem={({ item }) => (
        <ObservableErrorBoundary key={item.id}>
          <LoteCard lote={item} onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} />
        </ObservableErrorBoundary>
      )}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

const LoteListWithData = withObservables([], () => ({
  lotes: database.get<LoteModel>('lotes').query().observe(),
}))(LoteListInner);

function LoteCard({ lote, onEdit, onDelete }: { lote: LoteModel; onEdit: () => void; onDelete: () => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{lote.nombre}</Text>
        {lote.ubicacion ? <Text style={styles.cardSub}>{lote.ubicacion}</Text> : null}
        <View style={styles.cardBadges}>
          {lote.hectareas != null && lote.hectareas > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{lote.hectareas} ha</Text>
            </View>
          ) : null}
          {lote.densidadCarga != null && lote.densidadCarga > 0 ? (
            <View style={[styles.badge, styles.badgeDensidad]}>
              <Text style={[styles.badgeText, styles.badgeTextDensidad]}>
                {lote.densidadCarga.toFixed(1)} an/ha
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={onEdit} activeOpacity={0.8}>
          <Text style={styles.actionBtnText}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={onDelete} activeOpacity={0.8}>
          <Text style={styles.actionBtnText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Nutrición Tab ─────────────────────────────────────────────────────────────

interface RacionesProps {
  raciones: RacionModel[];
  onAdd: () => void;
}

function RacionesInner({ raciones, onAdd }: RacionesProps) {
  return (
    <>
      <View style={styles.tabHeader}>
        <Text style={styles.tabSubtitle}>{raciones.length} raciones activas</Text>
        <Button label="+ Nueva" onPress={onAdd} size="sm" />
      </View>
      {raciones.length === 0 ? (
        <EmptyState icon="🌾" title="Sin raciones" subtitle="Asigná raciones a los potreros" />
      ) : (
        <FlatList
          data={raciones}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => (
            <ObservableErrorBoundary key={item.id}>
              <RacionCard racion={item} />
            </ObservableErrorBoundary>
          )}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </>
  );
}

const RacionesWithData = withObservables(['onAdd'], () => ({
  raciones: database
    .get<RacionModel>('raciones')
    .query(Q.where('activa', true))
    .observe(),
}))(RacionesInner);

function RacionCard({ racion }: { racion: RacionModel }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{racion.kgDiaAnimal} kg/día/animal</Text>
        <Text style={styles.cardSub}>Lote ID: {racion.loteId.slice(0, 8)}…</Text>
        {racion.notas ? <Text style={styles.cardSub}>{racion.notas}</Text> : null}
      </View>
      <View style={[styles.badge, styles.badgeActive]}>
        <Text style={[styles.badgeText, styles.badgeTextActive]}>ACTIVA</Text>
      </View>
    </View>
  );
}

// ── Condición Corporal Tab ────────────────────────────────────────────────────

interface CCProps {
  registros: CondicionCorporalModel[];
  onAdd: () => void;
}

function CCInner({ registros, onAdd }: CCProps) {
  return (
    <>
      <View style={styles.tabHeader}>
        <Text style={styles.tabSubtitle}>{registros.length} registros</Text>
        <Button label="+ CC" onPress={onAdd} size="sm" />
      </View>
      {registros.length === 0 ? (
        <EmptyState icon="📊" title="Sin registros CC" subtitle="Registrá la condición corporal del lote" />
      ) : (
        <FlatList
          data={registros}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => (
            <ObservableErrorBoundary key={item.id}>
              <CCCard registro={item} />
            </ObservableErrorBoundary>
          )}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </>
  );
}

const CCWithData = withObservables(['onAdd'], () => ({
  registros: database
    .get<CondicionCorporalModel>('condicion_corporal')
    .query(Q.sortBy('fecha', Q.desc), Q.take(50))
    .observe(),
}))(CCInner);

function CCCard({ registro }: { registro: CondicionCorporalModel }) {
  const scoreColor =
    registro.score <= 3 ? colors.error : registro.score <= 6 ? colors.warning : colors.primary;

  return (
    <View style={styles.card}>
      <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
        <Text style={[styles.scoreText, { color: scoreColor }]}>{registro.score}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>Score CC: {registro.score}/9</Text>
        <Text style={styles.cardSub}>
          {new Date(registro.fecha).toLocaleDateString('es-AR')}
          {registro.evaluador ? ` · ${registro.evaluador}` : ''}
        </Text>
        {registro.notas ? <Text style={styles.cardSub}>{registro.notas}</Text> : null}
      </View>
    </View>
  );
}

// ── Racion Form (inline) ─────────────────────────────────────────────────────

import { useMemo, useRef, useEffect } from 'react';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';

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
    } catch (e) {
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
      backgroundStyle={styles.sheet}
      handleIndicatorStyle={styles.indicator}
      onDismiss={onClose}
      enablePanDownToClose
    >
      <BottomSheetScrollView contentContainerStyle={styles.modalContent}>
        <Text style={styles.modalTitle}>Nueva Ración</Text>

        <Text style={styles.fieldLabel}>POTRERO</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chips}>
            {lotes.map((l) => (
              <TouchableOpacity
                key={l.id}
                style={[styles.chip, selectedLoteId === l.id && styles.chipActive]}
                onPress={() => setSelectedLoteId(l.id)}
              >
                <Text style={[styles.chipText, selectedLoteId === l.id && styles.chipTextActive]}>
                  {l.nombre}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <Text style={styles.fieldLabel}>SUPLEMENTO</Text>
        {suplementos.length === 0 ? (
          <Text style={styles.emptyText}>Sin suplementos registrados</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chips}>
              {suplementos.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.chip, selectedSupId === s.id && styles.chipActive]}
                  onPress={() => setSelectedSupId(s.id)}
                >
                  <Text style={[styles.chipText, selectedSupId === s.id && styles.chipTextActive]}>
                    {s.nombre}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}

        <Text style={styles.fieldLabel}>KG / DÍA / ANIMAL</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: 3.5"
          placeholderTextColor={colors.textDisabled}
          keyboardType="numeric"
          value={kgDia}
          onChangeText={setKgDia}
        />

        <Text style={styles.fieldLabel}>NOTAS (opcional)</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
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
          style={styles.saveButton}
        />
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

// ── CC Form (inline) ──────────────────────────────────────────────────────────

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
    } catch (e) {
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
      backgroundStyle={styles.sheet}
      handleIndicatorStyle={styles.indicator}
      onDismiss={onClose}
      enablePanDownToClose
    >
      <BottomSheetScrollView contentContainerStyle={styles.modalContent}>
        <Text style={styles.modalTitle}>Condición Corporal</Text>

        <Text style={styles.fieldLabel}>POTRERO</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chips}>
            {lotes.map((l) => (
              <TouchableOpacity
                key={l.id}
                style={[styles.chip, selectedLoteId === l.id && styles.chipActive]}
                onPress={() => setSelectedLoteId(l.id)}
              >
                <Text style={[styles.chipText, selectedLoteId === l.id && styles.chipTextActive]}>
                  {l.nombre}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <Text style={styles.fieldLabel}>SCORE (1–9)</Text>
        <View style={styles.scoreRow}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
            const c = n <= 3 ? colors.error : n <= 6 ? colors.warning : colors.primary;
            return (
              <TouchableOpacity
                key={n}
                style={[styles.scoreBtn, score === n && { backgroundColor: c, borderColor: c }]}
                onPress={() => setScore(n)}
              >
                <Text style={[styles.scoreBtnText, score === n && { color: '#fff' }]}>{n}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.fieldLabel}>EVALUADOR</Text>
        <TextInput
          style={styles.input}
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
          style={styles.saveButton}
        />
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────

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

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'potreros', label: 'Potreros', icon: '🌿' },
    { key: 'nutricion', label: 'Nutrición', icon: '🌾' },
    { key: 'cc', label: 'Cond. Corporal', icon: '📊' },
  ];

  return (
    <ObservableErrorBoundary fallbackTitle="Error al cargar potreros">
      <SafeAreaView style={styles.container} edges={['top']}>
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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBar}
        >
          {tabs.map((tab) => (
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

        <View style={styles.tabContent}>
          {activeTab === 'potreros' && (
            <LoteListWithData onEdit={handleEdit} onDelete={handleDelete} />
          )}
          {activeTab === 'nutricion' && (
            <RacionesWithData onAdd={() => setShowRacionModal(true)} />
          )}
          {activeTab === 'cc' && (
            <CCWithData onAdd={() => setShowCCModal(true)} />
          )}
        </View>

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
    backgroundColor: 'rgba(0,214,143,0.12)',
  },
  tabBtnIcon: { fontSize: 16 },
  tabBtnText: { color: colors.textSecondary, fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
  tabBtnTextActive: { color: colors.primary, fontWeight: typography.weights.bold },
  tabContent: { flex: 1 },
  tabHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  tabSubtitle: { color: colors.textSecondary, fontSize: typography.sizes.sm },
  list: { paddingBottom: spacing.xxl },
  separator: { height: 1, backgroundColor: colors.border },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    minHeight: spacing.touchTarget,
  },
  cardInfo: { flex: 1 },
  cardName: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  cardSub: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    marginTop: 2,
  },
  cardBadges: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: colors.surfaceElevated,
  },
  badgeText: { color: colors.textSecondary, fontSize: typography.sizes.xs, fontWeight: typography.weights.medium },
  badgeDensidad: { backgroundColor: 'rgba(0,149,255,0.12)' },
  badgeTextDensidad: { color: colors.info },
  badgeActive: { backgroundColor: 'rgba(0,214,143,0.12)' },
  badgeTextActive: { color: colors.primary, fontWeight: typography.weights.bold },
  cardActions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: {
    width: spacing.touchTarget,
    height: spacing.touchTarget,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: { backgroundColor: 'rgba(255,61,113,0.15)' },
  actionBtnText: { fontSize: 20 },
  scoreCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: { fontSize: typography.sizes.lg, fontWeight: typography.weights.heavy },
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
  // Modal styles
  sheet: { backgroundColor: colors.surfaceElevated },
  indicator: { backgroundColor: colors.border, width: 40 },
  modalContent: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm },
  modalTitle: {
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
  chipActive: { borderColor: colors.primary, backgroundColor: 'rgba(0,214,143,0.12)' },
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
});
