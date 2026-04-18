import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
  _hydrated: boolean;
  syncApiUrl: string;
  hapticEnabled: boolean;
  soundEnabled: boolean;
  autoFocusRFID: boolean;

  setHydrated: (v: boolean) => void;
  setSyncApiUrl: (url: string) => void;
  setHapticEnabled: (enabled: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setAutoFocusRFID: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      _hydrated: false,
      syncApiUrl: '',
      hapticEnabled: true,
      soundEnabled: true,
      autoFocusRFID: true,

      setHydrated: (v) => set({ _hydrated: v }),
      setSyncApiUrl: (syncApiUrl) => set({ syncApiUrl }),
      setHapticEnabled: (hapticEnabled) => set({ hapticEnabled }),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setAutoFocusRFID: (autoFocusRFID) => set({ autoFocusRFID }),
    }),
    {
      name: 'ganpro-settings',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
