import { uid } from '@/lib/id';
import { getTemplate } from '../templates/library';
import { applyBrand } from './brand';
import { newElementId } from './elements';
import { normalizeZ } from './operations';
import { withAutoHeight } from './textLayout';
import {
  DESIGN_SCHEMA,
  DESIGN_SCHEMA_VERSION,
  type DesignBrand,
  type DesignContent,
  type DesignDocument,
  type DesignElement,
  type Platform,
  type SavedTemplate,
} from './types';

export const EMPTY_CONTENT: DesignContent = { brief: '', headline: '', subheadline: '', cta: '', visualDirection: '', label: '' };

export interface DesignSetup {
  name: string;
  clientId: string | null;
  campaign: string;
  platform: Platform;
  formatId: string;
  width: number;
  height: number;
  brand: DesignBrand;
  content: DesignContent;
  heroImage: string | null;
}

/** Fill gaps so templates always have something meaningful to set. */
export function resolveContent(setup: Pick<DesignSetup, 'name' | 'campaign' | 'content' | 'brand'>): DesignContent {
  const c = setup.content;
  return {
    ...c,
    headline: c.headline.trim() || setup.name.trim() || 'Untitled design',
    label: c.label.trim() || setup.campaign.trim() || setup.brand.name.trim(),
  };
}

export function buildElements(templateId: string, setup: DesignSetup): Pick<DesignDocument, 'background' | 'elements'> {
  const t = getTemplate(templateId);
  if (!t) throw new Error(`Unknown template: ${templateId}`);
  const out = t.build({ width: setup.width, height: setup.height, brand: setup.brand, content: resolveContent(setup), image: setup.heroImage });
  return { background: out.background, elements: normalizeZ(out.elements) };
}

export function createDesign(setup: DesignSetup, templateId: string | null): DesignDocument {
  const now = new Date().toISOString();
  const body = templateId ? buildElements(templateId, setup) : { background: { color: '#FFFFFF' }, elements: [] };
  return {
    schema: DESIGN_SCHEMA,
    schemaVersion: DESIGN_SCHEMA_VERSION,
    id: uid('ds'),
    name: setup.name.trim() || 'Untitled design',
    clientId: setup.clientId,
    campaign: setup.campaign,
    platform: setup.platform,
    formatId: setup.formatId,
    width: setup.width,
    height: setup.height,
    background: body.background,
    elements: body.elements,
    brand: setup.brand,
    content: resolveContent(setup),
    templateId,
    createdAt: now,
    updatedAt: now,
  };
}

export function setupFromDoc(doc: DesignDocument): DesignSetup {
  const img = doc.elements.find((e) => e.type === 'image' && e.slot === 'image');
  return {
    name: doc.name,
    clientId: doc.clientId,
    campaign: doc.campaign,
    platform: doc.platform,
    formatId: doc.formatId,
    width: doc.width,
    height: doc.height,
    brand: doc.brand,
    content: doc.content,
    heroImage: img && img.type === 'image' ? img.src : null,
  };
}

/**
 * Re-lay out a design with a template, keeping its copy, brand and hero image.
 * Text the user edited on the canvas is carried into the matching slots.
 */
export function applyTemplate(doc: DesignDocument, templateId: string): DesignDocument {
  const fromCanvas = (slot: 'headline' | 'subheadline' | 'cta' | 'label') => {
    const el = doc.elements.find((e) => e.type === 'text' && e.slot === slot);
    return el && el.type === 'text' ? el.text : undefined;
  };
  const content: DesignContent = {
    ...doc.content,
    headline: fromCanvas('headline') ?? doc.content.headline,
    subheadline: fromCanvas('subheadline') ?? doc.content.subheadline,
    cta: fromCanvas('cta') ?? doc.content.cta,
    label: fromCanvas('label') ?? doc.content.label,
  };
  const body = buildElements(templateId, { ...setupFromDoc(doc), content });
  return { ...doc, ...body, content, templateId, updatedAt: new Date().toISOString() };
}

export function duplicateDesign(doc: DesignDocument): DesignDocument {
  const now = new Date().toISOString();
  return { ...structuredClone(doc), id: uid('ds'), name: `${doc.name} (copy)`, createdAt: now, updatedAt: now };
}

// ─── Saved templates ────────────────────────────────────────────────────────

export function toSavedTemplate(doc: DesignDocument, name: string): SavedTemplate {
  return {
    id: uid('tpl'),
    name: name.trim() || `${doc.name} template`,
    width: doc.width,
    height: doc.height,
    background: doc.background,
    elements: structuredClone(doc.elements),
    createdAt: new Date().toISOString(),
  };
}

/** Scale a saved template onto a design, refilling content slots with the design's copy. */
export function applySavedTemplate(doc: DesignDocument, tpl: SavedTemplate): DesignDocument {
  const sx = doc.width / tpl.width;
  const sy = doc.height / tpl.height;
  const sf = Math.min(sx, sy);
  const content = doc.content;
  const slotText: Partial<Record<string, string>> = { headline: content.headline, subheadline: content.subheadline, cta: content.cta, label: content.label };
  const heroSrc = doc.elements.find((e) => e.type === 'image' && e.slot === 'image');
  const elements = tpl.elements.map((el): DesignElement => {
    const g = { ...el, id: newElementId(), x: Math.round(el.x * sx), y: Math.round(el.y * sy), width: Math.round(el.width * sx), height: Math.round(el.height * sy) };
    if (g.type === 'text') {
      const text = g.slot && slotText[g.slot]?.trim() ? (slotText[g.slot] as string) : g.text;
      return withAutoHeight({ ...g, text, fontSize: Math.max(6, Math.round(g.fontSize * sf)), width: Math.round(el.width * sx) });
    }
    if (g.type === 'image' && g.slot === 'image' && heroSrc?.type === 'image' && heroSrc.src) return { ...g, src: heroSrc.src };
    return g;
  });
  return applyBrand({ ...doc, background: tpl.background, elements: normalizeZ(elements), templateId: null, updatedAt: new Date().toISOString() }, doc.brand);
}
