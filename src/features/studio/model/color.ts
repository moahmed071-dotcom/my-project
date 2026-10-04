import type { BrandColors, ColorRole } from './types';

export function normalizeHex(input: string, fallback = '#000000'): string {
  let s = (input ?? '').trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(s)) s = s.split('').map((c) => c + c).join('');
  return /^[0-9a-f]{6}$/i.test(s) ? `#${s.toUpperCase()}` : fallback;
}

export function isHex(input: string): boolean {
  return /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test((input ?? '').trim());
}

function rgb(hex: string): [number, number, number] {
  const h = normalizeHex(hex).slice(1);
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

/** WCAG relative luminance, 0–1. */
export function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Linear mix of two colours; t=0 → a, t=1 → b. */
export function mix(a: string, b: string, t: number): string {
  const [x, y] = [rgb(a), rgb(b)];
  return toHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}

export interface Palette extends BrandColors {
  dark: string;
  light: string;
}

/** Derive a working palette (a dark and a light neutral) from three brand colours. */
export function derivePalette(c: BrandColors): Palette {
  const all = [c.primary, c.secondary, c.accent];
  const darkest = all.reduce((a, b) => (luminance(b) < luminance(a) ? b : a));
  const lightest = all.reduce((a, b) => (luminance(b) > luminance(a) ? b : a));
  const dark = luminance(darkest) < 0.06 ? darkest : mix(darkest, '#0B0B0C', 0.75);
  const light = luminance(lightest) > 0.8 ? lightest : mix(lightest, '#F7F5F0', 0.8);
  return { ...c, dark, light };
}

/** Best readable colour on top of `bg`, preferring brand neutrals. */
export function onColor(bg: string, p: Palette): string {
  return contrast(bg, p.light) >= contrast(bg, p.dark) ? p.light : p.dark;
}

export function resolveRole(role: ColorRole, colors: BrandColors): string {
  const p = derivePalette(colors);
  switch (role) {
    case 'primary':
      return p.primary;
    case 'secondary':
      return p.secondary;
    case 'accent':
      return p.accent;
    case 'dark':
      return p.dark;
    case 'light':
      return p.light;
    case 'onPrimary':
      return onColor(p.primary, p);
    case 'onSecondary':
      return onColor(p.secondary, p);
    case 'onAccent':
      return onColor(p.accent, p);
    case 'onDark':
      return p.light;
    case 'onLight':
      return p.dark;
  }
}
