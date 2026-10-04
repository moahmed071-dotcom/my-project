import { uid } from '@/lib/id';
import { resolveRole } from './color';
import { withAutoHeight } from './textLayout';
import type {
  CircleElement,
  DesignBrand,
  DesignElement,
  GradientElement,
  ImageElement,
  LineElement,
  LogoElement,
  RectElement,
  TextElement,
} from './types';

export const newElementId = () => uid('el');

type Base = Pick<DesignElement, 'x' | 'y' | 'width' | 'height'> & Partial<Pick<DesignElement, 'rotation' | 'opacity' | 'zIndex' | 'name' | 'slot'>>;

function base(b: Base) {
  return { id: newElementId(), rotation: 0, opacity: 1, zIndex: 0, name: '', ...b };
}

export function makeText(b: Base & Partial<TextElement> & { text: string }): TextElement {
  return withAutoHeight({
    fontFamily: 'Manrope',
    fontSize: 48,
    fontWeight: 400,
    fontStyle: 'normal',
    lineHeight: 1.2,
    letterSpacing: 0,
    align: 'left',
    textTransform: 'none',
    color: '#111111',
    ...base(b),
    name: b.name || 'Text',
    ...b,
    type: 'text',
  } as TextElement);
}

export function makeImage(b: Base & Partial<ImageElement>): ImageElement {
  return { src: null, fit: 'cover', radius: 0, ...base(b), name: b.name || 'Image', ...b, type: 'image' } as ImageElement;
}

export function makeLogo(b: Base & Partial<LogoElement>): LogoElement {
  return { src: null, fallbackText: 'Logo', color: '#111111', align: 'left', ...base(b), name: b.name || 'Logo', ...b, type: 'logo' } as LogoElement;
}

export function makeRect(b: Base & Partial<RectElement>): RectElement {
  return { fill: '#111111', stroke: 'none', strokeWidth: 0, radius: 0, ...base(b), name: b.name || 'Rectangle', ...b, type: 'rect' } as RectElement;
}

export function makeCircle(b: Base & Partial<CircleElement>): CircleElement {
  return { fill: '#111111', stroke: 'none', strokeWidth: 0, ...base(b), name: b.name || 'Circle', ...b, type: 'circle' } as CircleElement;
}

export function makeLine(b: Base & Partial<LineElement>): LineElement {
  return { stroke: '#111111', strokeWidth: 2, ...base(b), name: b.name || 'Line', ...b, type: 'line' } as LineElement;
}

export function makeGradient(b: Base & Partial<GradientElement>): GradientElement {
  return {
    angle: 90,
    stops: [
      { offset: 0, color: '#000000', opacity: 0 },
      { offset: 1, color: '#000000', opacity: 0.75 },
    ],
    ...base(b),
    name: b.name || 'Gradient overlay',
    ...b,
    type: 'gradient',
  } as GradientElement;
}

// ─── Text presets (Elements panel) ──────────────────────────────────────────

export interface TextPreset {
  id: string;
  label: string;
  sample: string;
  /** Relative to the shorter canvas side. */
  sizeRatio: number;
  fontRole: 'heading' | 'body';
  weight: number;
  italic?: boolean;
  letterSpacing: number;
  lineHeight: number;
  uppercase?: boolean;
  colorRole: 'onLight' | 'accent';
  widthRatio: number;
  slot?: TextElement['slot'];
}

export const TEXT_PRESETS: TextPreset[] = [
  { id: 'headline', label: 'Headline', sample: 'Add a headline', sizeRatio: 0.085, fontRole: 'heading', weight: 700, letterSpacing: -0.01, lineHeight: 1.05, colorRole: 'onLight', widthRatio: 0.8, slot: 'headline' },
  { id: 'luxury', label: 'Luxury Headline', sample: 'Quiet, considered living', sizeRatio: 0.075, fontRole: 'heading', weight: 400, italic: true, letterSpacing: 0, lineHeight: 1.08, colorRole: 'onLight', widthRatio: 0.75, slot: 'headline' },
  { id: 'subheading', label: 'Subheading', sample: 'Add a subheading', sizeRatio: 0.04, fontRole: 'body', weight: 500, letterSpacing: 0, lineHeight: 1.3, colorRole: 'onLight', widthRatio: 0.7, slot: 'subheadline' },
  { id: 'label', label: 'Small Label', sample: 'NEW LAUNCH', sizeRatio: 0.02, fontRole: 'body', weight: 600, letterSpacing: 0.22, lineHeight: 1.2, uppercase: true, colorRole: 'accent', widthRatio: 0.5, slot: 'label' },
  { id: 'body', label: 'Body', sample: 'Add body text. Keep it short and specific so it reads at a glance.', sizeRatio: 0.026, fontRole: 'body', weight: 400, letterSpacing: 0, lineHeight: 1.45, colorRole: 'onLight', widthRatio: 0.6, slot: 'body' },
  { id: 'cta', label: 'CTA', sample: 'Register your interest', sizeRatio: 0.026, fontRole: 'body', weight: 700, letterSpacing: 0.08, lineHeight: 1.2, uppercase: true, colorRole: 'accent', widthRatio: 0.5, slot: 'cta' },
];

/** Quick-add buttons map to presets. */
export const QUICK_TEXT: { label: string; preset: string }[] = [
  { label: 'Heading', preset: 'headline' },
  { label: 'Subheading', preset: 'subheading' },
  { label: 'Body', preset: 'body' },
  { label: 'CTA', preset: 'cta' },
];

export function textFromPreset(presetId: string, canvas: { width: number; height: number }, brand: DesignBrand): TextElement {
  const p = TEXT_PRESETS.find((x) => x.id === presetId) ?? TEXT_PRESETS[0];
  const short = Math.min(canvas.width, canvas.height);
  const width = Math.round(canvas.width * p.widthRatio);
  const el = makeText({
    name: p.label,
    text: p.sample,
    x: Math.round((canvas.width - width) / 2),
    y: 0,
    width,
    height: 10,
    fontFamily: brand.fonts[p.fontRole],
    fontRole: p.fontRole,
    fontSize: Math.round(short * p.sizeRatio),
    fontWeight: p.weight,
    fontStyle: p.italic ? 'italic' : 'normal',
    letterSpacing: p.letterSpacing,
    lineHeight: p.lineHeight,
    textTransform: p.uppercase ? 'uppercase' : 'none',
    align: 'center',
    color: resolveRole(p.colorRole, brand.colors),
    colorRole: p.colorRole,
  });
  return { ...el, y: Math.round((canvas.height - el.height) / 2) };
}

export function defaultShape(kind: 'rect' | 'circle' | 'line' | 'gradient', canvas: { width: number; height: number }, brand: DesignBrand): DesignElement {
  const short = Math.min(canvas.width, canvas.height);
  const s = Math.round(short * 0.3);
  const cx = (canvas.width - s) / 2;
  const cy = (canvas.height - s) / 2;
  switch (kind) {
    case 'rect':
      return makeRect({ x: cx, y: cy, width: s, height: s, fill: resolveRole('accent', brand.colors), fillRole: 'accent' });
    case 'circle':
      return makeCircle({ x: cx, y: cy, width: s, height: s, fill: resolveRole('accent', brand.colors), fillRole: 'accent' });
    case 'line': {
      const w = Math.round(canvas.width * 0.4);
      return makeLine({ x: (canvas.width - w) / 2, y: canvas.height / 2 - 6, width: w, height: 12, strokeWidth: Math.max(2, Math.round(short * 0.003)), stroke: resolveRole('accent', brand.colors), strokeRole: 'accent' });
    }
    case 'gradient':
      return makeGradient({
        x: 0,
        y: Math.round(canvas.height * 0.4),
        width: canvas.width,
        height: Math.round(canvas.height * 0.6),
        stops: [
          { offset: 0, color: resolveRole('dark', brand.colors), colorRole: 'dark', opacity: 0 },
          { offset: 1, color: resolveRole('dark', brand.colors), colorRole: 'dark', opacity: 0.85 },
        ],
      });
  }
}
