import { useEffect, useRef, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { synchronize } from '@nozbe/watermelondb/sync';
import { useDatabase } from './useDatabase';
import { useSyncStore } from '@store/syncStore';
import { useSettingsStore } from '@store/settingsStore';

const SYNC_DEBOUNCE_MS = 5_000; // Prevent sync storms: min 5s between syncs

// Exponential backoff: 5s → 15s → 30s → 1m → 5m (cap).
const BACKOFF_SCHEDULE_MS = [5_000, 15_000, 30_000, 60_000, 300_000] as const;

/**
 * Monitors network connectivity and triggers WatermelonDB sync whenever
 * the device transitions from offline → online.
 *
 * Mount once at the app root (App.tsx → AppInner).
 * When syncApiUrl is empty, sync is skipped — app runs 100% offline.
 *
 * On error, retries with exponential backoff. On offline→online transition,
 * resets the retry counter and fires an immediate sync attempt.
 */
export function useSyncronization(): void {
  const database = useDatabase();
  const setStatus = useSyncStore(s => s.setStatus);
  const setOnline = useSyncStore(s => s.setOnline);
  const setSyncSuccess = useSyncStore(s => s.setSyncSuccess);
  const setSyncError = useSyncStore(s => s.setSyncError);
  const syncApiUrl = useSettingsStore((s) => s.syncApiUrl);

  const lastSyncAttemptRef = useRef<number>(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef<number>(0);

  const runSync = useCallback(async () => {
    if (!syncApiUrl) return; // No backend configured → offline mode

    const now = Date.now();
    if (now - lastSyncAttemptRef.current < SYNC_DEBOUNCE_MS) return;
    lastSyncAttemptRef.current = now;

    setStatus('syncing');

    try {
      await synchronize({
        database,
        migrationsEnabledAtVersion: 1,

        pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
          const params = new URLSearchParams({
            last_pulled_at: String(lastPulledAt ?? 0),
            schema_version: String(schemaVersion),
            migration: migration ? JSON.stringify(migration) : 'null',
          });
          const response = await fetch(`${syncApiUrl}/sync/pull?${params}`, {
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(30_000),
          });
          if (!response.ok) {
            throw new Error(`Pull failed: ${response.status} ${response.statusText}`);
          }
          const { changes, timestamp } = await response.json();
          return { changes, timestamp };
        },

        pushChanges: async ({ changes, lastPulledAt }) => {
          const response = await fetch(
            `${syncApiUrl}/sync/push?last_pulled_at=${lastPulledAt}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(changes),
              signal: AbortSignal.timeout(30_000),
            }
          );
          if (!response.ok) {
            throw new Error(`Push failed: ${response.status} ${response.statusText}`);
          }
        },
      });

      retryCountRef.current = 0;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      setSyncSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown sync error';
      const delay =
        BACKOFF_SCHEDULE_MS[
          Math.min(retryCountRef.current, BACKOFF_SCHEDULE_MS.length - 1)
        ];
      console.error(`[Sync] Error (retry in ${delay}ms):`, message);
      setSyncError(message);

      retryCountRef.current += 1;
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = setTimeout(runSync, delay);
    }
  }, [database, syncApiUrl, setStatus, setSyncSuccess, setSyncError]);

  useEffect(() => {
    let previouslyOnline = false;

    const handleOnlineRecovery = () => {
      retryCountRef.current = 0;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      lastSyncAttemptRef.current = 0;
      void runSync();
    };

    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const isOnline = !!(state.isConnected && state.isInternetReachable);
      setOnline(isOnline);

      if (isOnline && !previouslyOnline) {
        handleOnlineRecovery();
      }
      previouslyOnline = isOnline;
    });

    void (async () => {
      const state = await NetInfo.fetch();
      const isOnline = !!(state.isConnected && state.isInternetReachable);
      setOnline(isOnline);
      previouslyOnline = isOnline;
      if (isOnline) void runSync();
    })();

    return () => {
      unsubscribe();
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, [runSync, setOnline]);
}
