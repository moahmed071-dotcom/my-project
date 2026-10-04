import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getProvider, GenerationError, type AIProvider } from '@/services/ai';
import { useStore } from './AppStore';

export type GenerationStatus = 'idle' | 'loading' | 'success' | 'error';

export interface GenerationErrorState {
  message: string;
  hint?: string;
  code?: string;
}

/**
 * Wraps a provider call with loading / error / cancellation state.
 * Pages pass a function that receives the active provider.
 */
export function useGeneration<T>() {
  const { settings } = useStore();
  const provider = useMemo(() => getProvider(settings), [settings]);
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [error, setError] = useState<GenerationErrorState | null>(null);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const run = useCallback(
    async (fn: (p: AIProvider, signal: AbortSignal) => Promise<T>): Promise<T | null> => {
      controller.current?.abort();
      const ac = new AbortController();
      controller.current = ac;
      setStatus('loading');
      setError(null);
      try {
        const result = await fn(provider, ac.signal);
        if (ac.signal.aborted) return null;
        setStatus('success');
        return result;
      } catch (err) {
        if ((err as Error).name === 'AbortError') return null;
        const e =
          err instanceof GenerationError
            ? { message: err.message, hint: err.hint, code: err.code }
            : { message: 'Something went wrong while generating.', hint: 'Please try again in a moment.' };
        setError(e);
        setStatus('error');
        return null;
      }
    },
    [provider],
  );

  const cancel = useCallback(() => {
    controller.current?.abort();
    setStatus('idle');
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
  }, []);

  return { status, error, run, cancel, reset, providerName: provider.name };
}
