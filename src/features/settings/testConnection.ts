const TIMEOUT_MS = 5_000;

export interface ConnectionTestResult {
  ok: boolean;
  latencyMs?: number;
  error?: string;
}

/**
 * Probes the sync backend with a short-lived GET /sync/ping.
 * Uses AbortSignal.timeout to cap the request at 5 seconds — avoids
 * blocking the UI in low-signal field conditions.
 */
export async function testSyncConnection(rawUrl: string): Promise<ConnectionTestResult> {
  const url = rawUrl.trim().replace(/\/+$/, '');

  if (!url) {
    return { ok: false, error: 'URL vacía' };
  }

  if (!/^https?:\/\//i.test(url)) {
    return { ok: false, error: 'La URL debe comenzar con http:// o https://' };
  }

  const start = Date.now();
  try {
    const response = await fetch(`${url}/sync/ping`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const latencyMs = Date.now() - start;

    if (!response.ok) {
      return {
        ok: false,
        latencyMs,
        error: `HTTP ${response.status} ${response.statusText}`,
      };
    }

    return { ok: true, latencyMs };
  } catch (error) {
    const latencyMs = Date.now() - start;
    if (error instanceof Error) {
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        return { ok: false, latencyMs, error: 'Tiempo de espera agotado (5s)' };
      }
      return { ok: false, latencyMs, error: error.message };
    }
    return { ok: false, latencyMs, error: 'Error desconocido de red' };
  }
}
