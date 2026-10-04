import type { AIProvider } from './types';
import { GenerationError } from './types';

/**
 * Remote provider — posts to your own backend endpoint, which holds the API key
 * and calls the LLM of your choice (Claude, etc.).
 *
 * Contract: POST {endpoint} with JSON `{ task, model, input }` where task is one of
 * "brief" | "campaign" | "prompts". The endpoint must respond with JSON matching
 * BriefOutput, CampaignOutput or GeneratedPrompt[] respectively.
 */
export function createRemoteProvider(opts: { endpoint: string; model: string }): AIProvider {
  async function call<T>(task: string, input: unknown, signal?: AbortSignal): Promise<T> {
    if (!opts.endpoint.trim()) {
      throw new GenerationError(
        'No remote endpoint configured.',
        'Add an endpoint in Settings → AI Engine, or switch back to the Local Creative Engine.',
      );
    }
    let res: Response;
    try {
      res = await fetch(opts.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, model: opts.model, input }),
        signal,
      });
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw err;
      throw new GenerationError('Could not reach the remote AI endpoint.', 'Check your connection and the endpoint URL in Settings.');
    }
    if (!res.ok) {
      throw new GenerationError(`The remote AI endpoint returned ${res.status}.`, 'Check the server logs for details.');
    }
    try {
      return (await res.json()) as T;
    } catch {
      throw new GenerationError('The remote AI endpoint returned an invalid response.');
    }
  }

  return {
    id: 'remote',
    name: 'Remote AI Endpoint',
    generateBrief: (input, signal) => call('brief', input, signal),
    generateCampaign: (input, signal) => call('campaign', input, signal),
    generatePrompts: (input, signal) => call('prompts', input, signal),
  };
}
