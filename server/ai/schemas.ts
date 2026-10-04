import { z } from 'zod';
import type {
  BriefOutput,
  CampaignOutput,
  GeneratedPrompt,
  PromptType,
} from '../../src/types';

// ─── Request validation ───────────────────────────────────────────────────────

const text = (max = 2000) => z.string().trim().max(max).default('');
const language = z.enum(['auto', 'en', 'ar', 'bilingual']).default('auto');

export const BriefInputSchema = z.object({
  client: z.string().trim().min(1, 'Client is required').max(200),
  projectName: z.string().trim().min(1, 'Project name is required').max(200),
  projectType: text(200),
  objective: text(),
  targetAudience: text(),
  market: text(200),
  platform: text(400),
  toneOfVoice: text(400),
  keyMessage: text(),
  deliverables: text(),
  additionalNotes: text(4000),
  language,
});

export const CampaignInputSchema = z.object({
  brand: z.string().trim().min(1, 'Brand is required').max(200),
  product: z.string().trim().min(1, 'Product is required').max(300),
  objective: text(),
  targetAudience: text(),
  market: text(200),
  occasion: text(200),
  tone: text(400),
  keyMessage: text(),
  language,
});

export const PROMPT_TYPE_IDS = ['image', 'video', 'product', 'realEstate', 'social', 'cinematic'] as const satisfies readonly PromptType[];

export const PromptInputSchema = z.object({
  idea: z.string().trim().min(8, 'Describe your idea in at least a few words').max(4000),
  style: text(100),
  aspectRatio: text(20),
  types: z.array(z.enum(PROMPT_TYPE_IDS)).min(1, 'Select at least one prompt type').max(PROMPT_TYPE_IDS.length),
  language,
});

export type BriefRequest = z.infer<typeof BriefInputSchema>;
export type CampaignRequest = z.infer<typeof CampaignInputSchema>;
export type PromptRequest = z.infer<typeof PromptInputSchema>;

// ─── Structured outputs (what Claude must return) ─────────────────────────────
// Kept to the JSON-schema subset structured outputs support: no length or
// numeric constraints. Counts are requested in the prompt and normalised below.

const Section = z.object({
  title: z.string().describe('Section heading, in the output language'),
  body: z.string().describe('Paragraph text; empty string if the section is list-only'),
  items: z.array(z.string()).describe('Bullet points; empty array if the section is paragraph-only'),
});

export const BRIEF_SECTION_KEYS = [
  'projectOverview',
  'objective',
  'targetAudience',
  'coreMessage',
  'creativeConcept',
  'creativeDirection',
  'toneOfVoice',
  'visualDirection',
  'deliverables',
  'successCriteria',
] as const;

export const BriefModelSchema = z.object({
  headline: z.string().describe('The working creative idea in 2–6 words, no quotes'),
  sections: z.object(Object.fromEntries(BRIEF_SECTION_KEYS.map((k) => [k, Section])) as Record<(typeof BRIEF_SECTION_KEYS)[number], typeof Section>),
  mandatories: Section.describe('Legal lines, logos, payment-plan or licence numbers and other must-haves; empty body and items if none'),
});

export const CampaignModelSchema = z.object({
  bigIdea: z.string(),
  bigIdeaRationale: z.string(),
  concept: z.string(),
  taglines: z.array(z.string()),
  keyVisual: z.array(z.string()),
  artDirection: z.array(z.string()),
  socialIdeas: z.array(z.object({ title: z.string(), format: z.string(), description: z.string() })),
  videoConcepts: z.array(z.object({ title: z.string(), duration: z.string(), logline: z.string(), beats: z.array(z.string()) })),
  cta: z.object({ primary: z.string(), alternatives: z.array(z.string()) }),
  contentPillars: z.array(z.object({ name: z.string(), description: z.string() })),
});

const PromptFieldsSchema = z.object({
  subject: z.string(),
  environment: z.string(),
  composition: z.string(),
  camera: z.string(),
  lighting: z.string(),
  materials: z.string(),
  colorDirection: z.string(),
  mood: z.string(),
  style: z.string(),
  aspectRatio: z.string(),
  negativePrompt: z.string(),
});

export const PromptsModelSchema = z.object({
  prompts: z.array(
    z.object({
      type: z.enum(PROMPT_TYPE_IDS),
      fields: PromptFieldsSchema,
      compiled: z.string().describe('One paste-ready prompt in English'),
    }),
  ),
});

// ─── Normalisers: model output → the app's existing data shapes ──────────────

const BRIEF_SECTION_IDS: Record<(typeof BRIEF_SECTION_KEYS)[number], string> = {
  projectOverview: 'overview',
  objective: 'objective',
  targetAudience: 'audience',
  coreMessage: 'message',
  creativeConcept: 'concept',
  creativeDirection: 'direction',
  toneOfVoice: 'tone',
  visualDirection: 'visual',
  deliverables: 'deliverables',
  successCriteria: 'success',
};

function cleanSection(id: string, s: z.infer<typeof Section>) {
  const body = s.body.trim();
  const items = s.items.map((i) => i.trim()).filter(Boolean);
  return { id, title: s.title.trim(), ...(body ? { body } : {}), ...(items.length ? { items } : {}) };
}

export function toBriefOutput(m: z.infer<typeof BriefModelSchema>): BriefOutput {
  const sections = BRIEF_SECTION_KEYS.map((k) => cleanSection(BRIEF_SECTION_IDS[k], m.sections[k]));
  const mandatories = cleanSection('notes', m.mandatories);
  if (mandatories.body || mandatories.items) sections.push(mandatories);
  return { headline: m.headline.trim(), sections };
}

export function toCampaignOutput(m: z.infer<typeof CampaignModelSchema>): CampaignOutput {
  return {
    ...m,
    taglines: m.taglines.slice(0, 5),
    socialIdeas: m.socialIdeas.slice(0, 5),
    videoConcepts: m.videoConcepts.slice(0, 3),
  };
}

export function toPrompts(m: z.infer<typeof PromptsModelSchema>, requested: readonly PromptType[]): GeneratedPrompt[] {
  // Keep the user's requested order and drop anything they didn't ask for.
  return requested.flatMap((t) => {
    const p = m.prompts.find((x) => x.type === t);
    return p ? [p] : [];
  });
}
