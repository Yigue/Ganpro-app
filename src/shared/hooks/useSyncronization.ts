import { useEffect, useRef, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { synchronize } from '@nozbe/watermelondb/sync';
import { useDatabase } from './useDatabase';
import { useSyncStore } from '@store/syncStore';
import { useSettingsStore } from '@store/settingsStore';

const SYNC_DEBOUNCE_MS = 5_000;   // Prevent sync storms: min 5s between syncs
const SYNC_RETRY_DELAY_MS = 30_000; // Retry after error: 30s

/**
 * Monitors network connectivity and triggers WatermelonDB sync whenever
 * the device transitions from offline → online.
 *
 * Mount once at the app root (App.tsx → AppInner).
 * When syncApiUrl is empty, sync is skipped — app runs 100% offline.
 */
export function useSyncronization(): void {
  const database = useDatabase();
  const { setStatus, setOnline, setSyncSuccess, setSyncError } = useSyncStore();
  const syncApiUrl = useSettingsStore((s) => s.syncApiUrl);

  const lastSyncAttemptRef = useRef<number>(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

      setSyncSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown sync error';
      console.error('[Sync] Error:', message);
      setSyncError(message);

      // Schedule automatic retry
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = setTimeout(runSync, SYNC_RETRY_DELAY_MS);
    }
  }, [database, syncApiUrl, setStatus, setSyncSuccess, setSyncError]);

  useEffect(() => {
    let previouslyOnline = false;

    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const isOnline = !!(state.isConnected && state.isInternetReachable);
      setOnline(isOnline);

      // Only sync on offline → online transition
      if (isOnline && !previouslyOnline) {
        runSync();
      }
      previouslyOnline = isOnline;
    });

    // Check current network state on mount
    NetInfo.fetch().then((state) => {
      const isOnline = !!(state.isConnected && state.isInternetReachable);
      setOnline(isOnline);
      if (isOnline) runSync();
    });

    return () => {
      unsubscribe();
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, [runSync, setOnline]);
}
