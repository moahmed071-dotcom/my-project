import type { AIProvider } from './types';
import { GenerationError } from './types';

interface ApiErrorBody {
  error?: { code?: string; message?: string; hint?: string };
}

/**
 * Talks to this app's own backend (server/), which calls Claude with the
 * server-side ANTHROPIC_API_KEY. The browser never sees the key.
 */
async function post<T>(task: 'brief' | 'campaign' | 'prompts', input: unknown, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/generate/${task}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input }),
      signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new GenerationError(
      'Can’t reach the Creative OS server.',
      'Make sure the API server is running (npm run dev starts both the app and the server).',
      'server_unreachable',
    );
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON response, handled below */
  }

  if (!res.ok) {
    const e = (body as ApiErrorBody | null)?.error;
    if (!e) {
      throw new GenerationError(`The Creative OS server returned an error (${res.status}).`, 'Make sure the API server is running and up to date.', 'server_error');
    }
    throw new GenerationError(e.message ?? 'Generation failed.', e.hint, e.code);
  }

  const output = (body as { output?: T } | null)?.output;
  if (!output) throw new GenerationError('The server returned an empty response.', 'Try again.', 'invalid_output');
  return output;
}

export function createClaudeProvider(): AIProvider {
  return {
    id: 'claude',
    name: 'Claude',
    generateBrief: (input, signal) => post('brief', input, signal),
    generateCampaign: (input, signal) => post('campaign', input, signal),
    generatePrompts: (input, signal) => post('prompts', input, signal),
  };
}
