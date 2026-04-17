import { create } from 'zustand';

export type ScanPhase =
  | 'idle'       // Waiting for scan
  | 'scanning'   // Input being received
  | 'found'      // Animal found in DB
  | 'not_found'  // Animal not in DB — show registration modal
  | 'error';     // DB error or invalid RFID

export type QueueItemStatus = 'pending' | 'done' | 'error';

export interface QueueItem {
  rfid: string;
  scannedAt: number;
  status: QueueItemStatus;
  animalId?: string;
  error?: string;
}

interface ScanState {
  currentRfid: string | null;
  phase: ScanPhase;
  lastScanTime: number | null;
  isRegistrationModalOpen: boolean;
  isEventSheetOpen: boolean;

  // Batch mode
  batchMode: boolean;
  queue: QueueItem[];
  isBatchSheetOpen: boolean;

  setRfid: (rfid: string) => void;
  setPhase: (phase: ScanPhase) => void;
  openRegistrationModal: () => void;
  closeRegistrationModal: () => void;
  openEventSheet: () => void;
  closeEventSheet: () => void;
  reset: () => void;

  toggleBatchMode: () => void;
  enqueueScan: (rfid: string, animalId?: string) => void;
  updateQueueItem: (rfid: string, patch: Partial<QueueItem>) => void;
  clearQueue: () => void;
  openBatchSheet: () => void;
  closeBatchSheet: () => void;
}

export const useScanStore = create<ScanState>((set) => ({
  currentRfid: null,
  phase: 'idle',
  lastScanTime: null,
  isRegistrationModalOpen: false,
  isEventSheetOpen: false,

  batchMode: false,
  queue: [],
  isBatchSheetOpen: false,

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

  toggleBatchMode: () =>
    set((state) => ({
      batchMode: !state.batchMode,
      queue: !state.batchMode ? state.queue : [],
      isBatchSheetOpen: false,
    })),
  enqueueScan: (rfid, animalId) =>
    set((state) => {
      if (state.queue.some((item) => item.rfid === rfid)) return state;
      return {
        queue: [
          ...state.queue,
          { rfid, scannedAt: Date.now(), status: 'pending', animalId },
        ],
      };
    }),
  updateQueueItem: (rfid, patch) =>
    set((state) => ({
      queue: state.queue.map((item) =>
        item.rfid === rfid ? { ...item, ...patch } : item
      ),
    })),
  clearQueue: () => set({ queue: [] }),
  openBatchSheet: () => set({ isBatchSheetOpen: true }),
  closeBatchSheet: () => set({ isBatchSheetOpen: false }),
}));
