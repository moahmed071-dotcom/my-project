import type { Brief, Campaign, GeneratedPrompt, OutputSection } from '@/types';
import { PROMPT_TYPE_META } from '@/services/ai/promptTypes';

function sectionToText(s: OutputSection): string {
  const lines = [s.title.toUpperCase()];
  if (s.body) lines.push(s.body);
  if (s.items?.length) lines.push(...s.items.map((i) => `• ${i}`));
  return lines.join('\n');
}

export function briefToText(brief: Brief): string {
  const { input, output } = brief;
  return [
    `CREATIVE BRIEF — ${input.projectName}`,
    `Client: ${input.client}`,
    output.headline,
    '',
    ...output.sections.map(sectionToText).join('\n\n').split('\n'),
  ].join('\n');
}

export function campaignToText(c: Campaign): string {
  const o = c.output;
  const out: string[] = [
    `CAMPAIGN — ${c.input.brand} / ${c.input.product}`,
    '',
    'BIG IDEA',
    o.bigIdea,
    o.bigIdeaRationale,
    '',
    'CONCEPT',
    o.concept,
    '',
    'TAGLINES',
    ...o.taglines.map((t, i) => `${i + 1}. ${t}`),
    '',
    'KEY VISUAL DIRECTION',
    ...o.keyVisual.map((t) => `• ${t}`),
    '',
    'ART DIRECTION',
    ...o.artDirection.map((t) => `• ${t}`),
    '',
    'SOCIAL MEDIA IDEAS',
    ...o.socialIdeas.map((s, i) => `${i + 1}. ${s.title} (${s.format}) — ${s.description}`),
    '',
    'VIDEO CONCEPTS',
    ...o.videoConcepts.flatMap((v, i) => [
      `${i + 1}. ${v.title} · ${v.duration}`,
      `   ${v.logline}`,
      ...v.beats.map((b) => `   – ${b}`),
    ]),
    '',
    'CTA',
    `Primary: ${o.cta.primary}`,
    `Alternatives: ${o.cta.alternatives.join(' / ')}`,
    '',
    'CONTENT PILLARS',
    ...o.contentPillars.map((p) => `• ${p.name} — ${p.description}`),
  ];
  return out.join('\n');
}

export function promptToText(p: GeneratedPrompt): string {
  const f = p.fields;
  return [
    `${PROMPT_TYPE_META[p.type].label.toUpperCase()} PROMPT`,
    '',
    p.compiled,
    '',
    `Subject: ${f.subject}`,
    `Environment: ${f.environment}`,
    `Composition: ${f.composition}`,
    `Camera: ${f.camera}`,
    `Lighting: ${f.lighting}`,
    `Materials: ${f.materials}`,
    `Color Direction: ${f.colorDirection}`,
    `Mood: ${f.mood}`,
    `Style: ${f.style}`,
    `Aspect Ratio: ${f.aspectRatio}`,
    `Negative Prompt: ${f.negativePrompt}`,
  ].join('\n');
}
