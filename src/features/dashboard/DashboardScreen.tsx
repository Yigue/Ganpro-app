import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import withObservables from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';
import { ObservableErrorBoundary } from '@shared/components/ObservableErrorBoundary';
import { EmptyState } from '@shared/components/EmptyState';
import { colors, spacing, typography } from '@theme/index';
import { database } from '@data/database/database';
import { calcularGDP } from '@core/utils/nutricionEngine';
import { calcularCostoPorKg, calcularDiasAFaena } from '@core/utils/financieroEngine';
import { EVENTO_TIPO, type EventoTipoType } from '@core/constants/eventTypes';
import { PESO_OBJETIVO_FAENA } from '@core/constants/sanidad';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type EventoModel from '@data/models/EventoModel';
import type LoteModel from '@data/models/LoteModel';
import type PrecioMercadoModel from '@data/models/PrecioMercadoModel';
import type AnimalModel from '@data/models/AnimalModel';
import type MovimientoFinancieroModel from '@data/models/MovimientoFinancieroModel';
import type AgregadoFinancieroModel from '@data/models/AgregadoFinancieroModel';

type DashTab = 'operativo' | 'economico';

const TIPO_META: Record<EventoTipoType, { icon: string; color: string }> = {
  PESAJE: { icon: '⚖️', color: colors.info },
  VACUNACION: { icon: '💉', color: colors.warning },
  CAMBIO_LOTE: { icon: '🔀', color: colors.primary },
  TACTO: { icon: '🔬', color: '#C35BD0' },
  OTRO: { icon: '📋', color: colors.textSecondary },
};

// ── GDP Line Chart ──────────────────────────────────────────────────────────

function SimpleLineChart({ data }: { data: { x: number; y: number }[] }) {
  if (data.length < 2) {
    return (
      <View style={chartStyles.empty}>
        <Text style={chartStyles.emptyText}>Registrá 2+ pesajes para ver la curva</Text>
      </View>
    );
  }

  const CHART_H = 100;
  const maxY = Math.max(...data.map((d) => d.y));
  const minY = Math.min(...data.map((d) => d.y));
  const range = maxY - minY || 1;

  return (
    <View style={[chartStyles.chart, { height: CHART_H }]}>
      {data.map((point, i) => {
        const xPct = i / (data.length - 1);
        const yPct = (point.y - minY) / range;
        return (
          <View
            key={i}
            style={[
              chartStyles.dot,
              {
                left: `${xPct * 88 + 4}%` as `${number}%`,
                bottom: yPct * (CHART_H - 20) + 8,
              },
            ]}
          />
        );
      })}
      <Text style={chartStyles.maxLabel}>{maxY.toFixed(0)} kg</Text>
      <Text style={chartStyles.minLabel}>{minY.toFixed(0)} kg</Text>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  empty: {
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  emptyText: { color: colors.textDisabled, fontSize: typography.sizes.sm },
  chart: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    position: 'relative',
    marginTop: spacing.sm,
  },
  dot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  maxLabel: { position: 'absolute', top: 6, right: 8, color: colors.textDisabled, fontSize: typography.sizes.xs },
  minLabel: { position: 'absolute', bottom: 6, right: 8, color: colors.textDisabled, fontSize: typography.sizes.xs },
});

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  title,
  value,
  sub,
  status,
  icon,
}: {
  title: string;
  value: string;
  sub?: string;
  status: 'green' | 'yellow' | 'red' | 'gray';
  icon: string;
}) {
  const color =
    status === 'green'
      ? colors.primary
      : status === 'yellow'
      ? colors.warning
      : status === 'red'
      ? colors.error
      : colors.textDisabled;

  return (
    <View style={[kpiStyles.card, { borderColor: `${color}50` }]}>
      <View style={kpiStyles.top}>
        <Text style={kpiStyles.icon}>{icon}</Text>
        <View style={[kpiStyles.dot, { backgroundColor: color }]} />
      </View>
      <Text style={[kpiStyles.value, { color }]}>{value}</Text>
      <Text style={kpiStyles.title}>{title}</Text>
      {sub ? <Text style={kpiStyles.sub}>{sub}</Text> : null}
    </View>
  );
}

const kpiStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    minWidth: 100,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  icon: { fontSize: 20 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  value: { fontSize: typography.sizes.xl, fontWeight: typography.weights.heavy, fontVariant: ['tabular-nums'] },
  title: { color: colors.textSecondary, fontSize: typography.sizes.xs, marginTop: 4 },
  sub: { color: colors.textDisabled, fontSize: typography.sizes.xs, marginTop: 2 },
});

// ── Operativo Tab ────────────────────────────────────────────────────────────

interface OperativoProps {
  lotes: LoteModel[];
  selectedLoteId: string | null;
  onSelectLote: (id: string | null) => void;
  pesajes: EventoModel[];
  eventosRecientes: EventoModel[];
  animalesMuertos: AnimalModel[];
  todosAnimales: AnimalModel[];
}

function OperativoTab({
  lotes,
  selectedLoteId,
  onSelectLote,
  pesajes,
  eventosRecientes,
  animalesMuertos,
  todosAnimales,
}: OperativoProps) {
  const gdpInput = useMemo(() => {
    return [...pesajes]
      .sort((a, b) => a.timestamp - b.timestamp)
      .filter((p) => p.valor != null)
      .map((p) => ({ timestamp: p.timestamp, valor: p.valor! }));
  }, [pesajes]);

  const chartData = useMemo(
    () => gdpInput.map((p, i) => ({ x: i, y: p.valor })),
    [gdpInput]
  );

  const gdp = useMemo(() => (gdpInput.length >= 2 ? calcularGDP(gdpInput) : null), [gdpInput]);
  const totalActivos = todosAnimales.length;
  const mortalidadPct = totalActivos > 0 ? (animalesMuertos.length / totalActivos) * 100 : 0;

  const pesoPromedio = useMemo(() => {
    const weights = gdpInput.slice(-10).map((p) => p.valor);
    if (weights.length === 0) return null;
    return weights.reduce((s, w) => s + w, 0) / weights.length;
  }, [gdpInput]);

  const diasFaena = useMemo(() => {
    if (!gdp || gdp <= 0 || !pesoPromedio) return null;
    const pesoObj = 480; // Novillo default
    return calcularDiasAFaena({ pesoActualKg: pesoPromedio, gdpKgDia: gdp, pesoObjetivoKg: pesoObj });
  }, [gdp, pesoPromedio]);

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      {/* Lote selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.loteRow}>
        <TouchableOpacity
          style={[styles.loteChip, selectedLoteId === null && styles.loteChipActive]}
          onPress={() => onSelectLote(null)}
        >
          <Text style={[styles.loteChipText, selectedLoteId === null && styles.loteChipTextActive]}>
            Todos ({totalActivos})
          </Text>
        </TouchableOpacity>
        {lotes.map((l) => (
          <TouchableOpacity
            key={l.id}
            style={[styles.loteChip, selectedLoteId === l.id && styles.loteChipActive]}
            onPress={() => onSelectLote(l.id)}
          >
            <Text style={[styles.loteChipText, selectedLoteId === l.id && styles.loteChipTextActive]}>
              {l.nombre}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* KPI row */}
      <View style={styles.kpiRow}>
        <KpiCard
          icon="📈"
          title="GDP"
          value={gdp != null ? `${gdp.toFixed(2)} kg/d` : 'N/D'}
          sub={pesoPromedio ? `~${pesoPromedio.toFixed(0)} kg prom.` : undefined}
          status={gdp != null ? (gdp >= 0.9 ? 'green' : gdp >= 0.6 ? 'yellow' : 'red') : 'gray'}
        />
        <KpiCard
          icon="💀"
          title="Mortalidad"
          value={`${mortalidadPct.toFixed(1)}%`}
          sub={`${animalesMuertos.length} bajas`}
          status={mortalidadPct < 1 ? 'green' : mortalidadPct < 3 ? 'yellow' : 'red'}
        />
        <KpiCard
          icon="🏁"
          title="Días a faena"
          value={diasFaena != null ? `${Math.round(diasFaena)}d` : 'N/C'}
          sub={diasFaena != null ? 'est. novillo' : 'sin datos'}
          status={diasFaena != null ? (diasFaena < 60 ? 'green' : diasFaena < 120 ? 'yellow' : 'gray') : 'gray'}
        />
      </View>

      {/* GDP chart */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Curva de Peso</Text>
          {gdp != null && (
            <Text style={styles.gdpValue}>{gdp.toFixed(2)} kg/día</Text>
          )}
        </View>
        <SimpleLineChart data={chartData} />
      </View>

      {/* Historial reciente */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actividad Reciente</Text>
        {eventosRecientes.length === 0 ? (
          <EmptyState icon="📋" title="Sin eventos" subtitle="" />
        ) : (
          eventosRecientes.slice(0, 15).map((e) => (
            <ObservableErrorBoundary key={e.id}>
              <EventoRow evento={e} />
            </ObservableErrorBoundary>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function EventoRow({ evento }: { evento: EventoModel }) {
  const meta = TIPO_META[evento.tipo as EventoTipoType] ?? TIPO_META.OTRO;
  return (
    <View style={styles.eventoRow}>
      <View style={[styles.eventoIconBox, { backgroundColor: `${meta.color}20` }]}>
        <Text style={styles.eventoIcon}>{meta.icon}</Text>
      </View>
      <View style={styles.eventoInfo}>
        <Text style={[styles.eventoTipo, { color: meta.color }]}>{evento.tipo}</Text>
        {evento.valor != null && (
          <Text style={styles.eventoValor}>{evento.valor} kg</Text>
        )}
      </View>
      <Text style={styles.eventoTime}>
        {format(new Date(evento.timestamp), 'dd/MM HH:mm', { locale: es })}
      </Text>
    </View>
  );
}

// ── Económico Tab ────────────────────────────────────────────────────────────

interface EconomicoProps {
  movimientos: MovimientoFinancieroModel[];
  agregados: AgregadoFinancieroModel[];
  ultimoPrecio: PrecioMercadoModel[];
}

function EconomicoTab({ movimientos, agregados, ultimoPrecio }: EconomicoProps) {
  const precio = ultimoPrecio[0];

  const totalGastos = useMemo(
    () => movimientos.filter((m) => m.tipo === 'GASTO').reduce((s, m) => s + m.monto, 0),
    [movimientos]
  );
  const totalIngresos = useMemo(
    () => movimientos.filter((m) => m.tipo === 'INGRESO').reduce((s, m) => s + m.monto, 0),
    [movimientos]
  );
  const balance = totalIngresos - totalGastos;

  // Gastos por categoría for distribution chart
  const gastosCat = useMemo(() => {
    const map: Record<string, number> = {};
    movimientos
      .filter((m) => m.tipo === 'GASTO')
      .forEach((m) => {
        map[m.categoria] = (map[m.categoria] ?? 0) + m.monto;
      });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [movimientos]);

  const costoPorKg = useMemo(() => {
    const kgGanados = agregados.reduce((s, a) => s + (a.kgGanados ?? 0), 0);
    return calcularCostoPorKg({ costoTotalPesos: totalGastos, kgGanados });
  }, [totalGastos, agregados]);

  const CAT_COLORS: Record<string, string> = {
    SANIDAD: colors.warning,
    NUTRICION: colors.primary,
    ALQUILER: colors.info,
    VENTA: '#00D68F',
    COMPRA: '#C35BD0',
    OTRO: colors.textDisabled,
  };

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      {/* Balance cards */}
      <View style={styles.kpiRow}>
        <KpiCard
          icon="📤"
          title="Gastos del mes"
          value={`$${totalGastos.toLocaleString('es-AR')}`}
          status={totalGastos > 0 ? 'red' : 'gray'}
        />
        <KpiCard
          icon="📥"
          title="Ingresos"
          value={`$${totalIngresos.toLocaleString('es-AR')}`}
          status={totalIngresos > 0 ? 'green' : 'gray'}
        />
      </View>
      <View style={styles.kpiRow}>
        <KpiCard
          icon="⚖️"
          title="Balance"
          value={`${balance >= 0 ? '+' : ''}$${Math.abs(balance).toLocaleString('es-AR')}`}
          status={balance >= 0 ? 'green' : 'red'}
        />
        <KpiCard
          icon="🔢"
          title="Costo / kg"
          value={costoPorKg != null ? `$${costoPorKg.toFixed(0)}/kg` : 'N/C'}
          sub="prod. total"
          status={costoPorKg != null ? (costoPorKg < 500 ? 'green' : costoPorKg < 800 ? 'yellow' : 'red') : 'gray'}
        />
      </View>

      {/* Precio de mercado */}
      {precio && (
        <View style={[styles.section, styles.precioCard]}>
          <Text style={styles.sectionTitle}>Precio de Mercado</Text>
          <View style={styles.precioRow}>
            <PrecioItem label="Novillo" value={precio.novilloKg ?? 0} />
            <PrecioItem label="Ternero" value={precio.terneroKg ?? 0} />
            <PrecioItem label="Vaca" value={precio.vacaKg ?? 0} />
          </View>
          <Text style={styles.precioDate}>
            Actualizado: {format(new Date(precio.fecha), 'dd/MM/yyyy', { locale: es })}
          </Text>
        </View>
      )}

      {/* Distribución de gastos */}
      {gastosCat.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Distribución de Gastos</Text>
          {gastosCat.map(([cat, monto]) => {
            const pct = totalGastos > 0 ? (monto / totalGastos) * 100 : 0;
            return (
              <View key={cat} style={styles.distRow}>
                <Text style={[styles.distLabel, { color: CAT_COLORS[cat] ?? colors.textSecondary }]}>
                  {cat}
                </Text>
                <View style={styles.distBarBg}>
                  <View
                    style={[
                      styles.distBar,
                      { width: `${pct}%` as `${number}%`, backgroundColor: CAT_COLORS[cat] ?? colors.textDisabled },
                    ]}
                  />
                </View>
                <Text style={styles.distPct}>{pct.toFixed(0)}%</Text>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

function PrecioItem({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.precioItem}>
      <Text style={styles.precioItemVal}>${value}</Text>
      <Text style={styles.precioItemLabel}>{label}</Text>
    </View>
  );
}

// ── withObservables ───────────────────────────────────────────────────────────

interface DashOuterProps {
  selectedLoteId: string | null;
  onSelectLote: (id: string | null) => void;
  activeTab: DashTab;
}

interface DashInnerProps extends DashOuterProps {
  pesajes: EventoModel[];
  eventosRecientes: EventoModel[];
  lotes: LoteModel[];
  ultimoPrecio: PrecioMercadoModel[];
  animalesMuertos: AnimalModel[];
  todosAnimales: AnimalModel[];
  movimientos: MovimientoFinancieroModel[];
  agregados: AgregadoFinancieroModel[];
}

function DashboardInner({
  pesajes,
  eventosRecientes,
  lotes,
  ultimoPrecio,
  animalesMuertos,
  todosAnimales,
  movimientos,
  agregados,
  selectedLoteId,
  onSelectLote,
  activeTab,
}: DashInnerProps) {
  if (activeTab === 'operativo') {
    return (
      <OperativoTab
        lotes={lotes}
        selectedLoteId={selectedLoteId}
        onSelectLote={onSelectLote}
        pesajes={pesajes}
        eventosRecientes={eventosRecientes}
        animalesMuertos={animalesMuertos}
        todosAnimales={todosAnimales}
      />
    );
  }
  return (
    <EconomicoTab
      movimientos={movimientos}
      agregados={agregados}
      ultimoPrecio={ultimoPrecio}
    />
  );
}

const DashboardWithData = withObservables(
  ['selectedLoteId'],
  ({ selectedLoteId }: DashOuterProps) => ({
    pesajes: database
      .get<EventoModel>('eventos')
      .query(Q.where('tipo', EVENTO_TIPO.PESAJE), Q.sortBy('timestamp', Q.asc), Q.take(30))
      .observe(),
    eventosRecientes: database
      .get<EventoModel>('eventos')
      .query(Q.sortBy('timestamp', Q.desc), Q.take(20))
      .observe(),
    lotes: database.get<LoteModel>('lotes').query().observe(),
    ultimoPrecio: database
      .get<PrecioMercadoModel>('precios_mercado')
      .query(Q.sortBy('fecha', Q.desc), Q.take(1))
      .observe(),
    animalesMuertos: database
      .get<AnimalModel>('animals')
      .query(Q.where('estado', 'MUERTO'))
      .observe(),
    todosAnimales: database.get<AnimalModel>('animals').query(Q.where('estado', 'ACTIVO')).observe(),
    movimientos: database
      .get<MovimientoFinancieroModel>('movimientos_financieros')
      .query(Q.sortBy('fecha', Q.desc), Q.take(100))
      .observe(),
    agregados: database
      .get<AgregadoFinancieroModel>('agregados_financieros')
      .query()
      .observe(),
  })
)(DashboardInner);

// ── Main Screen ──────────────────────────────────────────────────────────────

export function DashboardScreen() {
  const [selectedLoteId, setSelectedLoteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DashTab>('operativo');

  const tabs: { key: DashTab; label: string; icon: string }[] = [
    { key: 'operativo', label: 'Operativo', icon: '📈' },
    { key: 'economico', label: 'Económico', icon: '💰' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
        <View style={styles.tabPills}>
          {tabs.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.pill, activeTab === t.key && styles.pillActive]}
              onPress={() => setActiveTab(t.key)}
            >
              <Text style={styles.pillIcon}>{t.icon}</Text>
              <Text style={[styles.pillText, activeTab === t.key && styles.pillTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ObservableErrorBoundary fallbackTitle="Error en dashboard">
        <DashboardWithData
          selectedLoteId={selectedLoteId}
          onSelectLote={setSelectedLoteId}
          activeTab={activeTab}
        />
      </ObservableErrorBoundary>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  tabPills: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 3,
    gap: 3,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: 10,
  },
  pillActive: { backgroundColor: colors.surfaceElevated },
  pillIcon: { fontSize: 14 },
  pillText: { color: colors.textSecondary, fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
  pillTextActive: { color: colors.textPrimary, fontWeight: typography.weights.bold },
  tabContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl },
  loteRow: { gap: spacing.xs, paddingBottom: spacing.md },
  loteChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  loteChipActive: { borderColor: colors.primary, backgroundColor: 'rgba(0,214,143,0.12)' },
  loteChipText: { color: colors.textSecondary, fontSize: typography.sizes.sm },
  loteChipTextActive: { color: colors.primary, fontWeight: typography.weights.bold },
  kpiRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  section: { marginBottom: spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  sectionTitle: { color: colors.textPrimary, fontSize: typography.sizes.md, fontWeight: typography.weights.bold },
  gdpValue: { color: colors.primary, fontSize: typography.sizes.md, fontWeight: typography.weights.heavy },
  eventoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  eventoIconBox: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  eventoIcon: { fontSize: 18 },
  eventoInfo: { flex: 1 },
  eventoTipo: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },
  eventoValor: { color: colors.textSecondary, fontSize: typography.sizes.xs },
  eventoTime: { color: colors.textDisabled, fontSize: typography.sizes.xs, fontVariant: ['tabular-nums'] },
  precioCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  precioRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  precioItem: { flex: 1, alignItems: 'center', backgroundColor: colors.surfaceElevated, borderRadius: 10, padding: spacing.sm },
  precioItemVal: { color: colors.primary, fontSize: typography.sizes.md, fontWeight: typography.weights.bold },
  precioItemLabel: { color: colors.textSecondary, fontSize: typography.sizes.xs, marginTop: 2 },
  precioDate: { color: colors.textDisabled, fontSize: typography.sizes.xs, marginTop: spacing.sm },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  distLabel: { width: 80, fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold },
  distBarBg: { flex: 1, height: 8, backgroundColor: colors.surfaceElevated, borderRadius: 4, overflow: 'hidden' },
  distBar: { height: 8, borderRadius: 4 },
  distPct: { width: 32, color: colors.textSecondary, fontSize: typography.sizes.xs, textAlign: 'right' },
});
