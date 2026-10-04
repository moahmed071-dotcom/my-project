import type { AIProvider } from './types';
import { GenerationError } from './types';
import { buildBrief } from './engines/briefEngine';
import { buildCampaign } from './engines/campaignEngine';
import { buildPrompts } from './engines/promptEngine';

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'));
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}

/**
 * Offline creative engine. Produces deterministic, high-quality structured
 * output from local templates — no API key required.
 */
export function createLocalProvider(opts: { simulateLatency: boolean }): AIProvider {
  const delay = (signal?: AbortSignal) => (opts.simulateLatency ? wait(900 + Math.random() * 700, signal) : Promise.resolve());

  return {
    id: 'local',
    name: 'Local Creative Engine',
    async generateBrief(input, signal) {
      if (!input.projectName.trim() || !input.client.trim()) {
        throw new GenerationError('A client and project name are required.', 'Fill in the required fields and try again.');
      }
      await delay(signal);
      return buildBrief(input);
    },
    async generateCampaign(input, signal) {
      if (!input.brand.trim() || !input.product.trim()) {
        throw new GenerationError('A brand and product are required.', 'Fill in the required fields and try again.');
      }
      await delay(signal);
      return buildCampaign(input);
    },
    async generatePrompts(input, signal) {
      if (input.idea.trim().length < 8) {
        throw new GenerationError('Your idea is too short to build a prompt from.', 'Describe the subject, setting or feeling in a sentence or two.');
      }
      if (!input.types.length) {
        throw new GenerationError('Select at least one prompt type.');
      }
      await delay(signal);
      return buildPrompts(input);
    },
  };
}
