import { derivePalette, luminance, resolveRole, type Palette } from '../model/color';
import { makeLine, makeLogo, makeRect, makeText } from '../model/elements';
import { fitFontSize, measure } from '../model/textLayout';
import type { ColorRole, DesignBrand, DesignContent, DesignElement, FontRole, TextAlign, TextElement } from '../model/types';

/** Everything a template needs to lay out one design. */
export interface TemplateContext {
  width: number;
  height: number;
  brand: DesignBrand;
  content: DesignContent;
  /** Hero image source, if the user supplied one. */
  image: string | null;
}

export type Orientation = 'landscape' | 'square' | 'portrait' | 'tall';

export interface Region {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Derived geometry and colour helpers shared by every template. */
export class Kit {
  readonly W: number;
  readonly H: number;
  /** Shorter canvas side — the unit for type and spacing. */
  readonly S: number;
  /** Standard outer margin. */
  readonly m: number;
  readonly o: Orientation;
  readonly pal: Palette;

  constructor(readonly ctx: TemplateContext) {
    this.W = ctx.width;
    this.H = ctx.height;
    this.S = Math.min(this.W, this.H);
    this.m = Math.round(this.S * 0.075);
    const r = this.W / this.H;
    this.o = r >= 1.3 ? 'landscape' : r > 0.9 ? 'square' : r > 0.62 ? 'portrait' : 'tall';
    this.pal = derivePalette(ctx.brand.colors);
  }

  get landscape() {
    return this.o === 'landscape';
  }

  color(role: ColorRole): string {
    return resolveRole(role, this.ctx.brand.colors);
  }

  /** The deepest brand colour role, for dark luxury backgrounds. */
  deepRole(): ColorRole {
    return luminance(this.pal.primary) < 0.12 ? 'primary' : 'dark';
  }

  font(role: FontRole): string {
    return this.ctx.brand.fonts[role];
  }

  px(ratio: number): number {
    return Math.round(this.S * ratio);
  }
}

// ─── Text helpers ───────────────────────────────────────────────────────────

export interface TextSpec {
  role: FontRole;
  weight: number;
  italic?: boolean;
  /** Font size as a ratio of S; for fitted text this is the maximum. */
  size: number;
  /** Minimum size ratio when fitting. */
  minSize?: number;
  maxLines?: number;
  letterSpacing?: number;
  lineHeight?: number;
  uppercase?: boolean;
  colorRole: ColorRole;
  opacity?: number;
}

export function textEl(k: Kit, spec: TextSpec, text: string, x: number, width: number, align: TextAlign, name: string, slot?: TextElement['slot'], fitHeight?: number): TextElement {
  const style = {
    fontFamily: k.font(spec.role),
    fontWeight: spec.weight,
    fontStyle: spec.italic ? ('italic' as const) : ('normal' as const),
    letterSpacing: spec.letterSpacing ?? 0,
    lineHeight: spec.lineHeight ?? 1.2,
    textTransform: spec.uppercase ? ('uppercase' as const) : ('none' as const),
  };
  const max = k.S * spec.size;
  const fontSize =
    fitHeight !== undefined
      ? fitFontSize(text, style, { width, height: fitHeight }, { max, min: k.S * (spec.minSize ?? spec.size * 0.45), maxLines: spec.maxLines })
      : Math.round(max);
  return makeText({
    name,
    slot,
    text,
    x: Math.round(x),
    y: 0,
    width: Math.round(width),
    height: 0,
    ...style,
    fontRole: spec.role,
    fontSize,
    align,
    color: k.color(spec.colorRole),
    colorRole: spec.colorRole,
    opacity: spec.opacity ?? 1,
  });
}

// ─── CTA ────────────────────────────────────────────────────────────────────

export type CtaKind = 'button' | 'outline' | 'text';

export interface CtaSpec {
  kind: CtaKind;
  /** Button fill / outline / text colour. */
  colorRole: ColorRole;
  /** Label colour for filled buttons. */
  labelRole?: ColorRole;
  size?: number;
}

/** Builds a CTA (label + optional shape) whose top-left is (0,0); position with `place`. */
export function ctaBlock(k: Kit, spec: CtaSpec, text: string): { els: DesignElement[]; w: number; h: number } {
  const fs = k.S * (spec.size ?? 0.024);
  const style = { fontFamily: k.font('body'), fontSize: fs, fontWeight: 700, fontStyle: 'normal' as const, letterSpacing: 0.12, lineHeight: 1.2, textTransform: 'uppercase' as const };
  const tw = Math.ceil(measure(text.toUpperCase(), style)) + 2;
  if (spec.kind === 'text') {
    const label = makeText({ name: 'CTA', slot: 'cta', text, x: 0, y: 0, width: tw, height: 0, ...style, fontRole: 'body', align: 'left', color: k.color(spec.colorRole), colorRole: spec.colorRole });
    const underline = makeLine({ name: 'CTA underline', x: 0, y: label.height + fs * 0.35, width: Math.min(tw, k.px(0.12)), height: Math.max(2, fs * 0.12), stroke: k.color(spec.colorRole), strokeRole: spec.colorRole, strokeWidth: Math.max(2, Math.round(fs * 0.08)) });
    return { els: [label, underline], w: tw, h: label.height + fs * 0.55 };
  }
  const padX = fs * 1.5;
  const padY = fs * 0.95;
  const label = makeText({
    name: 'CTA',
    slot: 'cta',
    text,
    x: padX,
    y: padY,
    width: tw,
    height: 0,
    ...style,
    fontRole: 'body',
    align: 'center',
    color: k.color(spec.kind === 'button' ? (spec.labelRole ?? 'onAccent') : spec.colorRole),
    colorRole: spec.kind === 'button' ? (spec.labelRole ?? 'onAccent') : spec.colorRole,
  });
  const w = Math.round(tw + padX * 2);
  const h = Math.round(label.height + padY * 2);
  const shape = makeRect({
    name: 'CTA button',
    x: 0,
    y: 0,
    width: w,
    height: h,
    radius: 0,
    fill: spec.kind === 'button' ? k.color(spec.colorRole) : 'none',
    fillRole: spec.kind === 'button' ? spec.colorRole : undefined,
    stroke: spec.kind === 'outline' ? k.color(spec.colorRole) : 'none',
    strokeRole: spec.kind === 'outline' ? spec.colorRole : undefined,
    strokeWidth: spec.kind === 'outline' ? Math.max(2, Math.round(fs * 0.09)) : 0,
  });
  return { els: [shape, label], w, h };
}

/** Offset a group of elements. */
export function place(els: DesignElement[], dx: number, dy: number): DesignElement[] {
  return els.map((e) => ({ ...e, x: Math.round(e.x + dx), y: Math.round(e.y + dy) }));
}

function alignX(region: Region, w: number, align: TextAlign): number {
  return align === 'left' ? region.x : align === 'right' ? region.x + region.w - w : region.x + (region.w - w) / 2;
}

// ─── Text column ────────────────────────────────────────────────────────────

export interface ColumnSpec {
  align: TextAlign;
  /** Vertical placement of the stack inside the region. */
  anchor: 'top' | 'center' | 'bottom';
  label?: TextSpec;
  headline: TextSpec;
  divider?: { colorRole: ColorRole; width: number; opacity?: number };
  sub?: TextSpec;
  cta?: CtaSpec;
  /** Pin the CTA to the bottom of the region instead of stacking it. */
  pinCta?: boolean;
  /** Gap ratios (of S) after label, headline, divider and sub. */
  gap?: number;
  /** Width ratio of the sub line relative to the region. */
  subWidth?: number;
}

/**
 * Lays out label → headline → divider → subheadline → CTA inside a region.
 * The headline is fitted to whatever height the other parts leave free, so
 * long and short copy both compose well.
 */
export function column(k: Kit, region: Region, spec: ColumnSpec): DesignElement[] {
  const c = k.ctx.content;
  const gap = k.S * (spec.gap ?? 0.03);
  const parts: { els: DesignElement[]; h: number; w: number }[] = [];

  const label = spec.label && c.label.trim() ? textEl(k, spec.label, c.label, region.x, region.w, spec.align, 'Label', 'label') : null;
  const subW = region.w * (spec.subWidth ?? 1);
  let sub = spec.sub && c.subheadline.trim() ? textEl(k, spec.sub, c.subheadline, alignX(region, subW, spec.align), subW, spec.align, 'Subheadline', 'subheadline') : null;
  const cta = spec.cta && c.cta.trim() ? ctaBlock(k, spec.cta, c.cta) : null;
  const dividerH = spec.divider ? Math.max(2, k.px(0.003)) : 0;

  const fixedOf = () =>
    (label ? label.height + gap * 0.6 : 0) +
    (spec.divider ? dividerH + gap : 0) +
    (sub ? sub.height + gap : 0) +
    (cta ? cta.h + (spec.pinCta ? gap * 1.5 : gap * 0.4) : 0);
  // Very long support copy: let the subheadline step down in size before anything collides.
  const minHeadline = k.S * 0.08;
  if (sub && spec.sub && fixedOf() + gap + minHeadline > region.h) {
    const room = sub.height - (fixedOf() + gap + minHeadline - region.h);
    sub = textEl(k, { ...spec.sub, minSize: 0.014 }, c.subheadline, sub.x, subW, spec.align, 'Subheadline', 'subheadline', Math.max(k.S * 0.03, room));
  }
  const fixed = fixedOf();
  const headlineMax = Math.max(k.S * 0.06, region.h - fixed - gap);
  let headline = textEl(k, spec.headline, c.headline || ' ', region.x, region.w, spec.align, 'Headline', 'headline', headlineMax);
  // The minimum size can still overflow on short regions: shrink further rather than collide.
  const overflow = fixed + gap + headline.height - region.h;
  if (overflow > 0) {
    const tighter = { ...spec.headline, minSize: (spec.headline.minSize ?? spec.headline.size * 0.45) * 0.6 };
    headline = textEl(k, tighter, c.headline || ' ', region.x, region.w, spec.align, 'Headline', 'headline', Math.max(k.S * 0.04, headline.height - overflow));
  }

  if (label) parts.push({ els: [label], h: label.height + gap * 0.6, w: region.w });
  parts.push({ els: [headline], h: headline.height + (spec.divider || sub || (cta && !spec.pinCta) ? gap : 0), w: region.w });
  if (spec.divider) {
    const w = k.S * spec.divider.width;
    parts.push({
      els: [makeLine({ name: 'Divider', x: alignX(region, w, spec.align), y: 0, width: w, height: dividerH, strokeWidth: dividerH, stroke: k.color(spec.divider.colorRole), strokeRole: spec.divider.colorRole, opacity: spec.divider.opacity ?? 1 })],
      h: dividerH + gap,
      w,
    });
  }
  if (sub) parts.push({ els: [sub], h: sub.height + (cta && !spec.pinCta ? gap * 1.2 : 0), w: subW });
  if (cta && !spec.pinCta) parts.push({ els: place(cta.els, alignX(region, cta.w, spec.align), 0), h: cta.h, w: cta.w });

  const stackH = parts.reduce((s, p) => s + p.h, 0);
  const pinnedSpace = cta && spec.pinCta ? cta.h + gap * 1.5 : 0;
  const free = region.h - pinnedSpace - stackH;
  let y = region.y + (spec.anchor === 'top' ? 0 : spec.anchor === 'center' ? Math.max(0, free / 2) : Math.max(0, free));

  const out: DesignElement[] = [];
  for (const p of parts) {
    out.push(...place(p.els, 0, y));
    y += p.h;
  }
  if (cta && spec.pinCta) out.push(...place(cta.els, alignX(region, cta.w, spec.align), region.y + region.h - cta.h));
  return out;
}

// ─── Logo ───────────────────────────────────────────────────────────────────

export function logoEl(k: Kit, x: number, y: number, align: TextAlign, colorRole: ColorRole, scale = 1): DesignElement | null {
  const b = k.ctx.brand;
  if (!b.logo && !b.name.trim()) return null;
  const h = k.px(0.055 * scale);
  const w = k.px(0.3 * scale);
  const bx = align === 'left' ? x : align === 'right' ? x - w : x - w / 2;
  return makeLogo({ name: 'Logo', slot: 'logo', x: Math.round(bx), y: Math.round(y), width: w, height: h, src: b.logo, fallbackText: b.name || 'Logo', align, color: k.color(colorRole), colorRole });
}

