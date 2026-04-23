import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
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
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
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
import type AnimalModel from '@data/models/AnimalModel';

type Tab = 'potreros' | 'nutricion' | 'cc';

// ── Helpers ───────────────────────────────────────────────────────────────────

function evHa(animalesCount: number, hectareas: number | null): string {
  if (!hectareas || hectareas <= 0) return '—';
  return (animalesCount / hectareas).toFixed(1);
}

// CC score color for 1-5 scale
function ccColor(score: number): string {
  if (score <= 1) return colors.error;
  if (score <= 2) return '#FF6B35';
  if (score === 3) return colors.warning;
  if (score === 4) return '#8BC34A';
  return colors.primary;
}

function ccLabel(score: number): string {
  const labels = ['', 'Muy Flaco', 'Flaco', 'Normal', 'Buena', 'Excelente'];
  return labels[score] ?? '';
}

// ── Potreros Tab ──────────────────────────────────────────────────────────────

interface LoteListOuterProps {
  onEdit: (lote: LoteModel) => void;
  onDelete: (lote: LoteModel) => void;
}

interface LoteListProps extends LoteListOuterProps {
  lotes: LoteModel[];
  animalesByLote: Record<string, number>;
}

function LoteListInner({ lotes, onEdit, onDelete, animalesByLote }: LoteListProps) {
  return lotes.length === 0 ? (
    <EmptyState icon="🌿" title="Sin potreros" subtitle="Creá el primer potrero para registrar animales" />
  ) : (
    <FlatList
      data={lotes}
      keyExtractor={(l) => l.id}
      renderItem={({ item }) => (
        <ObservableErrorBoundary key={item.id}>
          <LoteCard
            lote={item}
            animalCount={animalesByLote[item.id] ?? 0}
            onEdit={() => onEdit(item)}
            onDelete={() => onDelete(item)}
          />
        </ObservableErrorBoundary>
      )}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

interface LoteListWithAnimalsOuterProps extends LoteListOuterProps {}
interface LoteListWithAnimalsProps extends LoteListWithAnimalsOuterProps {
  lotes: LoteModel[];
  activeAnimals: AnimalModel[];
}

function LoteListWithAnimalsInner({ lotes, activeAnimals, onEdit, onDelete }: LoteListWithAnimalsProps) {
  const animalesByLote = useMemo(() => {
    const map: Record<string, number> = {};
    activeAnimals.forEach((a) => {
      if (a.loteId) map[a.loteId] = (map[a.loteId] ?? 0) + 1;
    });
    return map;
  }, [activeAnimals]);

  return (
    <LoteListInner
      lotes={lotes}
      animalesByLote={animalesByLote}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
}

const LoteListWithData = withObservables([], () => ({
  lotes: database.get<LoteModel>('lotes').query().observe(),
  activeAnimals: database.get<AnimalModel>('animals').query(Q.where('estado', 'ACTIVO')).observe(),
}))(LoteListWithAnimalsInner);

function LoteCard({
  lote,
  animalCount,
  onEdit,
  onDelete,
}: {
  lote: LoteModel;
  animalCount: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const ev = evHa(animalCount, lote.hectareas);
  const evStatus: 'ok' | 'warn' | 'over' =
    lote.hectareas && lote.hectareas > 0
      ? animalCount / lote.hectareas > 1.2
        ? 'over'
        : animalCount / lote.hectareas > 0.8
        ? 'ok'
        : 'warn'
      : 'ok';

  const evColor =
    evStatus === 'over' ? colors.error : evStatus === 'warn' ? colors.warning : colors.primary;

  return (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{lote.nombre}</Text>
        {lote.ubicacion ? <Text style={styles.cardSub}>{lote.ubicacion}</Text> : null}
        <View style={styles.cardBadges}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>🐄 {animalCount} animales</Text>
          </View>
          {lote.hectareas != null && lote.hectareas > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{lote.hectareas} ha</Text>
            </View>
          ) : null}
          {lote.hectareas != null && lote.hectareas > 0 ? (
            <View style={[styles.badge, { borderColor: `${evColor}60`, backgroundColor: `${evColor}15` }]}>
              <Text style={[styles.badgeText, { color: evColor }]}>{ev} EV/ha</Text>
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

// ── Nutrición Tab ──────────────────────────────────────────────────────────────

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
  raciones: database.get<RacionModel>('raciones').query(Q.where('activa', true)).observe(),
}))(RacionesInner);

function RacionCard({ racion }: { racion: RacionModel }) {
  return (
    <View style={styles.card}>
      <View style={styles.racionIcon}>
        <Text style={{ fontSize: 24 }}>🌾</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{racion.kgDiaAnimal} kg/día/animal</Text>
        <Text style={styles.cardSub}>Lote: {racion.loteId.slice(0, 8)}…</Text>
        {racion.notas ? <Text style={styles.cardSub}>{racion.notas}</Text> : null}
      </View>
      <View style={[styles.badge, { borderColor: `${colors.primary}60`, backgroundColor: `${colors.primary}15` }]}>
        <Text style={[styles.badgeText, { color: colors.primary }]}>ACTIVA</Text>
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
  // Aggregate: latest score per lote
  const latestByLote = useMemo(() => {
    const map = new Map<string, CondicionCorporalModel>();
    registros.forEach((r) => {
      const existing = map.get(r.loteId);
      if (!existing || r.fecha > existing.fecha) map.set(r.loteId, r);
    });
    return Array.from(map.values());
  }, [registros]);

  return (
    <>
      <View style={styles.tabHeader}>
        <Text style={styles.tabSubtitle}>
          {latestByLote.length} potreros evaluados
        </Text>
        <Button label="+ CC" onPress={onAdd} size="sm" />
      </View>
      {registros.length === 0 ? (
        <EmptyState icon="📊" title="Sin registros CC" subtitle="Registrá la condición corporal del potrero" />
      ) : (
        <>
          {/* Latest summary */}
          {latestByLote.length > 0 && (
            <View style={styles.ccSummary}>
              {latestByLote.map((r) => (
                <View key={r.id} style={[styles.ccSummaryCard, { borderColor: `${ccColor(r.score)}50` }]}>
                  <View style={[styles.ccScore, { backgroundColor: ccColor(r.score) }]}>
                    <Text style={styles.ccScoreText}>{r.score}</Text>
                  </View>
                  <Text style={styles.ccLabel}>{ccLabel(r.score)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Full history */}
          <Text style={styles.historySectionTitle}>Historial</Text>
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
        </>
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
  const color = ccColor(registro.score);
  return (
    <View style={styles.card}>
      <View style={[styles.ccScore, { backgroundColor: color, width: 40, height: 40, borderRadius: 20 }]}>
        <Text style={styles.ccScoreText}>{registro.score}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{ccLabel(registro.score)}</Text>
        <Text style={styles.cardSub}>
          {new Date(registro.fecha).toLocaleDateString('es-AR')}
          {registro.evaluador ? ` · ${registro.evaluador}` : ''}
        </Text>
      </View>
    </View>
  );
}

// ── Racion Form Modal (inline) ────────────────────────────────────────────────

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

// ── CC Form Modal (inline — scale 1-5 per spec) ───────────────────────────────

function CCFormModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['65%'], []);
  const db = useDatabase();
  const { triggerSuccess } = useHapticFeedback();

  const [lotes, setLotes] = useState<LoteModel[]>([]);
  const [selectedLoteId, setSelectedLoteId] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [evaluador, setEvaluador] = useState('');
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
      setSelectedLoteId(null);
      setScore(null);
      setEvaluador('');
      setNotas('');
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
        notas: notas.trim(),
      });
      triggerSuccess();
      onClose();
    } catch {
      Alert.alert('Error', 'No se pudo registrar la CC.');
    } finally {
      setSaving(false);
    }
  }, [selectedLoteId, score, evaluador, notas, db, triggerSuccess, onClose]);

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

        {/* CC scale 1-5 */}
        <Text style={modalStyles.fieldLabel}>SCORE CC (1–5)</Text>
        <View style={modalStyles.ccScaleRow}>
          {[1, 2, 3, 4, 5].map((n) => {
            const c = ccColor(n);
            const selected = score === n;
            return (
              <TouchableOpacity
                key={n}
                style={[
                  modalStyles.ccScaleBtn,
                  { borderColor: c },
                  selected && { backgroundColor: c },
                ]}
                onPress={() => setScore(n)}
                activeOpacity={0.8}
              >
                <Text style={[modalStyles.ccScaleBtnNum, selected && { color: '#fff' }]}>{n}</Text>
                <Text style={[modalStyles.ccScaleBtnLabel, selected && { color: 'rgba(255,255,255,0.85)' }]}>
                  {ccLabel(n)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={modalStyles.fieldLabel}>EVALUADOR</Text>
        <TextInput
          style={modalStyles.input}
          placeholder="Nombre del evaluador"
          placeholderTextColor={colors.textDisabled}
          value={evaluador}
          onChangeText={setEvaluador}
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

        {/* Tab bar */}
        <View style={styles.tabBar}>
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
        </View>

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

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: 10,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabBtnActive: {
    backgroundColor: 'rgba(0,214,143,0.10)',
    borderColor: colors.primary,
  },
  tabBtnIcon: { fontSize: 14 },
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
  racionIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,214,143,0.12)', alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  cardName: { color: colors.textPrimary, fontSize: typography.sizes.md, fontWeight: typography.weights.semibold },
  cardSub: { color: colors.textSecondary, fontSize: typography.sizes.sm, marginTop: 2 },
  cardBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  badgeText: { color: colors.textSecondary, fontSize: typography.sizes.xs, fontWeight: typography.weights.medium },
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
  ccSummary: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    flexWrap: 'wrap',
  },
  ccSummaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: 80,
    borderWidth: 1,
  },
  ccScore: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  ccScoreText: { color: '#fff', fontSize: typography.sizes.xl, fontWeight: typography.weights.heavy },
  ccLabel: { color: colors.textSecondary, fontSize: typography.sizes.xs, textAlign: 'center' },
  historySectionTitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
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
  // CC scale 1-5
  ccScaleRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  ccScaleBtn: {
    flex: 1,
    minHeight: 60,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  ccScaleBtnNum: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.heavy,
  },
  ccScaleBtnLabel: {
    color: colors.textDisabled,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
    marginTop: 2,
  },
  saveButton: { marginTop: spacing.lg },
});
