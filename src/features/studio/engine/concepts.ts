import { hashString } from '@/services/ai/knowledge';
import { createDesign, type DesignSetup } from '../model/document';
import type { DesignDocument } from '../model/types';
import { getTemplate } from '../templates/library';

/**
 * Layout Concepts: three different compositions of the same brief.
 *
 * The local provider below is deterministic and template-based — it does NOT
 * use AI. A future provider (e.g. an LLM) can implement the same interface to
 * suggest templates, headlines or visual direction, and the editor will not
 * need to change: it only consumes `LayoutConcept`s.
 */
export interface LayoutConcept {
  index: number;
  title: string;
  templateId: string;
  rationale: string;
  design: DesignDocument;
}

export interface ConceptProvider {
  readonly id: string;
  readonly label: string;
  generate(setup: DesignSetup, count?: number): Promise<LayoutConcept[]>;
}

type Sector = 'realEstate' | 'luxury' | 'corporate' | 'product';

const SECTOR_KEYWORDS: Record<Sector, string[]> = {
  realEstate: ['real estate', 'property', 'villa', 'apartment', 'residence', 'tower', 'compound', 'launch', 'penthouse', 'developer', 'home', 'sahel', 'north coast', 'new cairo', 'unit', 'units', 'off-plan', 'chalet'],
  luxury: ['luxury', 'premium', 'oud', 'perfume', 'fragrance', 'jewel', 'watch', 'couture', 'exclusive', 'gold', 'bespoke'],
  corporate: ['corporate', 'b2b', 'bank', 'fintech', 'finance', 'company', 'report', 'hiring', 'conference', 'linkedin', 'partnership', 'consult'],
  product: ['product', 'sale', 'offer', 'collection', 'drop', 'menu', 'app', 'shop', 'discount', 'season', 'ramadan', 'eid', 'summer'],
};

/** Ordered template picks per sector — each trio spans three distinct compositions. */
const SECTOR_TEMPLATES: Record<Sector, string[]> = {
  realEstate: ['luxury-editorial', 'architectural-bold', 'property-showcase', 'full-bleed', 'minimal-premium'],
  luxury: ['luxury-editorial', 'minimal-premium', 'full-bleed', 'typography-focus', 'campaign-announcement'],
  corporate: ['split-image', 'typography-focus', 'minimal-premium', 'architectural-bold', 'campaign-announcement'],
  product: ['campaign-announcement', 'full-bleed', 'split-image', 'minimal-premium', 'typography-focus'],
};

const RATIONALE: Record<string, string> = {
  'luxury-editorial': 'Magazine-style framing and a serif headline signal quiet confidence.',
  'architectural-bold': 'Oversized type and a hard colour block give the architecture weight.',
  'minimal-premium': 'Restraint and white space let a single image and line do the work.',
  'split-image': 'A clean split keeps image and message equally legible at small sizes.',
  'full-bleed': 'An edge-to-edge image sells the feeling; the gradient protects the copy.',
  'typography-focus': 'The message becomes the visual — strong when imagery is not ready yet.',
  'property-showcase': 'A listing-card structure puts the property first and the enquiry one tap away.',
  'campaign-announcement': 'A centred, poster-like composition reads as an event or launch.',
};

export function detectSector(setup: DesignSetup): Sector {
  const hay = ` ${[setup.content.brief, setup.content.headline, setup.content.visualDirection, setup.campaign, setup.name, setup.brand.name].join(' ').toLowerCase()} `;
  let best: Sector = 'luxury';
  let bestScore = 0;
  (Object.keys(SECTOR_KEYWORDS) as Sector[]).forEach((s) => {
    const score = SECTOR_KEYWORDS[s].reduce((n, k) => n + (hay.includes(k) ? 1 : 0), 0);
    if (score > bestScore) {
      best = s;
      bestScore = score;
    }
  });
  return best;
}

/** Pick `count` distinct templates for this brief. Same input → same picks. */
export function pickConceptTemplates(setup: DesignSetup, count = 3): string[] {
  const pool = SECTOR_TEMPLATES[detectSector(setup)];
  const seed = hashString(`${setup.content.brief}|${setup.content.headline}|${setup.width}x${setup.height}`);
  // Keep the sector's lead template, then rotate through the rest deterministically.
  const rest = pool.slice(1);
  const offset = seed % rest.length;
  const rotated = [...rest.slice(offset), ...rest.slice(0, offset)];
  return [pool[0], ...rotated].slice(0, count);
}

export const localConceptProvider: ConceptProvider = {
  id: 'local-layout',
  label: 'Local layout engine',
  async generate(setup, count = 3) {
    return pickConceptTemplates(setup, count).map((templateId, i) => ({
      index: i + 1,
      title: getTemplate(templateId)?.name ?? templateId,
      templateId,
      rationale: RATIONALE[templateId] ?? '',
      design: createDesign(setup, templateId),
    }));
  },
};
