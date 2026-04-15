import React, { useEffect, useCallback, useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Text,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useScanStore, type ScanPhase } from '@store/scanStore';
import { useSyncStore } from '@store/syncStore';
import { useRFIDScanner } from './hooks/useRFIDScanner';
import { AnimalCard } from './AnimalCard';
import { AnimalRegistrationModal } from './AnimalRegistrationModal';
import { EventActionSheet } from './EventActionSheet';
import { colors, spacing, typography } from '@theme/index';

const PHASE_MESSAGES: Record<ScanPhase, string> = {
  idle: 'Escanee la caravana del animal',
  scanning: 'Leyendo...',
  found: 'Animal identificado ✓',
  not_found: 'Animal no registrado',
  error: 'Error al leer',
};

const PHASE_COLORS: Record<ScanPhase, string> = {
  idle: colors.textSecondary,
  scanning: colors.info,
  found: colors.success,
  not_found: colors.warning,
  error: colors.error,
};

export function ScanScreen() {
  const {
    currentRfid,
    phase,
    isRegistrationModalOpen,
    isEventSheetOpen,
    closeRegistrationModal,
    closeEventSheet,
    reset,
  } = useScanStore();
  const { isOnline, status: syncStatus } = useSyncStore();
  const { inputRef, ensureFocus, onSubmitEditing, onChangeText } = useRFIDScanner();

  const flashAnim = useRef(new Animated.Value(0)).current;

  // Flash screen on scan result
  useEffect(() => {
    if (phase === 'found' || phase === 'not_found' || phase === 'error') {
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    }
  }, [phase, flashAnim]);

  const flashBg =
    phase === 'found'
      ? colors.scanSuccess
      : phase === 'not_found' || phase === 'error'
      ? colors.scanError
      : 'transparent';

  const handleManualRefocus = useCallback(() => {
    reset();
    ensureFocus();
  }, [reset, ensureFocus]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>

      {/*
       * ── Invisible RFID Capture Input ──────────────────────────────────────
       * This is the core of HID keyboard capture. Visually hidden (height: 1,
       * opacity: 0) but remains in layout so it can receive focus.
       * showSoftInputOnFocus={false} prevents the soft keyboard from appearing.
       * blurOnSubmit={false} keeps focus after Enter for immediate next scan.
       */}
      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        autoFocus={true}
        showSoftInputOnFocus={false}
        autoCorrect={false}
        autoCapitalize="none"
        keyboardType="default"
        returnKeyType="done"
        onSubmitEditing={onSubmitEditing}
        onChangeText={onChangeText}
        onBlur={ensureFocus}
        blurOnSubmit={false}
        testID="rfid-input"
        accessible={false}
      />

      {/* Flash overlay */}
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: flashBg, opacity: flashAnim },
        ]}
        pointerEvents="none"
      />

      {/* Top status bar */}
      <View style={styles.statusBar}>
        <View style={[styles.dot, { backgroundColor: isOnline ? colors.success : colors.error }]} />
        <Text style={styles.statusText}>
          {isOnline ? 'En línea' : 'Sin conexión'}
          {syncStatus === 'syncing' ? ' · Sincronizando...' : ''}
          {syncStatus === 'success' ? ' · Sincronizado ✓' : ''}
        </Text>
      </View>

      {/* Center content */}
      <View style={styles.centerContent}>
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

        {phase === 'idle' && (
          <View style={styles.idleContainer}>
            <Text style={styles.idleIcon}>📡</Text>
            <Text style={styles.idleSubtext}>
              Acerque el lector al arete del animal
            </Text>
          </View>
        )}
      </View>

      {/* Bottom refocus button */}
      <TouchableOpacity
        style={styles.refocusButton}
        onPress={handleManualRefocus}
        activeOpacity={0.8}
        accessibilityLabel="Activar escáner"
        accessibilityRole="button"
      >
        <Text style={styles.refocusButtonText}>
          {phase === 'idle' ? 'TAP PARA ESCANEAR' : 'NUEVO ESCANEO'}
        </Text>
      </TouchableOpacity>

      {/* Modals */}
      <AnimalRegistrationModal
        visible={isRegistrationModalOpen}
        rfid={currentRfid ?? ''}
        onClose={closeRegistrationModal}
        onSaved={() => {
          closeRegistrationModal();
          ensureFocus();
        }}
      />

      <EventActionSheet
        visible={isEventSheetOpen}
        rfid={currentRfid ?? ''}
        onClose={() => {
          closeEventSheet();
          ensureFocus();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  hiddenInput: {
    // In layout but invisible — required for HID capture to work
    position: 'absolute',
    opacity: 0,
    height: 1,
    width: 1,
    top: 0,
    left: 0,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
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
  idleContainer: {
    alignItems: 'center',
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  idleIcon: { fontSize: 64 },
  idleSubtext: {
    color: colors.textSecondary,
    fontSize: typography.sizes.md,
    textAlign: 'center',
  },
  refocusButton: {
    margin: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: 16,
    height: spacing.touchTargetLg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refocusButtonText: {
    color: colors.textOnPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.heavy,
    letterSpacing: 2,
  },
});
