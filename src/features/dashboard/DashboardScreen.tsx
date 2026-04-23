import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

const TIPO_META: Record<EventoTipoType, { icon: string; color: string }> = {
  PESAJE: { icon: '⚖️', color: colors.info },
  VACUNACION: { icon: '💉', color: colors.warning },
  CAMBIO_LOTE: { icon: '🔀', color: colors.primary },
  TACTO: { icon: '🔬', color: '#C35BD0' },
  OTRO: { icon: '📋', color: colors.textSecondary },
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

  const CHART_H = 120;
  const maxY = Math.max(...data.map((d) => d.y));
  const minY = Math.min(...data.map((d) => d.y));
  const range = maxY - minY || 1;

  return (
    <View style={chartStyles.container}>
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
                  bottom: yPct * (CHART_H - 24) + 8,
                },
              ]}
            />
          );
        })}
        <Text style={chartStyles.maxLabel}>{maxY.toFixed(0)} kg</Text>
        <Text style={chartStyles.minLabel}>{minY.toFixed(0)} kg</Text>
      </View>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: { marginTop: spacing.sm },
  chart: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    position: 'relative',
    paddingHorizontal: spacing.sm,
  },
  dot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
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
}: {
  title: string;
  value: string;
  status: 'green' | 'yellow' | 'red' | 'gray';
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
    <View style={[semaforoStyles.card, { borderColor: `${color}40` }]}>
      <Text style={[semaforoStyles.value, { color }]}>{value}</Text>
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
          eventosRecientes.map((e) => (
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
    <View style={dashStyles.eventoRow}>
      <Text style={dashStyles.eventoIcon}>{meta.icon}</Text>
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
  eventoIcon: { fontSize: 22 },
  eventoInfo: { flex: 1 },
  eventoTipo: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },
  eventoAnimal: { color: colors.textSecondary, fontSize: typography.sizes.xs, marginTop: 2 },
  eventoTime: { color: colors.textDisabled, fontSize: typography.sizes.xs, fontVariant: ['tabular-nums'] },
});
