import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import withObservables from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ObservableErrorBoundary } from '@shared/components/ObservableErrorBoundary';
import { EmptyState } from '@shared/components/EmptyState';
import { colors, spacing, typography } from '@theme/index';
import { database } from '@data/database/database';
import { calcularGDP } from '@core/utils/nutricionEngine';
import { EVENTO_TIPO, type EventoTipoType } from '@core/constants/eventTypes';
import { SimpleLineChart } from '../ui/SimpleLineChart';
import { SemaforoCard } from '../ui/SemaforoCard';
import { LoteSelector } from '../ui/LoteSelector';
import type EventoModel from '@data/models/EventoModel';
import type LoteModel from '@data/models/LoteModel';
import type PrecioMercadoModel from '@data/models/PrecioMercadoModel';
import type AnimalModel from '@data/models/AnimalModel';

// ─── Types ──────────────────────────────────────────────────────────────────

interface DashboardContainerOuterProps {
  selectedLoteId: string | null;
  onSelectLote: (id: string | null) => void;
}

interface DashboardContainerProps extends DashboardContainerOuterProps {
  pesajes: EventoModel[];
  eventosRecientes: EventoModel[];
  lotes: LoteModel[];
  ultimoPrecio: PrecioMercadoModel[];
  animalesMuertos: AnimalModel[];
  todosAnimales: AnimalModel[];
}

const TIPO_META: Record<EventoTipoType, { icon: string; color: string }> = {
  PESAJE: { icon: '⚖️', color: colors.info },
  VACUNACION: { icon: '💉', color: colors.warning },
  CAMBIO_LOTE: { icon: '🔀', color: colors.primary },
  TACTO: { icon: '🔬', color: '#C35BD0' },
  OTRO: { icon: '📋', color: colors.textSecondary },
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function EventoRow({ evento }: { evento: EventoModel }) {
  const meta = TIPO_META[evento.tipo as EventoTipoType] ?? TIPO_META.OTRO;
  return (
    <View style={styles.eventoRow}>
      <Text style={styles.eventoIcon}>{meta.icon}</Text>
      <View style={styles.eventoInfo}>
        <Text style={[styles.eventoTipo, { color: meta.color }]}>{evento.tipo}</Text>
        <Text style={styles.eventoAnimal}>Animal: {evento.animalId.slice(0, 8)}…</Text>
      </View>
      <Text style={styles.eventoTime}>
        {format(new Date(evento.timestamp), 'dd/MM HH:mm', { locale: es })}
      </Text>
    </View>
  );
}

// ─── Inner View ──────────────────────────────────────────────────────────────

function DashboardView({
  pesajes,
  eventosRecientes,
  lotes,
  ultimoPrecio,
  animalesMuertos,
  todosAnimales,
  selectedLoteId,
  onSelectLote,
}: DashboardContainerProps) {
  const precio = ultimoPrecio[0];

  const chartData = useMemo(() => {
    return [...pesajes]
      .sort((a, b) => a.timestamp - b.timestamp)
      .filter((p) => p.valor != null)
      .map((p) => ({ x: p.timestamp, y: p.valor! }));
  }, [pesajes]);

  const gdp = useMemo(() => {
    const sorted = [...pesajes]
      .sort((a, b) => a.timestamp - b.timestamp)
      .filter((p) => p.valor != null)
      .map((p) => ({ timestamp: p.timestamp, valor: p.valor! }));
    if (sorted.length < 2) return null;
    return calcularGDP(sorted);
  }, [pesajes]);

  const mortalidadPct = todosAnimales.length > 0
    ? ((animalesMuertos.length / todosAnimales.length) * 100).toFixed(1)
    : '0.0';

  const mortalidadStatus = parseFloat(mortalidadPct) < 1
    ? 'green'
    : parseFloat(mortalidadPct) < 3
    ? 'yellow'
    : 'red';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
      </View>

      <LoteSelector
        lotes={lotes}
        selectedLoteId={selectedLoteId}
        onSelect={onSelectLote}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* GDP Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ganancia Diaria de Peso</Text>
            {gdp != null && (
              <Text style={styles.gdpValue}>{gdp.toFixed(2)} kg/día</Text>
            )}
          </View>
          <SimpleLineChart data={chartData} />
        </View>

        {/* Semáforo KPIs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Indicadores</Text>
          <View style={styles.semaforoRow}>
            <SemaforoCard
              title="GDP"
              value={gdp != null ? `${gdp.toFixed(1)}kg/d` : 'N/D'}
              status={gdp != null ? (gdp >= 0.8 ? 'green' : gdp >= 0.5 ? 'yellow' : 'red') : 'gray'}
            />
            <SemaforoCard
              title="Mortalidad"
              value={`${mortalidadPct}%`}
              status={mortalidadStatus as 'green' | 'yellow' | 'red' | 'gray'}
            />
            <SemaforoCard
              title="Precio"
              value={precio ? `$${precio.novilloKg}` : 'N/C'}
              status={precio ? 'green' : 'gray'}
            />
          </View>
        </View>

        {/* Historial reciente */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Historial Reciente</Text>
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
    </SafeAreaView>
  );
}

// ─── Container: connects WatermelonDB observables ────────────────────────────

/**
 * DashboardContainer — connects DashboardView with live WatermelonDB observables.
 * Filters pesajes and eventos by selectedLoteId when provided.
 */
export const DashboardContainer = withObservables(
  ['selectedLoteId'],
  ({ selectedLoteId }: DashboardContainerOuterProps) => ({
    pesajes: database
      .get<EventoModel>('eventos')
      .query(
        Q.where('tipo', EVENTO_TIPO.PESAJE),
        ...(selectedLoteId ? [Q.where('lote_id', selectedLoteId)] : []),
        Q.sortBy('timestamp', Q.asc),
        Q.take(30)
      )
      .observe(),
    eventosRecientes: database
      .get<EventoModel>('eventos')
      .query(
        ...(selectedLoteId ? [Q.where('lote_id', selectedLoteId)] : []),
        Q.sortBy('timestamp', Q.desc),
        Q.take(20)
      )
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
    todosAnimales: database.get<AnimalModel>('animals').query().observe(),
  })
)(DashboardView);

// ─── Styles ──────────────────────────────────────────────────────────────────

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
  scrollContent: { paddingBottom: spacing.xxl },
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
