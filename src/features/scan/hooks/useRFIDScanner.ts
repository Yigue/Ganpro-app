import { useRef, useCallback, useEffect } from 'react';
import { TextInput, AppState, AppStateStatus, Keyboard } from 'react-native';
import { Q } from '@nozbe/watermelondb';
import { useScanStore } from '@store/scanStore';
import { useDatabase } from '@shared/hooks/useDatabase';
import { useHapticFeedback } from '@shared/hooks/useHapticFeedback';
import { useSoundFeedback } from '@shared/hooks/useSoundFeedback';
import { normalizeRfid, isValidRfid } from '@shared/utils/rfidUtils';
import type AnimalModel from '@data/models/AnimalModel';

const SINGLE_DEBOUNCE_MS = 300;
const CONTINUOUS_DEBOUNCE_MS = 3000;
const FOCUS_RETRY_DELAY_MS = 100;
const MOCK_RFID = 'MOCK-0001-TEST';

export interface UseRFIDScannerReturn {
  inputRef: React.RefObject<TextInput | null>;
  ensureFocus: () => void;
  onSubmitEditing: (event: { nativeEvent: { text: string } }) => void;
  onChangeText: (text: string) => void;
  injectMock: (rfid?: string) => void;
}

/**
 * Manages a visually-hidden TextInput that captures all HID keyboard events
 * from a Bluetooth RFID reader operating in keyboard/HID mode.
 *
 * The reader sends the tag ID as a sequence of keystrokes ending with Enter.
 * `showSoftInputOnFocus={false}` prevents the software keyboard from appearing.
 *
 * On each valid scan:
 *  - SESSION FLOW: enqueueLoading → DB query → hydrateQueueItem
 *  - INDIVIDUAL FLOW: sets phase, opens EventActionSheet or RegistrationModal
 */
export function useRFIDScanner(): UseRFIDScannerReturn {
  const inputRef = useRef<TextInput>(null);
  const lastScanTimeRef = useRef<number>(0);
  const continuousFilterRef = useRef<Map<string, number>>(new Map());
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const eventSheetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const registrationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setRfid = useScanStore(s => s.setRfid);
  const setPhase = useScanStore(s => s.setPhase);
  const openRegistrationModal = useScanStore(s => s.openRegistrationModal);
  const openEventSheet = useScanStore(s => s.openEventSheet);
  const enqueueLoading = useScanStore(s => s.enqueueLoading);
  const hydrateQueueItem = useScanStore(s => s.hydrateQueueItem);
  const isDuplicateScan = useScanStore(s => s.isDuplicateScan);
  const database = useDatabase();
  const { triggerSuccess, triggerError } = useHapticFeedback();
  const { playSuccess, playError } = useSoundFeedback();

  const ensureFocus = useCallback(() => {
    const input = inputRef.current;
    if (!input) return;
    input.blur();
    setTimeout(() => input.focus(), FOCUS_RETRY_DELAY_MS);
  }, []);

  // Re-focus when app returns to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextState === 'active'
      ) {
        ensureFocus();
      }
      appStateRef.current = nextState;
    });
    return () => {
      subscription.remove();
      if (eventSheetTimeoutRef.current) clearTimeout(eventSheetTimeoutRef.current);
      if (registrationTimeoutRef.current) clearTimeout(registrationTimeoutRef.current);
    };
  }, [ensureFocus]);

  // Safety net: dismiss software keyboard if it ever appears
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => {
      Keyboard.dismiss();
    });
    return () => show.remove();
  }, []);

  const processRfid = useCallback(
    async (rawId: string) => {
      const rfid = normalizeRfid(rawId);
      if (!isValidRfid(rfid)) return;

      const now = Date.now();

      const currentHardwareMode = useScanStore.getState().hardwareMode;
      if (currentHardwareMode === 'continuous') {
        const lastSeen = continuousFilterRef.current.get(rfid);
        if (lastSeen && now - lastSeen < CONTINUOUS_DEBOUNCE_MS) return;
        continuousFilterRef.current.set(rfid, now);
      } else {
        if (now - lastScanTimeRef.current < SINGLE_DEBOUNCE_MS) return;
        lastScanTimeRef.current = now;
      }

      const currentSessionActive = useScanStore.getState().sessionActive;
      const currentBatchMode = useScanStore.getState().batchMode;

      if (currentBatchMode && currentSessionActive) {
        // ── SESSION FLOW ──────────────────────────────────────────────────────
        if (isDuplicateScan(rfid)) {
          // already in queue — do nothing
          return;
        }
        enqueueLoading(rfid);

        try {
          const results = await database
            .get<AnimalModel>('animals')
            .query(Q.where('id_caravana', rfid))
            .fetch();

          const animal = results[0];

          if (animal) {
            hydrateQueueItem(rfid, {
              status: 'pending',
              animalId: animal.id,
              categoria: animal.categoria,
              estado: animal.estado,
            });
            triggerSuccess();
            playSuccess();
          } else {
            hydrateQueueItem(rfid, { status: 'pending_registration' });
            triggerError();
            playError();
          }
        } catch (error) {
          hydrateQueueItem(rfid, { status: 'pending', error: 'DB error' });
          triggerError();
        }
      } else {
        // ── INDIVIDUAL FLOW (sin sesión) ─────────────────────────────────────
        setRfid(rfid);
        setPhase('scanning');

        try {
          const results = await database
            .get<AnimalModel>('animals')
            .query(Q.where('id_caravana', rfid))
            .fetch();

          const animal = results[0];

          if (animal) {
            setPhase('found');
            triggerSuccess();
            playSuccess();
            if (eventSheetTimeoutRef.current) clearTimeout(eventSheetTimeoutRef.current);
            eventSheetTimeoutRef.current = setTimeout(() => openEventSheet(), 50);
          } else {
            setPhase('not_found');
            triggerError();
            playError();
            // Eliminado: no abrimos RegistrationModal automáticamente.
            // Dejamos que el usuario elija en IndividualModeView.
          }
        } catch (error) {
          console.error('[RFID] DB query error:', error);
          setPhase('error');
          triggerError();
        }
      }
    },
    [
      database,
      setRfid,
      setPhase,
      openRegistrationModal,
      openEventSheet,
      enqueueLoading,
      hydrateQueueItem,
      isDuplicateScan,
      triggerSuccess,
      triggerError,
      playSuccess,
      playError,
    ]
  );

  /**
   * Primary handler: fires when the reader sends Enter after the RFID string.
   * `blurOnSubmit={false}` keeps the TextInput focused for the next scan.
   */
  const onSubmitEditing = useCallback(
    (event: { nativeEvent: { text: string } }) => {
      const rfid = event.nativeEvent.text;
      inputRef.current?.clear();
      if (rfid) processRfid(rfid);
    },
    [processRfid]
  );

  /**
   * Accumulates characters as they arrive (fallback buffer).
   * Most HID readers terminate with Enter, so onSubmitEditing is primary.
   */
  const onChangeText = useCallback((_text: string) => {
    // Buffer is read directly from nativeEvent.text in onSubmitEditing
  }, []);

  /**
   * Dev/staging mock injection — simulates a physical HID scan without hardware.
   * Calls processRfid with the provided RFID (or the hardcoded MOCK_RFID default),
   * then synchronously re-focuses the hidden TextInput so HID capture is unbroken.
   *
   * The caller does NOT need to call ensureFocus after this; the hook owns focus.
   */
  const injectMock = useCallback(
    (rfid: string = MOCK_RFID) => {
      processRfid(rfid);
      ensureFocus();
    },
    [processRfid, ensureFocus]
  );

  return { inputRef, ensureFocus, onSubmitEditing, onChangeText, injectMock };
}
