import { useCallback, useEffect, useState } from 'react';

export type ConnectionStatus = 'connected' | 'not_configured' | 'invalid_key' | 'model_not_found' | 'unreachable' | 'error' | 'server_offline';

export interface AIStatus {
  provider: 'anthropic';
  model: string | null;
  configured: boolean;
  status: ConnectionStatus;
  checkedAt: string | null;
}

const OFFLINE: AIStatus = { provider: 'anthropic', model: null, configured: false, status: 'server_offline', checkedAt: null };

// Shared across components so the header and Settings don't double-fetch.
let cache: AIStatus | null = null;
let inflight: Promise<AIStatus> | null = null;
const listeners = new Set<(s: AIStatus) => void>();

async function fetchStatus(refresh: boolean): Promise<AIStatus> {
  try {
    const res = await fetch(`/api/ai/status${refresh ? '?refresh=1' : ''}`, { headers: { Accept: 'application/json' } });
    if (!res.ok) return OFFLINE;
    const data = (await res.json()) as AIStatus;
    return data && typeof data.status === 'string' ? data : OFFLINE;
  } catch {
    return OFFLINE;
  }
}

function load(refresh = false): Promise<AIStatus> {
  if (!inflight || refresh) {
    inflight = fetchStatus(refresh).then((s) => {
      cache = s;
      listeners.forEach((l) => l(s));
      inflight = null;
      return s;
    });
  }
  return inflight;
}

/** Connection status of the server-side Claude backend. */
export function useAIStatus() {
  const [status, setStatus] = useState<AIStatus | null>(cache);
  const [checking, setChecking] = useState(cache === null);

  useEffect(() => {
    listeners.add(setStatus);
    if (!cache) load().finally(() => setChecking(false));
    return () => {
      listeners.delete(setStatus);
    };
  }, []);

  const refresh = useCallback(async () => {
    setChecking(true);
    await load(true);
    setChecking(false);
  }, []);

  return { status, checking, refresh };
}

export const STATUS_LABELS: Record<ConnectionStatus, string> = {
  connected: 'Connected',
  not_configured: 'Not configured',
  invalid_key: 'Invalid API key',
  model_not_found: 'Model not found',
  unreachable: 'Anthropic unreachable',
  error: 'Connection error',
  server_offline: 'Server offline',
};
