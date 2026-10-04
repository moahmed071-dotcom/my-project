import type { GeneratedPrompt, PromptFields, PromptInput, PromptType } from '@/types';
import { PROMPT_TYPE_META } from '../promptTypes';
import { createRng, detectSector, detectTone, pick, stripPeriod, type Rng, type SectorProfile, type ToneProfile } from '../knowledge';

const BASE_NEGATIVE = 'blurry, low resolution, jpeg artifacts, oversaturated, distorted proportions, extra limbs, deformed hands, watermark, logo, text artifacts, cluttered background';

interface Ctx {
  rng: Rng;
  subject: string;
  sector: SectorProfile;
  tone: ToneProfile;
  style: string;
  aspect: string;
}

type Spec = (ctx: Ctx) => Omit<PromptFields, 'subject' | 'aspectRatio'>;

const SPECS: Record<PromptType, Spec> = {
  image: ({ rng, sector, tone, style }) => ({
    environment: pick(rng, sector.environments),
    composition: 'Rule-of-thirds composition with a clear focal point, layered foreground depth and clean negative space',
    camera: 'Full-frame camera, 50mm lens, f/2.8, eye-level perspective, shallow depth of field',
    lighting: pick(rng, sector.lighting),
    materials: pick(rng, sector.materials),
    colorDirection: pick(rng, sector.palettes),
    mood: `${tone.adjectives.join(', ')}, aspirational`,
    style: style === 'Auto' ? 'High-end editorial photography, ultra-detailed, photorealistic' : `${style}, ultra-detailed, high-end finish`,
    negativePrompt: BASE_NEGATIVE,
  }),
  video: ({ rng, sector, tone, style }) => ({
    environment: pick(rng, sector.environments),
    composition: 'Opens on a tight detail, then reveals the full scene; subject stays centred through the move; 5–8 second single shot',
    camera: 'Slow, stabilised dolly-in on a gimbal with a subtle parallax arc, 35mm lens, 24fps with natural motion blur',
    lighting: pick(rng, sector.lighting),
    materials: pick(rng, sector.materials),
    colorDirection: `${pick(rng, sector.palettes)}, gentle filmic contrast`,
    mood: `${tone.adjectives.join(', ')}; pacing — ${tone.pacing}`,
    style: style === 'Auto' ? 'Cinematic commercial footage, photoreal, smooth temporal consistency' : `${style}, cinematic motion, temporally consistent`,
    negativePrompt: `${BASE_NEGATIVE}, flicker, morphing, warping geometry, jittery camera, sudden cuts, frame stutter`,
  }),
  product: ({ rng, sector, tone, style }) => ({
    environment: 'Seamless studio sweep with a sculptural plinth and soft graduated backdrop',
    composition: 'Centred hero product at a three-quarter angle, slight low angle for presence, ample breathing room for packaging copy',
    camera: '100mm macro lens, f/8 for edge-to-edge sharpness, focus-stacked, tripod-locked',
    lighting: 'Large overhead softbox key, two strip lights for crisp edge highlights, white bounce card to lift shadows',
    materials: pick(rng, sector.materials),
    colorDirection: pick(rng, sector.palettes),
    mood: `${tone.adjectives.join(', ')}, premium and tactile`,
    style: style === 'Auto' ? 'Commercial product photography, packshot quality, crisp reflections' : `${style} product photography, commercial grade`,
    negativePrompt: `${BASE_NEGATIVE}, warped packaging, misspelled label, dust, fingerprints, harsh hotspots`,
  }),
  realEstate: ({ rng, tone, style }) => {
    const re = detectSector('real estate');
    return {
      environment: pick(rng, re.environments),
      composition: 'Two-point perspective, corrected verticals, wide establishing frame with landscaping in the foreground',
      camera: 'Tilt-shift 24mm lens, f/11, tripod at 1.6m, HDR bracketed exposure',
      lighting: pick(rng, re.lighting),
      materials: pick(rng, re.materials),
      colorDirection: pick(rng, re.palettes),
      mood: `${tone.adjectives.join(', ')}, inviting, lived-in luxury`,
      style: style === 'Auto' ? 'Photorealistic architectural visualization, V-Ray / Corona render quality' : `${style} architectural visualization`,
      negativePrompt: `${BASE_NEGATIVE}, converging verticals, fisheye distortion, empty sterile spaces, unrealistic scale, floating furniture`,
    };
  },
  social: ({ rng, sector, tone, style }) => ({
    environment: pick(rng, sector.environments),
    composition: 'Scroll-stopping centred subject with bold scale, clear top-third negative space reserved for headline, safe zones for UI overlays',
    camera: 'Medium shot, 35mm lens, slightly elevated angle, crisp focus on subject',
    lighting: pick(rng, sector.lighting),
    materials: pick(rng, sector.materials),
    colorDirection: `${pick(rng, sector.palettes)} with one high-contrast accent for thumb-stop impact`,
    mood: `${tone.adjectives.join(', ')}, instantly readable`,
    style: style === 'Auto' ? 'Modern campaign key visual, bold, graphic and clean' : `${style} social campaign visual`,
    negativePrompt: `${BASE_NEGATIVE}, busy composition, small subject, low contrast, generic stock look`,
  }),
  cinematic: ({ rng, sector, tone, style }) => ({
    environment: pick(rng, sector.environments),
    composition: 'Wide anamorphic frame, subject placed off-centre with strong leading lines and atmospheric depth',
    camera: 'Anamorphic 40mm lens, ARRI Alexa look, shallow focus with oval bokeh, subtle lens flare',
    lighting: `${pick(rng, sector.lighting)}, volumetric haze`,
    materials: pick(rng, sector.materials),
    colorDirection: `${pick(rng, sector.palettes)}; graded with rich blacks and soft highlight roll-off`,
    mood: `${tone.adjectives.join(', ')}, emotional, cinematic tension`,
    style: style === 'Auto' ? 'Cinematic advertising still, film grain, high production value' : `${style}, cinematic advertising, film grain`,
    negativePrompt: `${BASE_NEGATIVE}, flat lighting, video-game look, plastic skin, over-sharpened`,
  }),
};

function deriveSubject(idea: string): string {
  const first = stripPeriod(idea.split(/(?<=[.!?])\s|\n/)[0] ?? idea);
  return first.length > 160 ? `${first.slice(0, 157).trim()}…` : first;
}

function compile(type: PromptType, f: PromptFields): string {
  const core = [
    `${f.subject}, ${f.environment}`,
    f.composition,
    f.camera,
    f.lighting,
    `materials: ${f.materials}`,
    `color palette: ${f.colorDirection}`,
    `mood: ${f.mood}`,
    f.style,
  ].join('. ');

  const ar = f.aspectRatio;
  if (type === 'video') return `${core}. Aspect ratio ${ar}. Avoid: ${f.negativePrompt}.`;
  return `${core}. --ar ${ar} --no ${f.negativePrompt.split(', ').slice(0, 6).join(', ')}`;
}

export function buildPrompts(input: PromptInput): GeneratedPrompt[] {
  const idea = input.idea.trim();
  const sector = detectSector(idea);
  const tone = detectTone(`${idea} ${input.style}`);
  const subject = deriveSubject(idea);

  return input.types.map((type) => {
    const rng = createRng(`${idea}|${type}|${input.style}`);
    const aspect = input.aspectRatio === 'Auto' ? PROMPT_TYPE_META[type].defaultAspect : input.aspectRatio;
    const spec = SPECS[type]({ rng, subject, sector, tone, style: input.style, aspect });
    const fields: PromptFields = { subject, aspectRatio: aspect, ...spec };
    return { type, fields, compiled: compile(type, fields) };
  });
}
