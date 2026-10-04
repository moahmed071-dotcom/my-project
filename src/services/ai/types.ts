import type {
  BriefInput,
  BriefOutput,
  CampaignInput,
  CampaignOutput,
  GeneratedPrompt,
  PromptInput,
} from '@/types';

/**
 * Contract every generation backend must implement.
 * The local engine implements this offline; a remote LLM provider can be
 * dropped in later without touching any UI code.
 */
export interface AIProvider {
  readonly id: string;
  readonly name: string;
  generateBrief(input: BriefInput, signal?: AbortSignal): Promise<BriefOutput>;
  generateCampaign(input: CampaignInput, signal?: AbortSignal): Promise<CampaignOutput>;
  generatePrompts(input: PromptInput, signal?: AbortSignal): Promise<GeneratedPrompt[]>;
}

export class GenerationError extends Error {
  constructor(
    message: string,
    public readonly hint?: string,
    /** Machine-readable reason, e.g. "not_configured" from the Claude backend. */
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'GenerationError';
  }
}
