import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import withObservables from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';
import { EmptyState } from '@shared/components/EmptyState';
import { ObservableErrorBoundary } from '@shared/components/ObservableErrorBoundary';
import { colors, spacing, typography } from '@theme/index';
import { database } from '@data/database/database';
import { calcularGDP } from '@core/utils/nutricionEngine';
import { EVENTO_TIPO, type EventoTipoType } from '@core/constants/eventTypes';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type EventoModel from '@data/models/EventoModel';
import type LoteModel from '@data/models/LoteModel';
import type PrecioMercadoModel from '@data/models/PrecioMercadoModel';
import type AnimalModel from '@data/models/AnimalModel';

type DashTab = 'operativo' | 'economico';

type TipoMeta = {
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
};

const TIPO_META: Record<EventoTipoType, TipoMeta> = {
  PESAJE:      { iconName: 'scale-outline',             color: colors.info },
  VACUNACION:  { iconName: 'medical-outline',           color: colors.warning },
  CAMBIO_LOTE: { iconName: 'swap-horizontal-outline',   color: colors.primary },
  TACTO:       { iconName: 'flask-outline',             color: '#C35BD0' },
  OTRO:        { iconName: 'document-text-outline',     color: colors.textSecondary },
};

// ── GDP Line Chart ─────────────────────────────────────────────────────────────

function SimpleLineChart({ data }: { data: { x: number; y: number }[] }) {
  if (data.length < 2) {
    return (
      <EmptyState
        icon="⚖️"
        title="Pocos pesajes"
        subtitle="Registrá al menos 2 pesajes para ver la curva GDP"
      />
    );
  }

  const CHART_H = 130;
  const maxY = Math.max(...data.map((d) => d.y));
  const minY = Math.min(...data.map((d) => d.y));
  const range = maxY - minY || 1;

  const points = data.map((point, i) => ({
    xPct: i / (data.length - 1),
    yPct: (point.y - minY) / range,
    ...point,
  }));

  return (
    <View style={chartStyles.container}>
      <View style={[chartStyles.chart, { height: CHART_H }]}>
        {/* Connecting lines between consecutive dots */}
        {points.slice(1).map((pt, i) => {
          const prev = points[i];
          const x1 = prev.xPct * 84 + 4;
          const x2 = pt.xPct * 84 + 4;
          const y1 = prev.yPct * (CHART_H - 32) + 12;
          const y2 = pt.yPct * (CHART_H - 32) + 12;
          const dy = y2 - y1;
          const dxPx = (x2 - x1) * 3; // ~3px per 1%
          const length = Math.sqrt(dxPx ** 2 + dy ** 2);
          const angle = Math.atan2(dy, dxPx) * (180 / Math.PI);

          return (
            <View
              key={`line-${i}`}
              style={{
                position: 'absolute',
                left: `${x1}%` as `${number}%`,
                bottom: y1 + 4,
                width: length,
                height: 1.5,
                backgroundColor: `${colors.primary}80`,
                transformOrigin: 'left center',
                transform: [{ rotate: `${angle}deg` }],
              }}
            />
          );
        })}
        {/* Dots */}
        {points.map((pt, i) => (
          <View
            key={i}
            style={[
              chartStyles.dot,
              {
                left: `${pt.xPct * 84 + 4}%` as `${number}%`,
                bottom: pt.yPct * (CHART_H - 32) + 12,
              },
            ]}
          />
        ))}
        <Text style={chartStyles.maxLabel}>{maxY.toFixed(1)} kg</Text>
        <Text style={chartStyles.minLabel}>{minY.toFixed(1)} kg</Text>
      </View>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: { marginTop: spacing.sm },
  chart: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    position: 'relative',
    paddingHorizontal: spacing.sm,
  },
  dot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  maxLabel: {
    position: 'absolute',
    top: 8,
    right: 8,
    color: colors.textDisabled,
    fontSize: typography.sizes.xs,
  },
  minLabel: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    color: colors.textDisabled,
    fontSize: typography.sizes.xs,
  },
});

// ── Semáforo Card ─────────────────────────────────────────────────────────────

function SemaforoCard({
  title,
  value,
  status,
  trend,
}: {
  title: string;
  value: string;
  status: 'green' | 'yellow' | 'red' | 'gray';
  trend?: 'up' | 'down' | 'flat';
}) {
  const color =
    status === 'green'
      ? colors.primary
      : status === 'yellow'
        ? colors.warning
        : status === 'red'
          ? colors.error
          : colors.textDisabled;

  const trendIcon: React.ComponentProps<typeof Ionicons>['name'] | null =
    trend === 'up' ? 'trending-up-outline'
    : trend === 'down' ? 'trending-down-outline'
    : trend === 'flat' ? 'remove-outline'
    : null;

  const trendColor =
    trend === 'up' ? colors.primary
    : trend === 'down' ? colors.error
    : colors.textSecondary;

  return (
    <View style={[semaforoStyles.card, { borderColor: `${color}40` }]}>
      <View style={semaforoStyles.valueRow}>
        <Text style={[semaforoStyles.value, { color }]}>{value}</Text>
        {trendIcon != null && (
          <Ionicons name={trendIcon} size={14} color={trendColor} />
        )}
      </View>
      <Text style={semaforoStyles.title}>{title}</Text>
    </View>
  );
}

const semaforoStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  value: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.heavy,
    fontVariant: ['tabular-nums'],
  },
  title: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
    marginTop: 4,
  },
});

// ── Date grouping ─────────────────────────────────────────────────────────────

function groupEventosByDate(eventos: EventoModel[]): { label: string; data: EventoModel[] }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups = new Map<string, EventoModel[]>();

  for (const evento of eventos) {
    const d = new Date(evento.timestamp);
    d.setHours(0, 0, 0, 0);
    let label: string;
    if (d.getTime() === today.getTime()) label = 'Hoy';
    else if (d.getTime() === yesterday.getTime()) label = 'Ayer';
    else label = format(d, "d 'de' MMMM", { locale: es });

    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(evento);
  }

  return Array.from(groups.entries()).map(([label, data]) => ({ label, data }));
}

// ── Dashboard Inner ───────────────────────────────────────────────────────────

interface DashboardOuterProps {
  selectedLoteId: string | null;
  onSelectLote: (id: string | null) => void;
}

interface DashboardProps extends DashboardOuterProps {
  pesajes: EventoModel[];
  eventosRecientes: EventoModel[];
  lotes: LoteModel[];
  ultimoPrecio: PrecioMercadoModel[];
  animalesMuertos: AnimalModel[];
  todosAnimales: AnimalModel[];
}

function DashboardInner({
  pesajes,
  eventosRecientes,
  lotes,
  ultimoPrecio,
  animalesMuertos,
  todosAnimales,
  selectedLoteId,
  onSelectLote,
}: DashboardProps) {
  const precio = ultimoPrecio[0];

  const chartData = useMemo(() => {
    const sorted = [...pesajes].sort((a, b) => a.timestamp - b.timestamp);
    return sorted
      .filter((p) => p.valor != null)
      .map((p) => ({ x: p.timestamp, y: p.valor! }));
  }, [pesajes]);

  const gdpInput = useMemo(() => {
    const sorted = [...pesajes].sort((a, b) => a.timestamp - b.timestamp);
    return sorted
      .filter((p) => p.valor != null)
      .map((p) => ({ timestamp: p.timestamp, valor: p.valor! }));
  }, [pesajes]);

  const gdp = useMemo(() => {
    if (gdpInput.length < 2) return null;
    return calcularGDP(gdpInput);
  }, [gdpInput]);

  const mortalidadPct = todosAnimales.length > 0
    ? ((animalesMuertos.length / todosAnimales.length) * 100).toFixed(1)
    : '0.0';

  const mortalidadStatus = parseFloat(mortalidadPct) < 1 ? 'green' : parseFloat(mortalidadPct) < 3 ? 'yellow' : 'red';

  return (
    <ScrollView contentContainerStyle={dashStyles.scrollContent}>
      {/* Lote selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={dashStyles.loteRow}
      >
        <TouchableOpacity
          style={[dashStyles.loteChip, selectedLoteId === null && dashStyles.loteChipActive]}
          onPress={() => onSelectLote(null)}
        >
          <Text style={[dashStyles.loteChipText, selectedLoteId === null && dashStyles.loteChipTextActive]}>
            Todos
          </Text>
        </TouchableOpacity>
        {lotes.map((l) => (
          <TouchableOpacity
            key={l.id}
            style={[dashStyles.loteChip, selectedLoteId === l.id && dashStyles.loteChipActive]}
            onPress={() => onSelectLote(l.id)}
          >
            <Text style={[dashStyles.loteChipText, selectedLoteId === l.id && dashStyles.loteChipTextActive]}>
              {l.nombre}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* GDP Section */}
      <View style={dashStyles.section}>
        <View style={dashStyles.sectionHeader}>
          <Text style={dashStyles.sectionTitle}>Ganancia Diaria de Peso</Text>
          {gdp != null && (
            <Text style={dashStyles.gdpValue}>{gdp.toFixed(2)} kg/día</Text>
          )}
        </View>
        <SimpleLineChart data={chartData} />
      </View>

      {/* Semáforo */}
      <View style={dashStyles.section}>
        <Text style={dashStyles.sectionTitle}>Indicadores</Text>
        <View style={dashStyles.semaforoRow}>
          <SemaforoCard
            title="GDP"
            value={gdp != null ? `${gdp.toFixed(1)}kg/d` : 'N/D'}
            status={gdp != null ? (gdp >= 0.8 ? 'green' : gdp >= 0.5 ? 'yellow' : 'red') : 'gray'}
            trend={gdp != null ? (gdp >= 0.8 ? 'up' : gdp >= 0.5 ? 'flat' : 'down') : undefined}
          />
          <SemaforoCard
            title="Mortalidad"
            value={`${mortalidadPct}%`}
            status={mortalidadStatus}
          />
          <SemaforoCard
            title="Precio"
            value={precio ? `$${precio.novilloKg}` : 'N/C'}
            status={precio ? 'green' : 'gray'}
          />
        </View>
      </View>

      {/* Historial reciente */}
      <View style={dashStyles.section}>
        <Text style={dashStyles.sectionTitle}>Historial Reciente</Text>
        {eventosRecientes.length === 0 ? (
          <EmptyState icon="📋" title="Sin eventos" subtitle="Los eventos aparecerán aquí" />
        ) : (
          groupEventosByDate(eventosRecientes).map((group) => (
            <View key={group.label}>
              <View style={dashStyles.dateGroupHeader}>
                <Text style={dashStyles.dateGroupLabel}>{group.label}</Text>
                <View style={dashStyles.dateGroupLine} />
              </View>
              {group.data.map((e) => (
                <ObservableErrorBoundary key={e.id}>
                  <EventoRow evento={e} />
                </ObservableErrorBoundary>
              ))}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function EventoRow({ evento }: { evento: EventoModel }) {
  const meta = TIPO_META[evento.tipo as EventoTipoType] ?? TIPO_META.OTRO;
  return (
    <View style={dashStyles.eventoRow}>
      <View style={[dashStyles.eventoIconContainer, { borderColor: `${meta.color}30` }]}>
        <Ionicons name={meta.iconName} size={18} color={meta.color} />
      </View>
      <View style={dashStyles.eventoInfo}>
        <Text style={[dashStyles.eventoTipo, { color: meta.color }]}>{evento.tipo}</Text>
        <Text style={dashStyles.eventoAnimal}>Animal: {evento.animalId.slice(0, 8)}…</Text>
      </View>
      <Text style={dashStyles.eventoTime}>
        {format(new Date(evento.timestamp), 'dd/MM HH:mm', { locale: es })}
      </Text>
    </View>
  );
}

const DashboardWithData = withObservables(
  ['selectedLoteId'],
  ({ selectedLoteId }: DashboardOuterProps) => ({
    pesajes: database
      .get<EventoModel>('eventos')
      .query(
        Q.where('tipo', EVENTO_TIPO.PESAJE),
        Q.sortBy('timestamp', Q.asc),
        Q.take(30)
      )
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
    todosAnimales: database
      .get<AnimalModel>('animals')
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
    <ObservableErrorBoundary fallbackTitle="Error al cargar dashboard">
      <SafeAreaView style={dashStyles.container} edges={['top']}>
        <View style={dashStyles.header}>
          <Text style={dashStyles.title}>Dashboard</Text>
        </View>
        <DashboardWithData
          selectedLoteId={selectedLoteId}
          onSelectLote={setSelectedLoteId}
        />
      </SafeAreaView>
    </ObservableErrorBoundary>
  );
}

const dashStyles = StyleSheet.create({
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
  scrollContent: { paddingBottom: spacing.xxl },
  loteRow: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  loteChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  loteChipActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0,214,143,0.12)',
  },
  loteChipText: { color: colors.textSecondary, fontSize: typography.sizes.sm },
  loteChipTextActive: { color: colors.primary, fontWeight: typography.weights.bold },
  section: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  gdpValue: {
    color: colors.primary,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.heavy,
    fontVariant: ['tabular-nums'],
  },
  semaforoRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  eventoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  eventoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventoInfo: { flex: 1 },
  eventoTipo: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },
  eventoAnimal: { color: colors.textSecondary, fontSize: typography.sizes.xs, marginTop: 2 },
  eventoTime: { color: colors.textDisabled, fontSize: typography.sizes.xs, fontVariant: ['tabular-nums'] },
  dateGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  dateGroupLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  dateGroupLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
});
