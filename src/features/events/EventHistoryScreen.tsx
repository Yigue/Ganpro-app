import React, { useState } from 'react';
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
import { EVENTO_TIPO, type EventoTipoType } from '@core/constants/eventTypes';
import type EventoModel from '@data/models/EventoModel';
import { database } from '@data/database/database';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const TIPO_META: Record<
  EventoTipoType,
  { icon: string; label: string; color: string }
> = {
  PESAJE: { icon: '⚖️', label: 'Pesaje', color: colors.info },
  VACUNACION: { icon: '💉', label: 'Vacunación', color: colors.warning },
  CAMBIO_LOTE: { icon: '🔀', label: 'Cambio de Lote', color: colors.primary },
  TACTO: { icon: '🔬', label: 'Tacto', color: '#C35BD0' },
  OTRO: { icon: '📋', label: 'Otro', color: colors.textSecondary },
};

const FILTER_OPTIONS = [null, ...Object.values(EVENTO_TIPO)] as (EventoTipoType | null)[];

interface EventListOuterProps {
  filter: EventoTipoType | null;
  onFilterChange: (f: EventoTipoType | null) => void;
}

interface EventListProps extends EventListOuterProps {
  eventos: EventoModel[];
}

function EventListInner({ eventos, filter, onFilterChange }: EventListProps) {
  return (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>Historial</Text>
        <Text style={styles.subtitle}>{eventos.length} eventos recientes</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FILTER_OPTIONS.map((tipo) => {
          const meta = tipo ? TIPO_META[tipo] : null;
          return (
            <TouchableOpacity
              key={tipo ?? 'all'}
              style={[styles.filterChip, filter === tipo && styles.filterChipActive]}
              onPress={() => onFilterChange(tipo)}
            >
              {meta && <Text style={styles.filterChipIcon}>{meta.icon}</Text>}
              <Text
                style={[
                  styles.filterChipText,
                  filter === tipo && styles.filterChipTextActive,
                ]}
              >
                {meta?.label ?? 'Todos'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {eventos.length === 0 ? (
        <EmptyState
          icon="📋"
          title="Sin eventos"
          subtitle="Los eventos de escaneo aparecerán aquí"
        />
      ) : (
        <FlatList
          data={eventos}
          keyExtractor={(e) => e.id}
          renderItem={({ item }) => (
            <ObservableErrorBoundary key={item.id}>
              <EventListItem evento={item} />
            </ObservableErrorBoundary>
          )}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </>
  );
}

const EventListWithData = withObservables(
  ['filter'],
  ({ filter }: EventListOuterProps) => ({
    eventos: (filter
      ? database
          .get<EventoModel>('eventos')
          .query(Q.where('tipo', filter), Q.sortBy('timestamp', Q.desc), Q.take(100))
      : database
          .get<EventoModel>('eventos')
          .query(Q.sortBy('timestamp', Q.desc), Q.take(100))
    ).observe(),
  })
)(EventListInner);

export function EventHistoryScreen() {
  const [filter, setFilter] = useState<EventoTipoType | null>(null);

  return (
    <ObservableErrorBoundary fallbackTitle="Error al cargar historial">
      <SafeAreaView style={styles.container} edges={['top']}>
        <EventListWithData filter={filter} onFilterChange={setFilter} />
      </SafeAreaView>
    </ObservableErrorBoundary>
  );
}

function EventListItem({ evento }: { evento: EventoModel }) {
  const meta = TIPO_META[evento.tipo as EventoTipoType] ?? TIPO_META.OTRO;

  return (
    <View style={styles.item}>
      <View style={[styles.iconCircle, { backgroundColor: `${meta.color}20` }]}>
        <Text style={styles.itemIcon}>{meta.icon}</Text>
      </View>
      <View style={styles.itemInfo}>
        <View style={styles.itemRow}>
          <Text style={[styles.itemTipo, { color: meta.color }]}>{meta.label}</Text>
          {evento.valor != null && (
            <Text style={styles.itemValor}>{evento.valor} kg</Text>
          )}
        </View>
        <Text style={styles.itemAnimalId}>ID: {evento.animalId}</Text>
        {evento.notas ? (
          <Text style={styles.itemNotas} numberOfLines={1}>
            {evento.notas}
          </Text>
        ) : null}
      </View>
      <Text style={styles.itemTime}>
        {format(new Date(evento.timestamp), 'dd/MM HH:mm', { locale: es })}
      </Text>
    </View>
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
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    marginTop: 2,
  },
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
  filterChipActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0,214,143,0.12)',
  },
  filterChipIcon: { fontSize: 14 },
  filterChipText: { color: colors.textSecondary, fontSize: typography.sizes.sm },
  filterChipTextActive: { color: colors.primary, fontWeight: typography.weights.bold },
  list: { paddingBottom: spacing.xxl },
  separator: { height: 1, backgroundColor: colors.border },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.md,
    minHeight: spacing.touchTarget,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemIcon: { fontSize: 22 },
  itemInfo: { flex: 1 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemTipo: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  itemValor: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  itemAnimalId: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  itemNotas: {
    color: colors.textDisabled,
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  itemTime: {
    color: colors.textDisabled,
    fontSize: typography.sizes.xs,
    fontVariant: ['tabular-nums'],
  },
});
