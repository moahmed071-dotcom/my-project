import type { Settings } from '@/types';
import type { AIProvider } from './types';
import { createLocalProvider } from './localProvider';
import { createRemoteProvider } from './remoteProvider';

export type { AIProvider } from './types';
export { GenerationError } from './types';

export function getProvider(settings: Settings): AIProvider {
  if (settings.aiProvider === 'remote') {
    return createRemoteProvider({ endpoint: settings.remoteEndpoint, model: settings.remoteModel });
  }
  return createLocalProvider({ simulateLatency: settings.simulateLatency });
}
