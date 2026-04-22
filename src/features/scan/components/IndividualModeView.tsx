import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { colors, spacing, typography } from '@theme/index';
import type { ScanPhase } from '@store/scanStore';
import { AnimalCard } from '../AnimalCard';
import { RadarAnimation } from './RadarAnimation';

const PHASE_MESSAGES: Record<ScanPhase, string> = {
  idle: 'Escanee la caravana del animal',
  scanning: 'Leyendo...',
  found: 'Animal identificado',
  not_found: 'Tag no registrado',
  error: 'Error al leer',
};

const PHASE_COLORS: Record<ScanPhase, string> = {
  idle: colors.textSecondary,
  scanning: colors.info,
  found: colors.success,
  not_found: colors.warning,
  error: colors.error,
};

interface IndividualModeViewProps {
  phase: ScanPhase;
  currentRfid: string | null;
}

export function IndividualModeView({ phase, currentRfid }: IndividualModeViewProps) {
  if (phase === 'idle') {
    return (
      <View style={styles.idleContainer}>
        <RadarAnimation size={180} color={colors.primary} />
        <Text style={styles.idleSubtext}>
          Acerque el lector al arete del animal
        </Text>
      </View>
    );
  }

  return (
    <>
      <Text style={styles.rfidLabel}>ID Caravana</Text>
      <Text style={[styles.rfidValue, { color: PHASE_COLORS[phase] }]}>
        {currentRfid ?? '—'}
      </Text>

      <View style={[styles.phaseChip, { borderColor: PHASE_COLORS[phase] }]}>
        <Text style={[styles.phaseText, { color: PHASE_COLORS[phase] }]}>
          {PHASE_MESSAGES[phase]}
        </Text>
      </View>

      {phase === 'found' && currentRfid && (
        <AnimalCard rfid={currentRfid} />
      )}

      {phase === 'not_found' && (
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundIcon}>🏷️</Text>
          <Text style={styles.notFoundText}>Tag no registrado</Text>
          <Text style={styles.notFoundSubtext}>
            El arete escaneado no corresponde a ningún animal en el sistema
          </Text>
        </View>
      )}

      {phase === 'scanning' && (
        <View style={styles.scanningContainer}>
          <RadarAnimation size={120} color={colors.info} />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  idleContainer: {
    alignItems: 'center',
    gap: spacing.xl,
    paddingVertical: spacing.xl,
  },
  idleSubtext: {
    color: colors.textSecondary,
    fontSize: typography.sizes.md,
    textAlign: 'center',
  },
  rfidLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  rfidValue: {
    fontSize: typography.sizes.hero,
    fontWeight: typography.weights.heavy,
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  phaseChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  phaseText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  notFoundContainer: {
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  notFoundIcon: {
    fontSize: 48,
  },
  notFoundText: {
    color: colors.warning,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  notFoundSubtext: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  scanningContainer: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
});
