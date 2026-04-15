import { create } from 'zustand';

export type ScanPhase =
  | 'idle'       // Waiting for scan
  | 'scanning'   // Input being received
  | 'found'      // Animal found in DB
  | 'not_found'  // Animal not in DB — show registration modal
  | 'error';     // DB error or invalid RFID

interface ScanState {
  currentRfid: string | null;
  phase: ScanPhase;
  lastScanTime: number | null;
  isRegistrationModalOpen: boolean;
  isEventSheetOpen: boolean;

  setRfid: (rfid: string) => void;
  setPhase: (phase: ScanPhase) => void;
  openRegistrationModal: () => void;
  closeRegistrationModal: () => void;
  openEventSheet: () => void;
  closeEventSheet: () => void;
  reset: () => void;
}

export const useScanStore = create<ScanState>((set) => ({
  currentRfid: null,
  phase: 'idle',
  lastScanTime: null,
  isRegistrationModalOpen: false,
  isEventSheetOpen: false,

  setRfid: (rfid) => set({ currentRfid: rfid, lastScanTime: Date.now() }),
  setPhase: (phase) => set({ phase }),
  openRegistrationModal: () => set({ isRegistrationModalOpen: true }),
  closeRegistrationModal: () => set({ isRegistrationModalOpen: false, phase: 'idle' }),
  openEventSheet: () => set({ isEventSheetOpen: true }),
  closeEventSheet: () => set({ isEventSheetOpen: false }),
  reset: () =>
    set({
      currentRfid: null,
      phase: 'idle',
      isRegistrationModalOpen: false,
      isEventSheetOpen: false,
    }),
}));
