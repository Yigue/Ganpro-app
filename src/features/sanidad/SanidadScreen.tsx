import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
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
import type MedicamentoModel from '@data/models/MedicamentoModel';
import type TratamientoSanidadModel from '@data/models/TratamientoSanidadModel';
import type ProtocoloIATFModel from '@data/models/ProtocoloIATFModel';
import { MedicamentoFormModal } from './MedicamentoFormModal';
import { TratamientoFormModal } from './TratamientoFormModal';
import { ProtocoloFormModal } from './ProtocoloFormModal';

type Tab = 'vademecum' | 'tratamientos' | 'iatf';

// ── Vademécum ────────────────────────────────────────────────────────────────

interface VademecumProps {
  medicamentos: MedicamentoModel[];
  onAdd: () => void;
}

function VademecumInner({ medicamentos, onAdd }: VademecumProps) {
  return (
    <>
      <View style={styles.tabHeader}>
        <Text style={styles.tabSubtitle}>{medicamentos.length} medicamentos</Text>
        <Button label="+ Agregar" onPress={onAdd} size="sm" />
      </View>
      {medicamentos.length === 0 ? (
        <EmptyState icon="💊" title="Vademécum vacío" subtitle="Agregá medicamentos para registrar tratamientos" />
      ) : (
        <FlatList
          data={medicamentos}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => (
            <ObservableErrorBoundary key={item.id}>
              <MedicamentoCard med={item} />
            </ObservableErrorBoundary>
          )}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </>
  );
}

const VademecumWithData = withObservables(['onAdd'], () => ({
  medicamentos: database.get<MedicamentoModel>('medicamentos').query(Q.sortBy('nombre', Q.asc)).observe(),
}))(VademecumInner);

function MedicamentoCard({ med }: { med: MedicamentoModel }) {
  return (
    <View style={styles.card}>
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
    </View>
  );
}

// ── Tratamientos ─────────────────────────────────────────────────────────────

interface TratamientosProps {
  tratamientos: TratamientoSanidadModel[];
  onAdd: () => void;
}

function TratamientosInner({ tratamientos, onAdd }: TratamientosProps) {
  return (
    <>
      <View style={styles.tabHeader}>
        <Text style={styles.tabSubtitle}>{tratamientos.length} recientes</Text>
        <Button label="+ Registrar" onPress={onAdd} size="sm" />
      </View>
      {tratamientos.length === 0 ? (
        <EmptyState icon="💉" title="Sin tratamientos" subtitle="Registrá aplicaciones de medicamentos aquí" />
      ) : (
        <FlatList
          data={tratamientos}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => (
            <ObservableErrorBoundary key={item.id}>
              <TratamientoCard tratamiento={item} />
            </ObservableErrorBoundary>
          )}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </>
  );
}

const TratamientosWithData = withObservables(['onAdd'], () => ({
  tratamientos: database
    .get<TratamientoSanidadModel>('tratamientos_sanidad')
    .query(Q.sortBy('fecha_aplicacion', Q.desc), Q.take(100))
    .observe(),
}))(TratamientosInner);

function TratamientoCard({ tratamiento }: { tratamiento: TratamientoSanidadModel }) {
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

// ── Protocolos IATF ──────────────────────────────────────────────────────────

interface ProtocolosProps {
  protocolos: ProtocoloIATFModel[];
  onAdd: () => void;
}

function ProtocolosInner({ protocolos, onAdd }: ProtocolosProps) {
  return (
    <>
      <View style={styles.tabHeader}>
        <Text style={styles.tabSubtitle}>{protocolos.length} activos</Text>
        <Button label="+ Nuevo" onPress={onAdd} size="sm" />
      </View>
      {protocolos.length === 0 ? (
        <EmptyState icon="🔬" title="Sin protocolos" subtitle="Iniciá un protocolo IATF para el lote" />
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
    </>
  );
}

const ProtocolosWithData = withObservables(['onAdd'], () => ({
  protocolos: database
    .get<ProtocoloIATFModel>('protocolos_iatf')
    .query(Q.where('estado', 'ACTIVO'), Q.sortBy('fecha_inicio', Q.desc))
    .observe(),
}))(ProtocolosInner);

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

// ── Main Screen ──────────────────────────────────────────────────────────────

export function SanidadScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('vademecum');
  const [showMedModal, setShowMedModal] = useState(false);
  const [showTratModal, setShowTratModal] = useState(false);
  const [showProtModal, setShowProtModal] = useState(false);

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'vademecum', label: 'Vademécum', icon: '💊' },
    { key: 'tratamientos', label: 'Tratamientos', icon: '💉' },
    { key: 'iatf', label: 'IATF', icon: '🔬' },
  ];

  return (
    <ObservableErrorBoundary fallbackTitle="Error al cargar sanidad">
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Sanidad</Text>
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
          {activeTab === 'vademecum' && (
            <VademecumWithData onAdd={() => setShowMedModal(true)} />
          )}
          {activeTab === 'tratamientos' && (
            <TratamientosWithData onAdd={() => setShowTratModal(true)} />
          )}
          {activeTab === 'iatf' && (
            <ProtocolosWithData onAdd={() => setShowProtModal(true)} />
          )}
        </View>

        <MedicamentoFormModal
          visible={showMedModal}
          onClose={() => setShowMedModal(false)}
        />
        <TratamientoFormModal
          visible={showTratModal}
          onClose={() => setShowTratModal(false)}
        />
        <ProtocoloFormModal
          visible={showProtModal}
          onClose={() => setShowProtModal(false)}
        />
      </SafeAreaView>
    </ObservableErrorBoundary>
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
    borderColor: colors.warning,
    backgroundColor: 'rgba(255,170,0,0.12)',
  },
  tabBtnIcon: { fontSize: 16 },
  tabBtnText: { color: colors.textSecondary, fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
  tabBtnTextActive: { color: colors.warning, fontWeight: typography.weights.bold },
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
  cardMain: { flex: 1 },
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
  carenciaBadgeSafe: { backgroundColor: 'rgba(0,214,143,0.12)' },
  carenciaBadgeText: {
    color: colors.error,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  carenciaBadgeTextSafe: { color: colors.primary },
  protocoloDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  iatfBadge: { backgroundColor: 'rgba(195,91,208,0.15)' },
  iatfBadgeText: { color: '#C35BD0' },
});
