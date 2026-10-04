import { fontStack } from './fonts';
import type { TextElement } from './types';

/**
 * Deterministic text layout shared by the editor, SVG and PNG output.
 * Lines are measured with the browser's font engine (canvas measureText),
 * so wrapping is identical wherever the design is rendered.
 */

export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fontStyle: 'normal' | 'italic';
  letterSpacing: number; // em
  lineHeight: number;
  textTransform: 'none' | 'uppercase';
}

export interface TextLayout {
  lines: string[];
  /** Total block height in px. */
  height: number;
  /** Distance from the top of a line box to its baseline, px. */
  baseline: number;
  /** Widest line in px. */
  width: number;
}

let ctx: CanvasRenderingContext2D | null = null;
function context(): CanvasRenderingContext2D | null {
  if (ctx) return ctx;
  if (typeof document === 'undefined') return null;
  ctx = document.createElement('canvas').getContext('2d');
  return ctx;
}

function fontString(s: TextStyle, size = s.fontSize): string {
  return `${s.fontStyle === 'italic' ? 'italic ' : ''}${s.fontWeight} ${size}px ${fontStack(s.fontFamily)}`;
}

const MEASURE_SIZE = 100;
const cache = new Map<string, number>();

/** Width of a string at the style's size, including letter spacing. */
export function measure(text: string, s: TextStyle): number {
  if (!text) return 0;
  const key = `${fontString(s, MEASURE_SIZE)}|${text}`;
  let w = cache.get(key);
  if (w === undefined) {
    const c = context();
    if (c) {
      c.font = fontString(s, MEASURE_SIZE);
      w = c.measureText(text).width;
    } else {
      w = text.length * MEASURE_SIZE * 0.55; // non-browser fallback
    }
    if (cache.size > 5000) cache.clear();
    cache.set(key, w);
  }
  const chars = Array.from(text).length;
  return (w * s.fontSize) / MEASURE_SIZE + chars * s.letterSpacing * s.fontSize;
}

function ascentRatio(s: TextStyle): number {
  const c = context();
  if (!c) return 0.8;
  c.font = fontString(s, MEASURE_SIZE);
  const m = c.measureText('Hg');
  const asc = m.fontBoundingBoxAscent ?? m.actualBoundingBoxAscent;
  const desc = m.fontBoundingBoxDescent ?? m.actualBoundingBoxDescent;
  const total = asc + desc || MEASURE_SIZE;
  return asc / total;
}

export function transformText(text: string, t: TextStyle['textTransform']): string {
  return t === 'uppercase' ? text.toUpperCase() : text;
}

/** Break one paragraph into lines that fit `maxWidth`. Words wider than the box are split by character. */
function wrapParagraph(para: string, s: TextStyle, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const token of para.split(/(\s+)/)) {
    if (!token) continue;
    if (/^\s+$/.test(token)) {
      if (line) line += token;
      continue;
    }
    const candidate = line + token;
    if (measure(candidate, s) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line.trim()) lines.push(line.trimEnd());
    line = '';
    if (measure(token, s) <= maxWidth) {
      line = token;
      continue;
    }
    for (const ch of Array.from(token)) {
      if (line && measure(line + ch, s) > maxWidth) {
        lines.push(line);
        line = ch;
      } else line += ch;
    }
  }
  lines.push(line.trimEnd());
  return lines;
}

export function layoutText(text: string, s: TextStyle, maxWidth: number): TextLayout {
  const content = transformText(text, s.textTransform);
  const width = Math.max(1, maxWidth);
  const lines = content.split('\n').flatMap((p) => wrapParagraph(p, s, width));
  const lineBox = s.fontSize * s.lineHeight;
  // Match CSS line-box model: half-leading above, then ascent.
  const contentHeight = s.fontSize;
  const halfLeading = (lineBox - contentHeight) / 2;
  const baseline = halfLeading + contentHeight * ascentRatio(s);
  return {
    lines,
    height: Math.max(lineBox, lines.length * lineBox),
    baseline,
    width: Math.max(0, ...lines.map((l) => measure(l, s))),
  };
}

export function styleOf(el: TextElement): TextStyle {
  return {
    fontFamily: el.fontFamily,
    fontSize: el.fontSize,
    fontWeight: el.fontWeight,
    fontStyle: el.fontStyle,
    letterSpacing: el.letterSpacing,
    lineHeight: el.lineHeight,
    textTransform: el.textTransform,
  };
}

export function layoutElement(el: TextElement): TextLayout {
  return layoutText(el.text, styleOf(el), el.width);
}

/** Text boxes are auto-height: height always equals the laid-out text. */
export function withAutoHeight<T extends TextElement>(el: T): T {
  const h = Math.ceil(layoutElement(el).height);
  return h === el.height ? el : { ...el, height: h };
}

/**
 * Largest font size (between min and max) at which the text fits the box
 * within `maxLines`. Deterministic binary search.
 */
export function fitFontSize(
  text: string,
  s: Omit<TextStyle, 'fontSize'>,
  box: { width: number; height: number },
  opts: { max: number; min: number; maxLines?: number },
): number {
  let lo = opts.min;
  let hi = opts.max;
  const fits = (size: number) => {
    const l = layoutText(text, { ...s, fontSize: size }, box.width);
    const longest = Math.max(...l.lines.map((line) => measure(line, { ...s, fontSize: size })));
    return l.height <= box.height && (!opts.maxLines || l.lines.length <= opts.maxLines) && longest <= box.width + 0.5;
  };
  if (fits(hi)) return Math.round(hi);
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) lo = mid;
    else hi = mid;
  }
  return Math.max(opts.min, Math.floor(lo));
}

export function clearMeasureCache(): void {
  cache.clear();
}
