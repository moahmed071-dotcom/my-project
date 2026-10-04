import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import type { z } from 'zod';
import type { BriefOutput, CampaignOutput, GeneratedPrompt } from '../../src/types';
import { config } from '../config';
import { AIError } from './errors';
import { SYSTEM_PROMPT, briefUserPrompt, campaignUserPrompt, promptsUserPrompt } from './prompts';
import {
  BriefModelSchema,
  CampaignModelSchema,
  PromptsModelSchema,
  toBriefOutput,
  toCampaignOutput,
  toPrompts,
  type BriefRequest,
  type CampaignRequest,
  type PromptRequest,
} from './schemas';

// ─── Client ──────────────────────────────────────────────────────────────────

let client: Anthropic | null = null;
let clientKey = '';

function getClient(): Anthropic {
  if (!config.aiConfigured) throw AIError.notConfigured();
  // Recreate if the key changed (e.g. .env edited and the dev server restarted the module).
  if (!client || clientKey !== config.apiKey) {
    client = new Anthropic({ apiKey: config.apiKey, maxRetries: 2 });
    clientKey = config.apiKey;
  }
  return client;
}

// Models that accept server-side refusal fallbacks in their "default" form.
const FALLBACK_MODELS = new Set(['claude-opus-5-5', 'claude-opus-5', 'claude-fable-5-1', 'claude-sonnet-5-5']);

function modelOptions(model: string) {
  const isHaiku = model.startsWith('claude-haiku');
  return {
    // Adaptive thinking + effort on current models; Haiku 4.5 supports neither in this form.
    ...(isHaiku ? {} : { thinking: { type: 'adaptive' as const } }),
    effort: isHaiku ? undefined : config.effort,
    fallbacks: FALLBACK_MODELS.has(model),
  };
}

// ─── Core call ───────────────────────────────────────────────────────────────

async function generate<S extends z.ZodType>(schema: S, userPrompt: string, signal: AbortSignal, label: string): Promise<z.infer<S>> {
  const anthropic = getClient();
  const model = config.model;
  const opts = modelOptions(model);
  const started = Date.now();

  try {
    const response = await anthropic.beta.messages.parse(
      {
        model,
        max_tokens: 16000,
        ...(opts.thinking ? { thinking: opts.thinking } : {}),
        output_config: {
          ...(opts.effort ? { effort: opts.effort } : {}),
          format: betaZodOutputFormat(schema),
        },
        // Server-side fallback: if the model declines, the API re-runs on a fallback model.
        ...(opts.fallbacks ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: userPrompt }],
      },
      { signal },
    );

    console.log(
      `[ai] ${label} model=${response.model} stop=${response.stop_reason} in=${response.usage.input_tokens} ` +
        `cache_read=${response.usage.cache_read_input_tokens ?? 0} out=${response.usage.output_tokens} ${Date.now() - started}ms`,
    );

    if (response.stop_reason === 'refusal') throw AIError.refused();
    if (response.stop_reason === 'max_tokens') throw AIError.incomplete();
    if (!response.parsed_output) throw AIError.invalidOutput();
    return response.parsed_output as z.infer<S>;
  } catch (err) {
    throw mapError(err);
  }
}

function mapError(err: unknown): unknown {
  if (err instanceof AIError) return err;
  if (err instanceof Anthropic.APIUserAbortError) return err;
  if (err instanceof Anthropic.AuthenticationError) return AIError.invalidKey();
  if (err instanceof Anthropic.PermissionDeniedError) return AIError.forbidden();
  if (err instanceof Anthropic.NotFoundError) return AIError.modelNotFound(config.model);
  if (err instanceof Anthropic.RateLimitError) return AIError.rateLimited();
  if (err instanceof Anthropic.BadRequestError) {
    console.error('[ai] bad request:', err.message);
    return AIError.badRequest();
  }
  if (err instanceof Anthropic.InternalServerError) return AIError.overloaded();
  if (err instanceof Anthropic.APIConnectionError) return AIError.unreachable();
  if (err instanceof Anthropic.APIError) {
    console.error(`[ai] API error ${err.status}:`, err.message);
    return AIError.upstream();
  }
  // JSON parse / schema validation failures from the parse helper.
  console.error('[ai] unexpected error:', err);
  return AIError.invalidOutput();
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function generateBrief(input: BriefRequest, signal: AbortSignal): Promise<BriefOutput> {
  return toBriefOutput(await generate(BriefModelSchema, briefUserPrompt(input), signal, 'brief'));
}

export async function generateCampaign(input: CampaignRequest, signal: AbortSignal): Promise<CampaignOutput> {
  return toCampaignOutput(await generate(CampaignModelSchema, campaignUserPrompt(input), signal, 'campaign'));
}

export async function generatePrompts(input: PromptRequest, signal: AbortSignal): Promise<GeneratedPrompt[]> {
  return toPrompts(await generate(PromptsModelSchema, promptsUserPrompt(input), signal, 'prompts'), input.types);
}

// ─── Connection status ───────────────────────────────────────────────────────

export type ConnectionStatus = 'connected' | 'not_configured' | 'invalid_key' | 'model_not_found' | 'unreachable' | 'error';

export interface AIStatus {
  provider: 'anthropic';
  model: string;
  configured: boolean;
  status: ConnectionStatus;
  checkedAt: string;
}

let cached: { at: number; key: string; value: AIStatus } | null = null;
const STATUS_TTL_MS = 5 * 60_000;

/** Verifies the key with a free Models API lookup. Never returns the key. */
export async function getStatus(force = false): Promise<AIStatus> {
  const base = { provider: 'anthropic' as const, model: config.model, configured: config.aiConfigured };
  if (!config.aiConfigured) return { ...base, status: 'not_configured', checkedAt: new Date().toISOString() };
  if (!force && cached && cached.key === config.apiKey && Date.now() - cached.at < STATUS_TTL_MS) return cached.value;

  let status: ConnectionStatus = 'connected';
  try {
    await getClient().models.retrieve(config.model, {}, { timeout: 10_000, maxRetries: 0 });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) status = 'invalid_key';
    else if (err instanceof Anthropic.NotFoundError) status = 'model_not_found';
    else if (err instanceof Anthropic.APIConnectionError) status = 'unreachable';
    else status = 'error';
  }
  const value: AIStatus = { ...base, status, checkedAt: new Date().toISOString() };
  cached = { at: Date.now(), key: config.apiKey, value };
  return value;
}
