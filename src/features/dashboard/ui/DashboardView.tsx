import React, {useMemo} from 'react';
import {View,Text,ScrollView} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {ObservableErrorBoundary} from '@shared/components/ObservableErrorBoundary';
import {EmptyState} from '@shared/components/EmptyState';
import {styles} from './dashboard-styles';
import {SimpleLineChart} from './SimpleLineChart';
import {SemaforoCard} from './SemaforoCard';
import {LoteSelector} from './LoteSelector';
import {EventoRow} from './EventoRow';
import {herdGain,dailyWeights} from '../../../shared/utils/herdMetrics';
import type {DashboardContainerProps} from '../model/dashboard-types';
export function DashboardView({
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

  const gain = useMemo(() => herdGain(pesajes.map(p => ({animalId:p.animalId, timestamp:p.timestamp, valor:p.valor}))), [pesajes]);
  const gdp = gain.dailyGain;
  const chartData = useMemo(() => dailyWeights(pesajes.map(p => ({animalId:p.animalId,timestamp:p.timestamp,valor:p.valor}))), [pesajes]);
  const mortalidadPct = todosAnimales.length > 0
    ? ((animalesMuertos.length / todosAnimales.length) * 100).toFixed(1)
    : '0.0';

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
            <Text style={styles.sectionTitle}>Ganancia de peso · últimos 90 días</Text>
            {gdp != null && (
              <Text style={styles.gdpValue}>{gdp.toFixed(2)} kg/día</Text>
            )}
          </View>
          <Text style={styles.eventoAnimal}>{gain.animals} animales con al menos dos pesadas. Activos sin toros; lote según pertenencia actual.</Text>
          <Text style={styles.eventoAnimal}>Incluye pesos cargados; todavía no distingue pesadas de estimaciones.</Text>
          <Text style={styles.eventoAnimal}>Peso medio por fecha; cambia con los animales pesados.</Text>
          <SimpleLineChart data={chartData} />
        </View>

        {/* Semáforo KPIs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Indicadores</Text>
          <Text style={styles.eventoAnimal}>Muertos / registros: proporción histórica, sin tasa por ejercicio.</Text>
          <View style={styles.semaforoRow}>
            <SemaforoCard
              title="GDP"
              value={gdp != null ? `${gdp.toFixed(1)}kg/d` : 'N/D'}
              status="gray"
            />
            <SemaforoCard
              title="Muertos / registros"
              value={`${mortalidadPct}%`}
              status="gray"
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
