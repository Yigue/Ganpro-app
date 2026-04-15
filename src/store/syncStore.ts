import { create } from 'zustand';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

interface SyncState {
  status: SyncStatus;
  lastSyncAt: number | null;
  errorMessage: string | null;
  isOnline: boolean;

  setStatus: (status: SyncStatus) => void;
  setOnline: (online: boolean) => void;
  setSyncSuccess: () => void;
  setSyncError: (message: string) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  status: 'idle',
  lastSyncAt: null,
  errorMessage: null,
  isOnline: false,

  setStatus: (status) => set({ status }),
  setOnline: (isOnline) => set({ isOnline }),
  setSyncSuccess: () =>
    set({ status: 'success', lastSyncAt: Date.now(), errorMessage: null }),
  setSyncError: (errorMessage) => set({ status: 'error', errorMessage }),
}));
