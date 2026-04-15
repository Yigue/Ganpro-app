import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '@store/settingsStore';

interface HapticFeedback {
  triggerSuccess: () => void;
  triggerError: () => void;
  triggerSelection: () => void;
  triggerHeavy: () => void;
}

export function useHapticFeedback(): HapticFeedback {
  const hapticEnabled = useSettingsStore((s) => s.hapticEnabled);

  const triggerSuccess = useCallback(() => {
    if (!hapticEnabled) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [hapticEnabled]);

  const triggerError = useCallback(() => {
    if (!hapticEnabled) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, [hapticEnabled]);

  const triggerSelection = useCallback(() => {
    if (!hapticEnabled) return;
    Haptics.selectionAsync();
  }, [hapticEnabled]);

  const triggerHeavy = useCallback(() => {
    if (!hapticEnabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, [hapticEnabled]);

  return { triggerSuccess, triggerError, triggerSelection, triggerHeavy };
}
