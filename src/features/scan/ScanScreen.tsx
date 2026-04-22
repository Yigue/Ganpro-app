import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Text,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useScanStore } from '@store/scanStore';
import { useSyncStore } from '@store/syncStore';
import { useRFIDScanner } from './hooks/useRFIDScanner';
import { AnimalRegistrationModal } from './AnimalRegistrationModal';
import { EventActionSheet } from './EventActionSheet';
import { BatchActionSheet } from './BatchActionSheet';
import {
  SegmentedControl,
  IndividualModeView,
  BatchModeView,
} from './components';
import { colors, spacing, typography } from '@theme/index';

/**
 * Show the mock scan button in dev builds AND in any build where the
 * EXPO_PUBLIC_ENABLE_MOCK_BUTTON env variable is set to "true".
 * Set this variable in eas.json under the "preview" profile (or any staging profile)
 * to surface the button outside the Expo dev client:
 *
 *   "preview": { "env": { "EXPO_PUBLIC_ENABLE_MOCK_BUTTON": "true" } }
 */
const SHOW_MOCK_BUTTON =
  __DEV__ || process.env.EXPO_PUBLIC_ENABLE_MOCK_BUTTON === 'true';

export function ScanScreen() {
  const currentRfid = useScanStore(s => s.currentRfid);
  const phase = useScanStore(s => s.phase);
  const isRegistrationModalOpen = useScanStore(s => s.isRegistrationModalOpen);
  const isEventSheetOpen = useScanStore(s => s.isEventSheetOpen);
  const closeRegistrationModal = useScanStore(s => s.closeRegistrationModal);
  const closeEventSheet = useScanStore(s => s.closeEventSheet);
  const reset = useScanStore(s => s.reset);
  const batchMode = useScanStore(s => s.batchMode);
  const queue = useScanStore(s => s.queue);
  const isBatchSheetOpen = useScanStore(s => s.isBatchSheetOpen);
  const toggleBatchMode = useScanStore(s => s.toggleBatchMode);
  const openBatchSheet = useScanStore(s => s.openBatchSheet);
  const closeBatchSheet = useScanStore(s => s.closeBatchSheet);
  const clearQueue = useScanStore(s => s.clearQueue);
  const isOnline = useSyncStore(s => s.isOnline);
  const syncStatus = useSyncStore(s => s.status);

  const { inputRef, ensureFocus, onSubmitEditing, onChangeText, injectMock } =
    useRFIDScanner();

  const flashAnim = useRef(new Animated.Value(0)).current;

  // Full-screen flash overlay on scan result
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

  const handleModeChange = useCallback(
    (index: 0 | 1) => {
      if ((index === 0) === !batchMode) return; // no change
      toggleBatchMode();
      ensureFocus();
    },
    [batchMode, toggleBatchMode, ensureFocus]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>

      {/*
       * ── Invisible RFID Capture Input ──────────────────────────────────────
       * This is the core of HID keyboard capture. Visually hidden (height: 1,
       * opacity: 0) but remains in layout so it can receive focus.
       * showSoftInputOnFocus={false} prevents the soft keyboard from appearing.
       * blurOnSubmit={false} keeps focus after Enter for immediate next scan.
       *
       * CRITICAL: Do NOT move or conditionally render this input. It MUST stay
       * unconditionally in ScanScreen at the root level to ensure HID events
       * are captured at all times.
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

      {/* Mode toggle */}
      <View style={styles.segmentedWrapper}>
        <SegmentedControl
          options={['Individual', 'Lote']}
          selectedIndex={batchMode ? 1 : 0}
          onChange={handleModeChange}
          style={styles.segmentedControl}
        />
      </View>

      {/* Dev/staging mock button — absent in production */}
      {SHOW_MOCK_BUTTON && (
        <TouchableOpacity
          style={styles.mockBtn}
          onPress={() => injectMock()}
          activeOpacity={0.8}
          accessibilityLabel="Simular Escaneo"
          accessibilityRole="button"
        >
          <Text style={styles.mockBtnText}>Simular Escaneo</Text>
        </TouchableOpacity>
      )}

      {/* Center content — delegated to mode sub-components */}
      <View style={styles.centerContent}>
        {batchMode ? (
          <BatchModeView
            queue={queue}
            onClear={clearQueue}
            onProcess={openBatchSheet}
            ensureFocus={ensureFocus}
          />
        ) : (
          <IndividualModeView phase={phase} currentRfid={currentRfid} />
        )}
      </View>

      {/* Bottom refocus button — individual mode only */}
      {!batchMode && (
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
      )}

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

      <BatchActionSheet
        visible={isBatchSheetOpen}
        onClose={() => {
          closeBatchSheet();
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
    flex: 1,
  },
  segmentedWrapper: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  segmentedControl: {
    alignSelf: 'center',
    width: 240,
  },
  mockBtn: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    backgroundColor: colors.warningAlpha,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.warning,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockBtnText: {
    color: colors.warning,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    letterSpacing: 0.5,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
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
