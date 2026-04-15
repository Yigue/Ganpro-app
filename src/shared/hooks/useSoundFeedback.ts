import { useCallback, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import { useSettingsStore } from '@store/settingsStore';

interface SoundFeedback {
  playSuccess: () => Promise<void>;
  playError: () => Promise<void>;
}

export function useSoundFeedback(): SoundFeedback {
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const successSoundRef = useRef<Audio.Sound | null>(null);
  const errorSoundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadSounds() {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true, // Play even on iOS silent switch
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
      });

      const { sound: successSound } = await Audio.Sound.createAsync(
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('../../../assets/sounds/scan_success.mp3'),
        { shouldPlay: false, volume: 0.8 }
      );
      const { sound: errorSound } = await Audio.Sound.createAsync(
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('../../../assets/sounds/scan_error.mp3'),
        { shouldPlay: false, volume: 0.8 }
      );

      if (mounted) {
        successSoundRef.current = successSound;
        errorSoundRef.current = errorSound;
      }
    }

    loadSounds().catch(console.error);

    return () => {
      mounted = false;
      successSoundRef.current?.unloadAsync();
      errorSoundRef.current?.unloadAsync();
    };
  }, []);

  const playSuccess = useCallback(async () => {
    if (!soundEnabled || !successSoundRef.current) return;
    try {
      await successSoundRef.current.replayAsync();
    } catch (error) {
      console.warn('[Sound] playSuccess error:', error);
    }
  }, [soundEnabled]);

  const playError = useCallback(async () => {
    if (!soundEnabled || !errorSoundRef.current) return;
    try {
      await errorSoundRef.current.replayAsync();
    } catch (error) {
      console.warn('[Sound] playError error:', error);
    }
  }, [soundEnabled]);

  return { playSuccess, playError };
}
