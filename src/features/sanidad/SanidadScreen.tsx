import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import withObservables from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';
import { EmptyState } from '@shared/components/EmptyState';
import { ObservableErrorBoundary } from '@shared/components/ObservableErrorBoundary';
import { Button } from '@shared/components/Button';
import { colors, spacing, typography } from '@theme/index';
import { database } from '@data/database/database';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type TratamientoSanidadModel from '@data/models/TratamientoSanidadModel';
import type MedicamentoModel from '@data/models/MedicamentoModel';
import type ProtocoloIATFModel from '@data/models/ProtocoloIATFModel';
import { MedicamentoFormModal } from './MedicamentoFormModal';
import { TratamientoFormModal } from './TratamientoFormModal';
import { ProtocoloFormModal } from './ProtocoloFormModal';

// ── Types ────────────────────────────────────────────────────────────────────

type Tab = 'calendario' | 'operaciones' | 'iatf';

// ── Calendar helpers (pure TypeScript) ───────────────────────────────────────

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay(); // 0=Sun
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// ── Constants ────────────────────────────────────────────────────────────────

const DAY_SIZE = 36;
const WEEK_DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// ── Calendar Grid ─────────────────────────────────────────────────────────────

interface CalendarGridProps {
  viewDate: Date;
  selectedDay: Date | null;
  datesWithTreatments: Set<string>;
  today: Date;
  onSelectDay: (date: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

function CalendarGrid({
  viewDate,
  selectedDay,
  datesWithTreatments,
  today,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
}: CalendarGridProps) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDow = getFirstDayOfWeek(year, month);

  // Build a flat array of cells: nulls for leading blanks, numbers for days
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View style={calStyles.container}>
      {/* Navigation header */}
      <View style={calStyles.navRow}>
        <TouchableOpacity style={calStyles.navBtn} onPress={onPrevMonth} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={calStyles.navArrow}>{'‹'}</Text>
        </TouchableOpacity>
        <Text style={calStyles.monthLabel}>
          {MONTH_NAMES[month]} {year}
        </Text>
        <TouchableOpacity style={calStyles.navBtn} onPress={onNextMonth} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={calStyles.navArrow}>{'›'}</Text>
        </TouchableOpacity>
      </View>

      {/* Day-of-week headers */}
      <View style={calStyles.dowRow}>
        {WEEK_DAYS.map((d) => (
          <View key={d} style={calStyles.dowCell}>
            <Text style={calStyles.dowText}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Day cells in rows of 7 */}
      {Array.from({ length: cells.length / 7 }, (_, rowIdx) => (
        <View key={rowIdx} style={calStyles.weekRow}>
          {cells.slice(rowIdx * 7, rowIdx * 7 + 7).map((day, colIdx) => {
            if (day === null) {
              return <View key={`empty-${rowIdx}-${colIdx}`} style={calStyles.dayCell} />;
            }
            const cellDate = new Date(year, month, day);
            const isToday = isSameDay(cellDate, today);
            const isSelected = selectedDay !== null && isSameDay(cellDate, selectedDay);
            const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const hasTreatment = datesWithTreatments.has(dateKey);

            return (
              <TouchableOpacity
                key={day}
                style={[
                  calStyles.dayCell,
                  isToday && !isSelected && calStyles.dayCellToday,
                  isSelected && calStyles.dayCellSelected,
                ]}
                onPress={() => onSelectDay(cellDate)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    calStyles.dayText,
                    isSelected && calStyles.dayTextSelected,
                    isToday && !isSelected && calStyles.dayTextToday,
                  ]}
                >
                  {day}
                </Text>
                {hasTreatment && <View style={calStyles.dayDot} />}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ── Tratamiento row (historial) ───────────────────────────────────────────────

function TratamientoRow({ tratamiento }: { tratamiento: TratamientoSanidadModel }) {
  const enCarencia = tratamiento.fechaFinCarencia > Date.now();
  return (
    <View style={styles.histRow}>
      <View
        style={[
          styles.histDot,
          { backgroundColor: enCarencia ? colors.warning : colors.primary },
        ]}
      />
      <View style={styles.histMain}>
        <Text style={styles.histAnimal} numberOfLines={1}>
          Animal {tratamiento.animalId.slice(0, 8)}…
        </Text>
        <Text style={styles.histSub}>
          Med: {tratamiento.medicamentoId.slice(0, 8)}…
          {' · '}
          {format(new Date(tratamiento.fechaAplicacion), 'dd/MM/yyyy', { locale: es })}
        </Text>
      </View>
      <Text style={[styles.histBadge, enCarencia ? styles.histBadgeCarencia : styles.histBadgeFree]}>
        {enCarencia ? 'Carencia' : 'Libre'}
      </Text>
    </View>
  );
}

// ── Medicamento card ──────────────────────────────────────────────────────────

function MedicamentoCard({ med, onPress }: { med: MedicamentoModel; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardMain}>
        <Text style={styles.cardName}>{med.nombre}</Text>
        {med.principioActivo ? (
          <Text style={styles.cardSub}>{med.principioActivo}</Text>
        ) : null}
      </View>
      {med.diasCarencia > 0 ? (
        <View style={styles.carenciaBadge}>
          <Text style={styles.carenciaBadgeText}>{med.diasCarencia}d</Text>
        </View>
      ) : (
        <View style={[styles.carenciaBadge, styles.carenciaBadgeSafe]}>
          <Text style={[styles.carenciaBadgeText, styles.carenciaBadgeTextSafe]}>Sin carencia</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Tratamiento reciente card ─────────────────────────────────────────────────

function TratamientoRecentCard({ tratamiento }: { tratamiento: TratamientoSanidadModel }) {
  const enCarencia = tratamiento.fechaFinCarencia > Date.now();
  const diasRestantes = enCarencia
    ? Math.ceil((tratamiento.fechaFinCarencia - Date.now()) / 86_400_000)
    : 0;

  return (
    <View style={styles.card}>
      <View style={styles.cardMain}>
        <Text style={styles.cardName}>Animal: {tratamiento.animalId.slice(0, 8)}…</Text>
        <Text style={styles.cardSub}>
          {format(new Date(tratamiento.fechaAplicacion), 'dd/MM/yyyy', { locale: es })}
          {tratamiento.responsable ? ` · ${tratamiento.responsable}` : ''}
        </Text>
      </View>
      {enCarencia ? (
        <View style={styles.carenciaBadge}>
          <Text style={styles.carenciaBadgeText}>{diasRestantes}d</Text>
        </View>
      ) : (
        <View style={[styles.carenciaBadge, styles.carenciaBadgeSafe]}>
          <Text style={[styles.carenciaBadgeText, styles.carenciaBadgeTextSafe]}>Libre</Text>
        </View>
      )}
    </View>
  );
}

// ── Protocolo card ────────────────────────────────────────────────────────────

function ProtocoloCard({ protocolo }: { protocolo: ProtocoloIATFModel }) {
  return (
    <View style={styles.card}>
      <View style={[styles.protocoloDot, { backgroundColor: '#C35BD0' }]} />
      <View style={styles.cardMain}>
        <Text style={styles.cardName}>{protocolo.nombre}</Text>
        <Text style={styles.cardSub}>
          Inicio: {format(new Date(protocolo.fechaInicio), 'dd/MM/yyyy', { locale: es })}
        </Text>
      </View>
      <View style={[styles.carenciaBadge, styles.iatfBadge]}>
        <Text style={[styles.carenciaBadgeText, styles.iatfBadgeText]}>ACTIVO</Text>
      </View>
    </View>
  );
}

// ── Inner component (receives observable props) ───────────────────────────────

interface SanidadInnerProps {
  tratamientos: TratamientoSanidadModel[];
  medicamentos: MedicamentoModel[];
  protocolos: ProtocoloIATFModel[];
}

function SanidadInner({ tratamientos, medicamentos, protocolos }: SanidadInnerProps) {
  const [activeTab, setActiveTab] = useState<Tab>('calendario');
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showMedModal, setShowMedModal] = useState(false);
  const [showTratModal, setShowTratModal] = useState(false);
  const [showProtModal, setShowProtModal] = useState(false);

  const today = useMemo(() => new Date(), []);

  // Build set of date strings that have treatments (for calendar dots)
  const datesWithTreatments = useMemo<Set<string>>(() => {
    const set = new Set<string>();
    for (const t of tratamientos) {
      const d = new Date(t.fechaAplicacion);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      set.add(key);
    }
    return set;
  }, [tratamientos]);

  // Treatments to show in historial (filtered by selectedDay, or all 60)
  const historialTratamientos = useMemo<TratamientoSanidadModel[]>(() => {
    if (selectedDay === null) return tratamientos;
    return tratamientos.filter((t) => isSameDay(new Date(t.fechaAplicacion), selectedDay));
  }, [tratamientos, selectedDay]);

  const handlePrevMonth = useCallback(() => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  const handleSelectDay = useCallback((date: Date) => {
    setSelectedDay((prev) => (prev !== null && isSameDay(prev, date) ? null : date));
  }, []);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'calendario', label: 'Calendario' },
    { key: 'operaciones', label: 'Operaciones' },
    { key: 'iatf', label: 'IATF' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Screen header */}
      <View style={styles.header}>
        <Text style={styles.title}>Sanidad</Text>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabBtn, activeTab === tab.key && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabBtnText, activeTab === tab.key && styles.tabBtnTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── TAB 1: Calendario ─────────────────────────────────────────────── */}
      {activeTab === 'calendario' && (
        <View style={styles.tabContent}>
          {/* Top half: calendar grid */}
          <CalendarGrid
            viewDate={viewDate}
            selectedDay={selectedDay}
            datesWithTreatments={datesWithTreatments}
            today={today}
            onSelectDay={handleSelectDay}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
          />

          {/* Divider + historial label */}
          <View style={styles.historialHeader}>
            <Text style={styles.historialTitle}>
              {selectedDay !== null
                ? format(selectedDay, "d 'de' MMMM", { locale: es })
                : 'Historial reciente'}
            </Text>
            {selectedDay !== null && (
              <TouchableOpacity onPress={() => setSelectedDay(null)}>
                <Text style={styles.clearBtn}>Ver todos</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Bottom half: historial scroll */}
          {historialTratamientos.length === 0 ? (
            <EmptyState
              icon="💉"
              title={selectedDay !== null ? 'Sin tratamientos ese día' : 'Sin tratamientos'}
              subtitle="Registrá aplicaciones en la pestaña Operaciones"
            />
          ) : (
            <FlatList
              data={historialTratamientos}
              keyExtractor={(t) => t.id}
              renderItem={({ item }) => (
                <ObservableErrorBoundary key={item.id}>
                  <TratamientoRow tratamiento={item} />
                </ObservableErrorBoundary>
              )}
              contentContainerStyle={styles.list}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      )}

      {/* ── TAB 2: Operaciones ────────────────────────────────────────────── */}
      {activeTab === 'operaciones' && (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
          {/* Vademécum section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Vademécum</Text>
            <Button label="+ Agregar" onPress={() => setShowMedModal(true)} size="sm" />
          </View>
          {medicamentos.length === 0 ? (
            <EmptyState
              icon="💊"
              title="Vademécum vacío"
              subtitle="Agregá medicamentos para registrar tratamientos"
            />
          ) : (
            <FlatList
              data={medicamentos}
              keyExtractor={(m) => m.id}
              renderItem={({ item }) => (
                <ObservableErrorBoundary key={item.id}>
                  <MedicamentoCard med={item} onPress={() => setShowMedModal(true)} />
                </ObservableErrorBoundary>
              )}
              contentContainerStyle={styles.listInner}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              scrollEnabled={false}
            />
          )}

          {/* Tratamientos recientes section */}
          <View style={[styles.sectionHeader, styles.sectionHeaderSpaced]}>
            <Text style={styles.sectionTitle}>Tratamientos recientes</Text>
            <Button label="+ Registrar" onPress={() => setShowTratModal(true)} size="sm" />
          </View>
          {tratamientos.length === 0 ? (
            <EmptyState
              icon="💉"
              title="Sin tratamientos"
              subtitle="Registrá aplicaciones de medicamentos aquí"
            />
          ) : (
            <FlatList
              data={tratamientos.slice(0, 20)}
              keyExtractor={(t) => t.id}
              renderItem={({ item }) => (
                <ObservableErrorBoundary key={item.id}>
                  <TratamientoRecentCard tratamiento={item} />
                </ObservableErrorBoundary>
              )}
              contentContainerStyle={[styles.listInner, styles.listBottom]}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              scrollEnabled={false}
            />
          )}
        </ScrollView>
      )}

      {/* ── TAB 3: IATF ───────────────────────────────────────────────────── */}
      {activeTab === 'iatf' && (
        <View style={styles.tabContent}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{protocolos.length} activos</Text>
            <Button label="+ Nuevo" onPress={() => setShowProtModal(true)} size="sm" />
          </View>
          {protocolos.length === 0 ? (
            <EmptyState
              icon="🔬"
              title="Sin protocolos"
              subtitle="Iniciá un protocolo IATF para el lote"
            />
          ) : (
            <FlatList
              data={protocolos}
              keyExtractor={(p) => p.id}
              renderItem={({ item }) => (
                <ObservableErrorBoundary key={item.id}>
                  <ProtocoloCard protocolo={item} />
                </ObservableErrorBoundary>
              )}
              contentContainerStyle={styles.list}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          )}
        </View>
      )}

      {/* Modals */}
      <MedicamentoFormModal visible={showMedModal} onClose={() => setShowMedModal(false)} />
      <TratamientoFormModal visible={showTratModal} onClose={() => setShowTratModal(false)} />
      <ProtocoloFormModal visible={showProtModal} onClose={() => setShowProtModal(false)} />
    </SafeAreaView>
  );
}

// ── withObservables wrapper ───────────────────────────────────────────────────

const SanidadWithData = withObservables([], () => ({
  tratamientos: database
    .get<TratamientoSanidadModel>('tratamientos_sanidad')
    .query(Q.sortBy('fecha_aplicacion', Q.desc), Q.take(60))
    .observe(),
  medicamentos: database
    .get<MedicamentoModel>('medicamentos')
    .query(Q.sortBy('nombre', Q.asc))
    .observe(),
  protocolos: database
    .get<ProtocoloIATFModel>('protocolos_iatf')
    .query(Q.where('estado', 'ACTIVO'))
    .observe(),
}))(SanidadInner);

// ── Exported screen ───────────────────────────────────────────────────────────

export function SanidadScreen() {
  return (
    <ObservableErrorBoundary fallbackTitle="Error al cargar sanidad">
      <SanidadWithData />
    </ObservableErrorBoundary>
  );
}

// ── Calendar styles ───────────────────────────────────────────────────────────

const screenWidth = Dimensions.get('window').width;
const calCellWidth = Math.floor((screenWidth - spacing.md * 2) / 7);

const calStyles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  navBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrow: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: typography.weights.bold,
  },
  monthLabel: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  dowRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  dowCell: {
    width: calCellWidth,
    alignItems: 'center',
  },
  dowText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  dayCell: {
    width: calCellWidth,
    height: DAY_SIZE,
    borderRadius: DAY_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
  },
  dayCellToday: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  dayText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
  },
  dayTextSelected: {
    color: colors.background,
    fontWeight: typography.weights.bold,
  },
  dayTextToday: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  dayDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.warning,
    position: 'absolute',
    bottom: 2,
  },
});

// ── Main styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
  // Tab bar
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tabBtnActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0,214,143,0.12)',
  },
  tabBtnText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  tabBtnTextActive: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  tabContent: {
    flex: 1,
  },
  // Historial
  historialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historialTitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  clearBtn: {
    color: colors.primary,
    fontSize: typography.sizes.sm,
  },
  histRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: spacing.touchTarget,
    gap: spacing.sm,
  },
  histDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  histMain: {
    flex: 1,
  },
  histAnimal: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  histSub: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  histBadge: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 6,
  },
  histBadgeCarencia: {
    color: colors.warning,
    backgroundColor: 'rgba(255,170,0,0.15)',
  },
  histBadgeFree: {
    color: colors.primary,
    backgroundColor: 'rgba(0,214,143,0.12)',
  },
  // Operations / sections
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sectionHeaderSpaced: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  list: {
    paddingBottom: spacing.xxl,
  },
  listInner: {
    paddingBottom: spacing.sm,
  },
  listBottom: {
    paddingBottom: spacing.xxl,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    minHeight: spacing.touchTarget,
  },
  cardMain: {
    flex: 1,
  },
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
  carenciaBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,61,113,0.15)',
    minWidth: 60,
    alignItems: 'center',
  },
  carenciaBadgeSafe: {
    backgroundColor: 'rgba(0,214,143,0.12)',
  },
  carenciaBadgeText: {
    color: colors.error,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  carenciaBadgeTextSafe: {
    color: colors.primary,
  },
  protocoloDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  iatfBadge: {
    backgroundColor: 'rgba(195,91,208,0.15)',
  },
  iatfBadgeText: {
    color: '#C35BD0',
  },
});
