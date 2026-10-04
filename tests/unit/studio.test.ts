/**
 * Fast unit tests for the Design Studio model (run with `npm run test:unit`).
 * Text is measured with the engine's non-browser approximation here; the
 * browser e2e suite covers real font rendering.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TEMPLATES } from '../../src/features/studio/templates/library';
import { DEFAULT_BRAND } from '../../src/features/studio/model/brand';
import { applySavedTemplate, applyTemplate, createDesign, duplicateDesign, toSavedTemplate, type DesignSetup } from '../../src/features/studio/model/document';
import { addElement, deleteElement, duplicateElement, normalizeZ, reorder, setBrand, updateElement } from '../../src/features/studio/model/operations';
import { makeRect, makeText } from '../../src/features/studio/model/elements';
import { localConceptProvider, pickConceptTemplates } from '../../src/features/studio/engine/concepts';
import { DESIGN_SCHEMA, type DesignContent, type DesignElement } from '../../src/features/studio/model/types';

const SIZES: [number, number][] = [
  [1080, 1080],
  [1080, 1350],
  [1080, 1920],
  [1200, 628],
  [1200, 1200],
];

const CONTENT: Record<string, DesignContent> = {
  short: { brief: '', headline: 'Home, considered', subheadline: 'Two lines of support copy.', cta: 'Book a visit', visualDirection: '', label: 'New' },
  long: {
    brief: '',
    headline: 'Waterfront residences designed around the way your family actually lives',
    subheadline: 'Private terraces, a landscaped courtyard and a marina promenade. 10% down payment and an 8-year instalment plan.',
    cta: 'Register your interest today',
    visualDirection: '',
    label: 'Phase two · Now selling',
  },
  empty: { brief: '', headline: 'Only a headline', subheadline: '', cta: '', visualDirection: '', label: '' },
};

function setup(over: Partial<DesignSetup> = {}): DesignSetup {
  return {
    name: 'Test design',
    clientId: null,
    campaign: 'Launch',
    platform: 'instagram',
    formatId: 'ig-portrait',
    width: 1080,
    height: 1350,
    brand: { ...DEFAULT_BRAND, name: 'Azure Shores' },
    content: CONTENT.short,
    heroImage: null,
    ...over,
  };
}

const overlaps = (a: DesignElement, b: DesignElement) => a.x < b.x + b.width - 1 && b.x < a.x + a.width - 1 && a.y < b.y + b.height - 1 && b.y < a.y + a.height - 1;

test('every template lays out text without overlaps or overflow, at every size', () => {
  const issues: string[] = [];
  for (const t of TEMPLATES) {
    for (const [w, h] of SIZES) {
      for (const [ck, content] of Object.entries(CONTENT)) {
        const out = t.build({ width: w, height: h, brand: { ...DEFAULT_BRAND, name: 'Azure Shores' }, content, image: null });
        const items = out.elements.filter((e) => e.type === 'text' || e.type === 'logo');
        for (const e of items) {
          if (e.x < -1 || e.y < -1 || e.x + e.width > w + 1 || e.y + e.height > h + 1) issues.push(`${t.id} ${w}x${h} ${ck}: ${e.name} out of bounds`);
        }
        for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) if (overlaps(items[i], items[j])) issues.push(`${t.id} ${w}x${h} ${ck}: ${items[i].name} overlaps ${items[j].name}`);
      }
    }
  }
  assert.deepEqual(issues, []);
});

test('there are at least 8 templates with the required names', () => {
  const names = TEMPLATES.map((t) => t.name);
  for (const n of ['Luxury Editorial', 'Architectural Bold', 'Minimal Premium', 'Split Image', 'Full Bleed', 'Typography Focus', 'Property Showcase', 'Campaign Announcement']) assert.ok(names.includes(n), n);
});

test('createDesign produces a complete, platform-independent document', () => {
  const doc = createDesign(setup(), 'luxury-editorial');
  assert.equal(doc.schema, DESIGN_SCHEMA);
  assert.equal(doc.schemaVersion, 1);
  for (const k of ['id', 'name', 'clientId', 'campaign', 'platform', 'width', 'height', 'elements', 'brand', 'createdAt', 'updatedAt', 'templateId'] as const) assert.ok(k in doc, k);
  assert.ok(doc.elements.length > 4);
  // Elements stay separate and carry full geometry; z-indexes are contiguous.
  doc.elements.forEach((e) => ['x', 'y', 'width', 'height', 'rotation', 'opacity', 'zIndex'].forEach((p) => assert.equal(typeof (e as unknown as Record<string, unknown>)[p], 'number')));
  assert.deepEqual([...doc.elements].map((e) => e.zIndex).sort((a, b) => a - b), doc.elements.map((_, i) => i));
  // The document survives a JSON round trip unchanged.
  assert.deepEqual(JSON.parse(JSON.stringify(doc)), doc);
});

test('layout concepts: 3 distinct templates, deterministic, sector-aware', async () => {
  const realEstate = setup({ content: { ...CONTENT.short, brief: 'Launch of a villa compound in New Cairo' } });
  const a = pickConceptTemplates(realEstate);
  assert.equal(new Set(a).size, 3);
  assert.deepEqual(pickConceptTemplates(realEstate), a, 'same brief → same concepts');
  assert.equal(a[0], 'luxury-editorial');
  const corporate = pickConceptTemplates(setup({ content: { ...CONTENT.short, brief: 'Fintech partnership announcement for LinkedIn' } }));
  assert.equal(corporate[0], 'split-image');
  const concepts = await localConceptProvider.generate(realEstate, 3);
  assert.equal(concepts.length, 3);
  const compositions = concepts.map((c) => c.design.elements.map((e) => `${e.type}:${Math.round(e.x)},${Math.round(e.y)}`).join('|'));
  assert.equal(new Set(compositions).size, 3, 'each concept has a different composition');
});

test('element operations: add, update, duplicate, reorder, delete', () => {
  let doc = createDesign(setup(), null);
  const rect = makeRect({ x: 10, y: 10, width: 100, height: 50 });
  doc = addElement(doc, rect);
  const text = makeText({ text: 'Hello', x: 0, y: 0, width: 300, height: 0 });
  doc = addElement(doc, text);
  assert.equal(doc.elements.find((e) => e.id === text.id)?.zIndex, 1);

  doc = updateElement(doc, rect.id, { x: 200, opacity: 0.5 });
  assert.equal(doc.elements.find((e) => e.id === rect.id)?.x, 200);

  const dup = duplicateElement(doc, rect.id, 'copy');
  doc = dup.doc;
  assert.equal(doc.elements.length, 3);
  assert.notEqual(doc.elements.find((e) => e.id === 'copy')?.x, 200, 'copy is offset');

  doc = reorder(doc, rect.id, 'front');
  assert.equal(doc.elements.find((e) => e.id === rect.id)?.zIndex, 2);
  doc = reorder(doc, rect.id, 'back');
  assert.equal(doc.elements.find((e) => e.id === rect.id)?.zIndex, 0);

  doc = deleteElement(doc, rect.id);
  assert.equal(doc.elements.length, 2);
  assert.deepEqual(normalizeZ(doc.elements).map((e) => e.zIndex), [0, 1]);
});

test('text boxes are auto-height and grow with content', () => {
  let doc = addElement(createDesign(setup(), null), makeText({ id: 't', text: 'One line', x: 0, y: 0, width: 300, height: 0, fontSize: 40 } as never));
  const h1 = doc.elements[0].height;
  doc = updateElement(doc, doc.elements[0].id, { text: 'Now this is a much longer piece of copy that wraps over several lines' } as never);
  assert.ok(doc.elements[0].height > h1);
});

test('brand changes update brand-linked colours and fonts only', () => {
  const doc = createDesign(setup(), 'split-image');
  const next = setBrand(doc, { ...doc.brand, colors: { primary: '#123456', secondary: '#EEEEEE', accent: '#FF5500' }, fonts: { heading: 'Syne', body: 'Inter' } });
  assert.equal(next.background.color, '#123456');
  const headline = next.elements.find((e) => e.slot === 'headline');
  assert.equal(headline?.type === 'text' && headline.fontFamily, 'Syne');
});

test('applyTemplate keeps copy edited on the canvas', () => {
  let doc = createDesign(setup(), 'luxury-editorial');
  const h = doc.elements.find((e) => e.slot === 'headline')!;
  doc = updateElement(doc, h.id, { text: 'Edited headline' } as never);
  doc = applyTemplate(doc, 'full-bleed');
  const h2 = doc.elements.find((e) => e.slot === 'headline');
  assert.equal(h2?.type === 'text' && h2.text, 'Edited headline');
  assert.equal(doc.templateId, 'full-bleed');
});

test('saved templates scale to a different canvas size', () => {
  const source = createDesign(setup(), 'minimal-premium');
  const tpl = toSavedTemplate(source, 'Mine');
  const target = createDesign(setup({ width: 1080, height: 1920, formatId: 'ig-story' }), null);
  const applied = applySavedTemplate(target, tpl);
  assert.equal(applied.elements.length, source.elements.length);
  for (const e of applied.elements) assert.ok(e.y + e.height <= 1920 + 2);
});

test('duplicateDesign creates an independent copy', () => {
  const doc = createDesign(setup(), 'split-image');
  const copy = duplicateDesign(doc);
  assert.notEqual(copy.id, doc.id);
  assert.match(copy.name, /copy/);
  copy.elements[0].x = 999;
  assert.notEqual(doc.elements[0].x, 999);
});
