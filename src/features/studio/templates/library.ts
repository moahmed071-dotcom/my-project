import { makeCircle, makeGradient, makeImage, makeLine, makeRect, makeText } from '../model/elements';
import { measure } from '../model/textLayout';
import type { ColorRole, DesignBackground, DesignElement } from '../model/types';
import { column, ctaBlock, Kit, logoEl, place, textEl, type Region, type TemplateContext } from './kit';

export interface TemplateResult {
  background: DesignBackground;
  elements: DesignElement[];
}

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  bestFor: string[];
  /** Canvas the template is designed around; it adapts to any size. */
  defaultFormat: string;
  /** Human-readable anatomy shown in the template browser. */
  anatomy: string;
  build(ctx: TemplateContext): TemplateResult;
}

const bg = (k: Kit, role: ColorRole): DesignBackground => ({ color: k.color(role), colorRole: role });

function hero(k: Kit, r: Region, extra: Partial<Parameters<typeof makeImage>[0]> = {}) {
  return makeImage({
    name: 'Hero image',
    slot: 'image',
    x: Math.round(r.x),
    y: Math.round(r.y),
    width: Math.round(r.w),
    height: Math.round(r.h),
    src: k.ctx.image,
    placeholderHint: k.ctx.content.visualDirection || 'Hero image',
    ...extra,
  });
}

const withZ = (els: (DesignElement | null | undefined)[]): DesignElement[] =>
  els.filter((e): e is DesignElement => !!e).map((e, i) => ({ ...e, zIndex: i }));

// 1 ─────────────────────────────────────────────────────────────────────────
const luxuryEditorial: TemplateDefinition = {
  id: 'luxury-editorial',
  name: 'Luxury Editorial',
  description: 'Framed hero image on a deep ground with a serif headline, like a magazine opener.',
  bestFor: ['Real estate', 'Luxury'],
  defaultFormat: 'ig-portrait',
  anatomy: 'Deep background · inset frame · framed image · label → serif headline → rule → sub · text CTA · logo top',
  build(ctx) {
    const k = new Kit(ctx);
    const { W, H, m } = k;
    const deep = k.deepRole();
    const on: ColorRole = 'onDark';
    const frameInset = Math.round(m * 0.45);
    const frame = makeRect({ name: 'Frame', x: frameInset, y: frameInset, width: W - frameInset * 2, height: H - frameInset * 2, fill: 'none', stroke: k.color('accent'), strokeRole: 'accent', strokeWidth: Math.max(1, k.px(0.0016)), opacity: 0.55 });
    const textSpec = {
      label: { role: 'body' as const, weight: 600, size: 0.019, letterSpacing: 0.28, uppercase: true, colorRole: 'accent' as ColorRole },
      headline: { role: 'heading' as const, weight: 400, size: 0.09, minSize: 0.045, maxLines: 3, lineHeight: 1.04, colorRole: on },
      divider: { colorRole: 'accent' as ColorRole, width: 0.1 },
      sub: { role: 'body' as const, weight: 400, size: 0.025, lineHeight: 1.45, colorRole: on, opacity: 0.78 },
      cta: { kind: 'text' as const, colorRole: 'accent' as ColorRole },
    };
    if (k.landscape) {
      const img = hero(k, { x: W * 0.5, y: m, w: W * 0.5 - m, h: H - 2 * m });
      const col = column(k, { x: m * 1.2, y: m * 1.9, w: W * 0.5 - m * 2.2, h: H - m * 3 }, { align: 'left', anchor: 'center', ...textSpec, pinCta: true, subWidth: 0.95 });
      return { background: bg(k, deep), elements: withZ([img, frame, logoEl(k, m * 1.2, m * 0.9, 'left', on, 0.8), ...col]) };
    }
    const top = m * 1.9;
    const imgH = H * (k.o === 'tall' ? 0.5 : k.o === 'square' ? 0.44 : 0.5);
    const img = hero(k, { x: m, y: top, w: W - 2 * m, h: imgH });
    const col = column(k, { x: m, y: top + imgH + m * 0.75, w: W - 2 * m, h: H - top - imgH - m * 1.75 }, { align: 'left', anchor: 'top', ...textSpec, pinCta: true, subWidth: 0.86 });
    return { background: bg(k, deep), elements: withZ([img, frame, logoEl(k, m, m * 0.75, 'left', on, 0.8), ...col]) };
  },
};

// 2 ─────────────────────────────────────────────────────────────────────────
const architecturalBold: TemplateDefinition = {
  id: 'architectural-bold',
  name: 'Architectural Bold',
  description: 'Full-bleed architecture cut by a solid block and an oversized uppercase headline.',
  bestFor: ['Real estate', 'Corporate'],
  defaultFormat: 'ig-portrait',
  anatomy: 'Full-bleed image · grid lines · solid colour block · accent bar · uppercase headline · filled CTA · logo top right',
  build(ctx) {
    const k = new Kit(ctx);
    const { W, H, m } = k;
    const img = hero(k, { x: 0, y: 0, w: W, h: H });
    const blockRole = k.deepRole();
    const on: ColorRole = 'onDark';
    const spec = {
      label: { role: 'body' as const, weight: 700, size: 0.018, letterSpacing: 0.3, uppercase: true, colorRole: 'accent' as ColorRole },
      headline: { role: 'heading' as const, weight: 800, size: 0.1, minSize: 0.05, maxLines: 3, lineHeight: 0.98, letterSpacing: -0.01, uppercase: true, colorRole: on },
      sub: { role: 'body' as const, weight: 400, size: 0.024, lineHeight: 1.45, colorRole: on, opacity: 0.8 },
      cta: { kind: 'button' as const, colorRole: 'accent' as ColorRole, labelRole: 'onAccent' as ColorRole },
    };
    const lineW = Math.max(1, k.px(0.0015));
    if (k.landscape) {
      const bw = W * 0.47;
      const block = makeRect({ name: 'Colour block', x: 0, y: 0, width: bw, height: H, fill: k.color(blockRole), fillRole: blockRole });
      const bar = makeRect({ name: 'Accent bar', x: bw - k.px(0.006), y: H * 0.3, width: k.px(0.012), height: H * 0.4, fill: k.color('accent'), fillRole: 'accent' });
      const grid = [0.66, 0.83].map((r, i) => makeLine({ name: `Grid line ${i + 1}`, x: W * r - H / 2, y: H / 2 - 1, width: H, height: 2, rotation: 90, stroke: k.color('light'), strokeRole: 'light', strokeWidth: lineW, opacity: 0.35 }));
      const col = column(k, { x: m, y: m * 1.9, w: bw - m * 2, h: H - m * 2.9 }, { align: 'left', anchor: 'bottom', ...spec, gap: 0.028 });
      return { background: bg(k, blockRole), elements: withZ([img, ...grid, block, bar, logoEl(k, m, m * 0.85, 'left', on, 0.85), ...col]) };
    }
    const split = H * (k.o === 'tall' ? 0.58 : k.o === 'square' ? 0.5 : 0.55);
    const block = makeRect({ name: 'Colour block', x: 0, y: split, width: W, height: H - split, fill: k.color(blockRole), fillRole: blockRole });
    const bar = makeRect({ name: 'Accent bar', x: m, y: split - k.px(0.07), width: k.px(0.012), height: k.px(0.14), fill: k.color('accent'), fillRole: 'accent' });
    const grid = [0.34, 0.67].map((r, i) => makeLine({ name: `Grid line ${i + 1}`, x: W * r - split / 2, y: split / 2 - 1, width: split, height: 2, rotation: 90, stroke: k.color('light'), strokeRole: 'light', strokeWidth: lineW, opacity: 0.35 }));
    const col = column(k, { x: m * 1.7, y: split + m * 0.9, w: W - m * 2.7, h: H - split - m * 1.8 }, { align: 'left', anchor: 'top', ...spec, gap: 0.026, subWidth: 0.9 });
    return { background: bg(k, blockRole), elements: withZ([img, ...grid, block, bar, logoEl(k, W - m, m * 0.8, 'right', 'light', 0.85), ...col]) };
  },
};

// 3 ─────────────────────────────────────────────────────────────────────────
const minimalPremium: TemplateDefinition = {
  id: 'minimal-premium',
  name: 'Minimal Premium',
  description: 'A calm, light layout: generous white space, an inset image and restrained centred type.',
  bestFor: ['Luxury', 'Product', 'Corporate'],
  defaultFormat: 'ig-square',
  anatomy: 'Light background · inset image · centred label → headline → hairline → sub · text CTA · logo bottom',
  build(ctx) {
    const k = new Kit(ctx);
    const { W, H, m } = k;
    const on: ColorRole = 'onLight';
    const spec = {
      label: { role: 'body' as const, weight: 600, size: 0.017, letterSpacing: 0.3, uppercase: true, colorRole: 'accent' as ColorRole },
      headline: { role: 'heading' as const, weight: 400, size: 0.064, minSize: 0.036, maxLines: 3, lineHeight: 1.1, colorRole: on },
      divider: { colorRole: on, width: 0.06, opacity: 0.35 },
      sub: { role: 'body' as const, weight: 400, size: 0.022, lineHeight: 1.5, colorRole: on, opacity: 0.7 },
      cta: { kind: 'text' as const, colorRole: on },
    };
    if (k.landscape) {
      const img = hero(k, { x: m, y: m, w: W * 0.48 - m, h: H - 2 * m });
      const col = column(k, { x: W * 0.55, y: m, w: W * 0.45 - m * 1.4, h: H - m * 2.6 }, { align: 'left', anchor: 'center', ...spec });
      return { background: bg(k, 'light'), elements: withZ([img, ...col, logoEl(k, W * 0.55, H - m * 1.3, 'left', on, 0.7)]) };
    }
    const inset = m * 1.35;
    const imgH = H * (k.o === 'tall' ? 0.5 : k.o === 'square' ? 0.42 : 0.5);
    const img = hero(k, { x: inset, y: inset, w: W - inset * 2, h: imgH });
    const logoH = k.px(0.055 * 0.7);
    const col = column(k, { x: inset, y: inset + imgH + m * 0.7, w: W - inset * 2, h: H - inset - imgH - m * 1.6 - logoH - m * 0.6 }, { align: 'center', anchor: 'center', ...spec, subWidth: 0.82 });
    return { background: bg(k, 'light'), elements: withZ([img, ...col, logoEl(k, W / 2, H - m * 0.9 - logoH, 'center', on, 0.7)]) };
  },
};

// 4 ─────────────────────────────────────────────────────────────────────────
const splitImage: TemplateDefinition = {
  id: 'split-image',
  name: 'Split Image',
  description: 'Half image, half colour field. Direct and highly legible for announcements and offers.',
  bestFor: ['Corporate', 'Product', 'Real estate'],
  defaultFormat: 'ig-square',
  anatomy: 'Image half · solid brand half · accent square on the seam · left-aligned stack · outline CTA · logo opposite',
  build(ctx) {
    const k = new Kit(ctx);
    const { W, H, m } = k;
    const field: ColorRole = 'primary';
    const on: ColorRole = 'onPrimary';
    const spec = {
      label: { role: 'body' as const, weight: 700, size: 0.018, letterSpacing: 0.24, uppercase: true, colorRole: 'accent' as ColorRole },
      headline: { role: 'heading' as const, weight: 700, size: 0.075, minSize: 0.04, maxLines: 3, lineHeight: 1.05, colorRole: on },
      sub: { role: 'body' as const, weight: 400, size: 0.024, lineHeight: 1.45, colorRole: on, opacity: 0.82 },
      cta: { kind: 'outline' as const, colorRole: on },
    };
    const sq = k.px(0.085);
    if (k.landscape) {
      const img = hero(k, { x: 0, y: 0, w: W / 2, h: H });
      const accent = makeRect({ name: 'Accent square', x: W / 2 - sq / 2, y: m, width: sq, height: sq, fill: k.color('accent'), fillRole: 'accent' });
      const col = column(k, { x: W / 2 + m, y: m * 1.9, w: W / 2 - m * 2, h: H - m * 2.9 }, { align: 'left', anchor: 'center', ...spec, pinCta: true });
      return { background: bg(k, field), elements: withZ([img, accent, logoEl(k, W - m, m * 0.85, 'right', on, 0.8), ...col]) };
    }
    const split = H * (k.o === 'tall' ? 0.55 : 0.5);
    const img = hero(k, { x: 0, y: 0, w: W, h: split });
    const accent = makeRect({ name: 'Accent square', x: W - m - sq, y: split - sq / 2, width: sq, height: sq, fill: k.color('accent'), fillRole: 'accent' });
    const logoH = k.px(0.055 * 0.8);
    const col = column(k, { x: m, y: split + m * 0.9, w: W - 2 * m, h: H - split - m * 1.9 }, { align: 'left', anchor: 'top', ...spec, pinCta: true, subWidth: 0.85 });
    return { background: bg(k, field), elements: withZ([img, accent, ...col, logoEl(k, W - m, H - m - logoH * 1.05, 'right', on, 0.8)]) };
  },
};

// 5 ─────────────────────────────────────────────────────────────────────────
const fullBleed: TemplateDefinition = {
  id: 'full-bleed',
  name: 'Full Bleed',
  description: 'Edge-to-edge image with a soft gradient and confident type over it.',
  bestFor: ['Real estate', 'Luxury', 'Product'],
  defaultFormat: 'ig-story',
  anatomy: 'Full-bleed image · dark gradient overlay · accent rule + label · headline · sub · filled CTA · logo top left',
  build(ctx) {
    const k = new Kit(ctx);
    const { W, H, m } = k;
    const img = hero(k, { x: 0, y: 0, w: W, h: H });
    const on: ColorRole = 'onDark';
    const spec = {
      label: { role: 'body' as const, weight: 600, size: 0.019, letterSpacing: 0.26, uppercase: true, colorRole: 'accent' as ColorRole },
      headline: { role: 'heading' as const, weight: 600, size: 0.09, minSize: 0.045, maxLines: 3, lineHeight: 1.03, colorRole: on },
      sub: { role: 'body' as const, weight: 400, size: 0.025, lineHeight: 1.45, colorRole: on, opacity: 0.85 },
      cta: { kind: 'button' as const, colorRole: 'accent' as ColorRole, labelRole: 'onAccent' as ColorRole },
    };
    const dark = k.color('dark');
    if (k.landscape) {
      const grad = makeGradient({ name: 'Gradient overlay', x: 0, y: 0, width: W * 0.75, height: H, angle: 0, stops: [{ offset: 0, color: dark, colorRole: 'dark', opacity: 0.92 }, { offset: 1, color: dark, colorRole: 'dark', opacity: 0 }] });
      const col = column(k, { x: m, y: m * 1.9, w: W * 0.5 - m, h: H - m * 2.9 }, { align: 'left', anchor: 'bottom', ...spec });
      return { background: bg(k, 'dark'), elements: withZ([img, grad, logoEl(k, m, m * 0.8, 'left', 'light', 0.85), ...col]) };
    }
    const gTop = H * (k.o === 'tall' ? 0.35 : 0.3);
    const grad = makeGradient({ name: 'Gradient overlay', x: 0, y: gTop, width: W, height: H - gTop, angle: 90, stops: [{ offset: 0, color: dark, colorRole: 'dark', opacity: 0 }, { offset: 0.55, color: dark, colorRole: 'dark', opacity: 0.7 }, { offset: 1, color: dark, colorRole: 'dark', opacity: 0.94 }] });
    const topGrad = makeGradient({ name: 'Top shade', x: 0, y: 0, width: W, height: H * 0.18, angle: 90, stops: [{ offset: 0, color: dark, colorRole: 'dark', opacity: 0.45 }, { offset: 1, color: dark, colorRole: 'dark', opacity: 0 }] });
    const bottomPad = k.o === 'tall' ? H * 0.12 : m;
    const col = column(k, { x: m, y: H * 0.45, w: W - 2 * m, h: H * 0.55 - bottomPad }, { align: 'left', anchor: 'bottom', ...spec, subWidth: 0.88 });
    return { background: bg(k, 'dark'), elements: withZ([img, grad, topGrad, logoEl(k, m, k.o === 'tall' ? H * 0.07 : m * 0.8, 'left', 'light', 0.85), ...col]) };
  },
};

// 6 ─────────────────────────────────────────────────────────────────────────
const typographyFocus: TemplateDefinition = {
  id: 'typography-focus',
  name: 'Typography Focus',
  description: 'No image: an oversized headline carries the message, with one geometric accent.',
  bestFor: ['Corporate', 'Luxury', 'Product'],
  defaultFormat: 'ig-square',
  anatomy: 'Solid brand background · outline circle + dot · logo & label top · giant headline · rule · sub + text CTA',
  build(ctx) {
    const k = new Kit(ctx);
    const { W, H, m, S } = k;
    const field: ColorRole = 'primary';
    const on: ColorRole = 'onPrimary';
    const d = S * 0.78;
    const ring = makeCircle({ name: 'Accent ring', x: W - d * 0.62, y: -d * 0.3, width: d, height: d, fill: 'none', stroke: k.color('accent'), strokeRole: 'accent', strokeWidth: Math.max(2, k.px(0.004)), opacity: 0.9 });
    const dot = makeCircle({ name: 'Accent dot', x: W - m - k.px(0.035), y: m * 0.95, width: k.px(0.035), height: k.px(0.035), fill: k.color('accent'), fillRole: 'accent' });
    const label = ctx.content.label.trim()
      ? textEl(k, { role: 'body', weight: 700, size: 0.018, letterSpacing: 0.28, uppercase: true, colorRole: 'accent' }, ctx.content.label, m, W * 0.6, 'left', 'Label', 'label')
      : null;
    const cta = ctx.content.cta.trim() ? ctaBlock(k, { kind: 'text', colorRole: 'accent' }, ctx.content.cta) : null;
    const inner = W - 2 * m;
    const besideW = cta ? inner - cta.w - m * 0.8 : inner;
    const side = !cta || besideW >= inner * 0.45;
    const sub = ctx.content.subheadline.trim()
      ? textEl(k, { role: 'body', weight: 400, size: 0.023, lineHeight: 1.45, colorRole: on, opacity: 0.8 }, ctx.content.subheadline, m, side ? Math.min(besideW, inner * (k.landscape ? 0.5 : 0.62)) : inner * 0.8, 'left', 'Subheadline', 'subheadline')
      : null;
    // Footer under the rule: sub and CTA side by side, or stacked when the CTA is too wide.
    const footerH = side ? Math.max(sub?.height ?? 0, cta?.h ?? 0) : (sub ? sub.height + m * 0.4 : 0) + (cta?.h ?? 0);
    const ruleY = H - m - Math.max(S * 0.12, footerH + m * 0.55);
    const top = m * 2.3;
    const headline = textEl(k, { role: 'heading', weight: 700, size: 0.17, minSize: 0.06, maxLines: 5, lineHeight: 0.96, letterSpacing: -0.02, colorRole: on }, ctx.content.headline || ' ', m, inner, 'left', 'Headline', 'headline', ruleY - top - m * 0.8);
    const rule = makeLine({ name: 'Rule', x: m, y: ruleY, width: inner, height: 2, strokeWidth: Math.max(1, k.px(0.002)), stroke: k.color(on), strokeRole: on, opacity: 0.3 });
    const els = [
      ring,
      dot,
      logoEl(k, m, m * 0.8, 'left', on, 0.75),
      label ? { ...label, y: Math.round(m * 0.95 + k.px(0.06)) } : null,
      { ...headline, y: Math.round(ruleY - m * 0.8 - headline.height) },
      rule,
      sub ? { ...sub, y: Math.round(ruleY + m * 0.55) } : null,
      ...(cta ? (side ? place(cta.els, W - m - cta.w, ruleY + m * 0.55) : place(cta.els, m, ruleY + m * 0.55 + (sub ? sub.height + m * 0.4 : 0))) : []),
    ];
    return { background: bg(k, field), elements: withZ(els) };
  },
};

// 7 ─────────────────────────────────────────────────────────────────────────
const propertyShowcase: TemplateDefinition = {
  id: 'property-showcase',
  name: 'Property Showcase',
  description: 'A real-estate listing card: big property image, launch tag and a clear enquiry CTA.',
  bestFor: ['Real estate'],
  defaultFormat: 'ig-portrait',
  anatomy: 'Light background · large image · accent launch tag on the image edge · headline · sub · filled CTA · logo bottom right',
  build(ctx) {
    const k = new Kit(ctx);
    const { W, H, m } = k;
    const on: ColorRole = 'onLight';
    const tagText = (ctx.content.label || 'New launch').trim();
    const tagFs = k.S * 0.018;
    const tagLabel = makeText({ name: 'Tag label', slot: 'label', text: tagText, x: 0, y: 0, width: k.S * 0.5, height: 0, fontFamily: k.font('body'), fontRole: 'body', fontSize: tagFs, fontWeight: 700, letterSpacing: 0.22, textTransform: 'uppercase', align: 'left', color: k.color('onAccent'), colorRole: 'onAccent' });
    const tw = Math.min(k.S * 0.5, measureTag(tagText, tagFs, k));
    const padX = tagFs * 1.2;
    const padY = tagFs * 0.8;
    const tagW = tw + padX * 2;
    const tagH = tagLabel.height + padY * 2;
    const tag = (x: number, y: number) => [
      makeRect({ name: 'Tag', x, y, width: tagW, height: tagH, fill: k.color('accent'), fillRole: 'accent' }),
      { ...tagLabel, x: Math.round(x + padX), y: Math.round(y + padY), width: Math.ceil(tw) + 2 },
    ];
    const spec = {
      headline: { role: 'heading' as const, weight: 600, size: 0.072, minSize: 0.04, maxLines: 2, lineHeight: 1.05, colorRole: on },
      sub: { role: 'body' as const, weight: 400, size: 0.024, lineHeight: 1.45, colorRole: on, opacity: 0.72 },
      cta: { kind: 'button' as const, colorRole: 'primary' as ColorRole, labelRole: 'onPrimary' as ColorRole },
    };
    const logoH = k.px(0.055 * 0.75);
    if (k.landscape) {
      const img = hero(k, { x: m * 0.6, y: m * 0.6, w: W * 0.58, h: H - m * 1.2 });
      const col = column(k, { x: W * 0.58 + m * 1.4, y: m * 1.2, w: W * 0.42 - m * 2, h: H - m * 2.4 - logoH - m * 0.6 }, { align: 'left', anchor: 'center', ...spec, pinCta: true });
      return { background: bg(k, 'light'), elements: withZ([img, ...tag(m * 0.6, m * 0.6 + (H - m * 1.2) - tagH), ...col, logoEl(k, W * 0.58 + m * 1.4, H - m - logoH, 'left', on, 0.75)]) };
    }
    const imgH = H * (k.o === 'tall' ? 0.6 : k.o === 'square' ? 0.55 : 0.6);
    const img = hero(k, { x: m * 0.6, y: m * 0.6, w: W - m * 1.2, h: imgH });
    const tagY = m * 0.6 + imgH - tagH / 2;
    const colTop = m * 0.6 + imgH + tagH / 2 + m * 0.6;
    const col = column(k, { x: m, y: colTop, w: W - 2 * m, h: H - colTop - m }, { align: 'left', anchor: 'top', ...spec, pinCta: true, subWidth: 0.88 });
    const logo = logoEl(k, W - m, H - m - logoH, 'right', on, 0.75);
    return { background: bg(k, 'light'), elements: withZ([img, ...tag(m, tagY), ...col, logo]) };
  },
};

/** Width of an uppercase label set in the body font. */
function measureTag(text: string, fs: number, k: Kit, letterSpacing = 0.22): number {
  return Math.ceil(measure(text.toUpperCase(), { fontFamily: k.font('body'), fontSize: fs, fontWeight: 700, fontStyle: 'normal', letterSpacing, lineHeight: 1.2, textTransform: 'uppercase' }));
}

// 8 ─────────────────────────────────────────────────────────────────────────
const campaignAnnouncement: TemplateDefinition = {
  id: 'campaign-announcement',
  name: 'Campaign Announcement',
  description: 'Centred, poster-like announcement for launches, events and seasonal campaigns.',
  bestFor: ['Product', 'Corporate', 'Luxury'],
  defaultFormat: 'ig-square',
  anatomy: 'Brand background · concentric rings · logo top · outlined label · centred headline · accent rule · sub · filled CTA',
  build(ctx) {
    const k = new Kit(ctx);
    const { W, H, m, S } = k;
    const field = k.deepRole();
    const on: ColorRole = 'onDark';
    const rings = [1.05, 0.78].map((r, i) =>
      makeCircle({ name: `Ring ${i + 1}`, x: W / 2 - (S * r) / 2, y: H / 2 - (S * r) / 2, width: S * r, height: S * r, fill: 'none', stroke: k.color('accent'), strokeRole: 'accent', strokeWidth: Math.max(1, k.px(0.0018)), opacity: i === 0 ? 0.18 : 0.3 }),
    );
    const els: (DesignElement | null)[] = [...rings, logoEl(k, W / 2, m * 0.9, 'center', on, 0.8)];
    const logoBottom = m * 0.9 + k.px(0.055 * 0.8);
    let top = logoBottom + m * 0.9;
    if (ctx.content.label.trim()) {
      const lab = textEl(k, { role: 'body', weight: 700, size: 0.018, letterSpacing: 0.3, uppercase: true, colorRole: 'accent' }, ctx.content.label, 0, W, 'center', 'Label', 'label');
      const lw = Math.min(W - 2 * m, measureTag(ctx.content.label, lab.fontSize, k, 0.3) + lab.fontSize * 2.6);
      const box = makeRect({ name: 'Label frame', x: (W - lw) / 2, y: top, width: lw, height: lab.height + lab.fontSize * 1.4, fill: 'none', stroke: k.color('accent'), strokeRole: 'accent', strokeWidth: Math.max(1, k.px(0.0018)) });
      els.push(box, { ...lab, x: Math.round((W - lw) / 2), width: Math.round(lw), y: Math.round(top + lab.fontSize * 0.7) });
      top += box.height + m * 0.6;
    }
    const col = column(
      k,
      { x: m * 1.3, y: top, w: W - m * 2.6, h: H - top - m * 1.1 },
      {
        align: 'center',
        anchor: 'center',
        headline: { role: 'heading', weight: 600, size: 0.095, minSize: 0.045, maxLines: 3, lineHeight: 1.02, colorRole: on },
        divider: { colorRole: 'accent', width: 0.08 },
        sub: { role: 'body', weight: 400, size: 0.024, lineHeight: 1.45, colorRole: on, opacity: 0.8 },
        cta: { kind: 'button', colorRole: 'accent', labelRole: 'onAccent' },
        subWidth: 0.8,
      },
    );
    return { background: bg(k, field), elements: withZ([...els, ...col]) };
  },
};

export const TEMPLATES: TemplateDefinition[] = [
  luxuryEditorial,
  architecturalBold,
  minimalPremium,
  splitImage,
  fullBleed,
  typographyFocus,
  propertyShowcase,
  campaignAnnouncement,
];

export function getTemplate(id: string | null | undefined): TemplateDefinition | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
