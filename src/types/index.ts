// ─── Core domain ──────────────────────────────────────────────────────────────

export const PROJECT_CATEGORIES = [
  'Branding',
  'Real Estate',
  'Social Media',
  'Advertising',
  'AI Imagery',
  'Video Production',
  'Campaign',
] as const;
export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];

export const PROJECT_STATUSES = ['Planning', 'In Progress', 'Review', 'Delivered', 'On Hold'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export interface Project {
  id: string;
  name: string;
  clientId: string | null;
  category: ProjectCategory;
  status: ProjectStatus;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  name: string;
  company: string;
  industry: string;
  email: string;
  notes: string;
  createdAt: string;
}

// ─── Creative Brief ───────────────────────────────────────────────────────────

export interface BriefInput {
  client: string;
  projectName: string;
  projectType: string;
  objective: string;
  targetAudience: string;
  market: string;
  platform: string;
  toneOfVoice: string;
  keyMessage: string;
  deliverables: string;
  additionalNotes: string;
}

export interface OutputSection {
  id: string;
  title: string;
  /** Paragraph body. */
  body?: string;
  /** Bullet list items. */
  items?: string[];
}

export interface BriefOutput {
  headline: string;
  sections: OutputSection[];
}

export interface Brief {
  id: string;
  input: BriefInput;
  output: BriefOutput;
  createdAt: string;
}

// ─── Campaign ─────────────────────────────────────────────────────────────────

export interface CampaignInput {
  brand: string;
  product: string;
  objective: string;
  targetAudience: string;
  market: string;
  occasion: string;
  tone: string;
  keyMessage: string;
}

export interface SocialIdea {
  title: string;
  format: string;
  description: string;
}

export interface VideoConcept {
  title: string;
  duration: string;
  logline: string;
  beats: string[];
}

export interface CampaignOutput {
  bigIdea: string;
  bigIdeaRationale: string;
  concept: string;
  taglines: string[];
  keyVisual: string[];
  artDirection: string[];
  socialIdeas: SocialIdea[];
  videoConcepts: VideoConcept[];
  cta: { primary: string; alternatives: string[] };
  contentPillars: { name: string; description: string }[];
}

export interface Campaign {
  id: string;
  input: CampaignInput;
  output: CampaignOutput;
  createdAt: string;
}

// ─── AI Prompts ───────────────────────────────────────────────────────────────

export const PROMPT_TYPES = [
  'image',
  'video',
  'product',
  'realEstate',
  'social',
  'cinematic',
] as const;
export type PromptType = (typeof PROMPT_TYPES)[number];

export interface PromptInput {
  idea: string;
  style: string;
  aspectRatio: string;
  types: PromptType[];
}

export interface PromptFields {
  subject: string;
  environment: string;
  composition: string;
  camera: string;
  lighting: string;
  materials: string;
  colorDirection: string;
  mood: string;
  style: string;
  aspectRatio: string;
  negativePrompt: string;
}

export interface GeneratedPrompt {
  type: PromptType;
  fields: PromptFields;
  /** Single-paragraph prompt ready to paste into a generator. */
  compiled: string;
}

export interface PromptSet {
  id: string;
  input: PromptInput;
  prompts: GeneratedPrompt[];
  createdAt: string;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export type AIProviderId = 'local' | 'remote';

export interface Settings {
  userName: string;
  role: string;
  studio: string;
  defaultMarket: string;
  defaultAspectRatio: string;
  aiProvider: AIProviderId;
  remoteEndpoint: string;
  remoteModel: string;
  simulateLatency: boolean;
  compactSidebar: boolean;
}
